import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { logger } from './logger';
import { LOGBOOK_SETTINGS } from './constants';

let monitoringInterval: NodeJS.Timeout | null = null;

export const startLogbookMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }

  monitoringInterval = setInterval(() => {
    checkForDepartedLoads();
  }, LOGBOOK_SETTINGS.POLL_INTERVAL);

  checkForDepartedLoads();
};

export const stopLogbookMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
};

const checkForDepartedLoads = async () => {
  try {
    const now = Date.now();

    const loadsRef = collection(db, 'loads');
    const q = query(loadsRef, where('status', '==', 'departed'));

    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      const loadData = doc.data();

      if (!loadData.departedAt) continue;

      const departedTime = loadData.departedAt.toMillis();
      const timeSinceDeparture = now - departedTime;

      if (timeSinceDeparture >= LOGBOOK_SETTINGS.DEPARTED_THRESHOLD && timeSinceDeparture <= (20 * 60 * 1000)) {
        await createLogbookEntriesForLoad(doc.id, loadData);
      }
    }
  } catch (error) {
    logger.error('Error checking departed loads:', error);
  }
};

const createLogbookEntriesForLoad = async (loadId: string, loadData: any) => {
  try {
    if (!loadData.jumpers || loadData.jumpers.length === 0) return;

    const departureDate = loadData.departedAt.toDate();
    const formattedDate = departureDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = loadData.time || departureDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const logbookRef = collection(db, 'logbook');

    for (const jumper of loadData.jumpers) {
      const existingEntryQuery = query(
        logbookRef,
        where('customerId', '==', jumper.id),
        where('loadId', '==', loadId)
      );

      const existingSnapshot = await getDocs(existingEntryQuery);

      if (!existingSnapshot.empty) {
        continue;
      }

      await addDoc(logbookRef, {
        customerId: jumper.id,
        loadId: loadId,
        dropzoneName: 'Skydive Dubai',
        loadName: loadData.aircraft || 'Unknown',
        loadNumber: loadData.loadNumber || 0,
        departureDate: formattedDate,
        departureTime: formattedTime,
        jumpNumber: null,
        freefallDelay: '',
        equipment: '',
        aircraft: loadData.aircraft || '',
        exitAltitude: '',
        totalTime: null,
        description: '',
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logger.log(`Created logbook entry for customer ${jumper.id} on load ${loadId}`);
    }
  } catch (error) {
    logger.error('Error creating logbook entries:', error);
  }
};
