import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { logger } from './logger';
import { CACHE_SETTINGS } from './constants';

// Simple in-memory cache for dropzone data
const dropzoneCache = new Map<string, { data: Dropzone; timestamp: number }>();
const customerDocCache = new Map<string, { docId: string; customerId: string; timestamp: number }>();

async function getCustomerDoc(accountId: string) {
  const cached = customerDocCache.get(accountId);
  if (cached && Date.now() - cached.timestamp < CACHE_SETTINGS.DROPZONE_TTL) {
    logger.log(`🚀 Using cached customer doc for ${accountId}`);
    return { docId: cached.docId, customerId: cached.customerId };
  }

  const customersRef = collection(db, 'customers');
  const q = query(customersRef, where('accountId', '==', accountId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const docId = snapshot.docs[0].id;
  const customerId = snapshot.docs[0].data().customerId;

  customerDocCache.set(accountId, { docId, customerId, timestamp: Date.now() });

  return { docId, customerId };
}

export interface Dropzone {
  id: string;
  name: string;
  location?: string;
  city?: string;
  country?: string;
  currency?: string;
  settings?: {
    currency?: string;
    timezone?: string;
    dropzoneName?: string;
    location?: string;
    openingTime?: string;
    closingTime?: string;
    windSpeedLimit?: number | null;
    visibilityMinimum?: number | null;
    cloudBaseMinimum?: number | null;
  };
}

export interface CheckInStatus {
  dropzoneId: string;
  dropzoneName: string;
  checkedInAt: any;
}

export interface CheckedInUserProfile {
  customerId: string;
  accountId: string;
  email: string;
  firstName: string;
  lastName: string;
  checkedInAt: any;
}

export async function getAllDropzones(): Promise<Dropzone[]> {
  try {
    const dropzonesRef = collection(db, 'dropzones');
    const snapshot = await getDocs(dropzonesRef);

    const dropzones: Dropzone[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      dropzones.push({
        id: doc.id,
        name: data.name || 'Unnamed Dropzone',
        location: data.location,
        city: data.city,
        country: data.country,
        currency: data.settings?.currency || data.currency || 'AED',
        settings: data.settings,
      });
    });

    return dropzones;
  } catch (error) {
    logger.error('Error fetching dropzones:', error);
    return [];
  }
}

export async function getDropzoneById(dropzoneId: string): Promise<Dropzone | null> {
  try {
    // Check cache first
    const cached = dropzoneCache.get(dropzoneId);
    if (cached && Date.now() - cached.timestamp < CACHE_SETTINGS.DROPZONE_TTL) {
      logger.log(`🚀 Using cached dropzone data for ${dropzoneId}`);
      return cached.data;
    }

    const dropzoneRef = doc(db, 'dropzones', dropzoneId);
    const snapshot = await getDoc(dropzoneRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    const dropzone: Dropzone = {
      id: snapshot.id,
      name: data.name || 'Unnamed Dropzone',
      location: data.location,
      city: data.city,
      country: data.country,
      currency: data.settings?.currency || data.currency || 'AED',
      settings: data.settings,
    };

    // Store in cache
    dropzoneCache.set(dropzoneId, { data: dropzone, timestamp: Date.now() });

    return dropzone;
  } catch (error) {
    logger.error('Error fetching dropzone:', error);
    return null;
  }
}

export async function checkInToDropzone(
  accountId: string,
  dropzoneId: string,
  allowSwitch: boolean = false
): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean; currentDropzone?: string }> {
  try {
    // Parallel fetch: customer and dropzone data
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('accountId', '==', accountId));

    const [snapshot, dropzone] = await Promise.all([
      getDocs(q),
      getDropzoneById(dropzoneId)
    ]);

    if (snapshot.empty) {
      return { success: false, error: 'Customer not found' };
    }

    if (!dropzone) {
      return { success: false, error: 'Dropzone not found' };
    }

    const customerDoc = snapshot.docs[0];
    const customerData = customerDoc.data();

    // Check if already checked in
    if (customerData.currentDropzone?.dropzoneId) {
      if (!allowSwitch) {
        return {
          success: false,
          needsConfirmation: true,
          currentDropzone: customerData.currentDropzone.dropzoneName,
        };
      } else {
        // Update previous dropzone customer checkedIn status (don't await - fire and forget)
        const previousDropzoneId = customerData.currentDropzone.dropzoneId;
        const previousCustomersRef = collection(db, 'dropzones', previousDropzoneId, 'customers');
        const previousCustomerQuery = query(previousCustomersRef, where('customerId', '==', customerData.customerId));
        getDocs(previousCustomerQuery).then(previousCustomerSnapshot => {
          if (!previousCustomerSnapshot.empty) {
            const previousCustomerDocRef = doc(db, 'dropzones', previousDropzoneId, 'customers', previousCustomerSnapshot.docs[0].id);
            updateDoc(previousCustomerDocRef, { checkedIn: false });
            logger.log(`✅ Updated previous dropzone customer checkedIn field to false`);
          }
        });
      }
    }

    // Parallel: update customer check-in and fetch/update dropzone customer record
    const dropzoneCustomersRef = collection(db, 'dropzones', dropzone.id, 'customers');
    const dropzoneCustomerQuery = query(dropzoneCustomersRef, where('customerId', '==', customerData.customerId));

    const [, dropzoneCustomerSnapshot] = await Promise.all([
      updateDoc(doc(db, 'customers', customerDoc.id), {
        currentDropzone: {
          dropzoneId: dropzone.id,
          dropzoneName: dropzone.name,
          checkedInAt: serverTimestamp(),
        },
        lastDropzoneId: dropzone.id,
      }),
      getDocs(dropzoneCustomerQuery)
    ]);

    if (dropzoneCustomerSnapshot.empty) {
      // Create new dropzone customer record
      const newDropzoneCustomerRef = doc(dropzoneCustomersRef);
      await setDoc(newDropzoneCustomerRef, {
        accountId: customerData.accountId,
        customerId: customerData.customerId,
        firstName: customerData.firstName || '',
        lastName: customerData.lastName || '',
        nickname: customerData.nickname || '',
        useNickname: customerData.useNickname || false,
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        dateOfBirth: customerData.dateOfBirth || '',
        height: customerData.height || 0,
        weight: customerData.weight || 0,
        license: customerData.license || '',
        licenseExpiry: customerData.licenseExpiry || '',
        status: customerData.status || 'Active',
        balance: 0,
        currency: dropzone.currency || 'AED',
        lastJump: customerData.lastJump || '',
        checkedIn: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastCheckIn: serverTimestamp(),
      });

      logger.log(`✅ Created new dropzone customer record for ${customerData.firstName}`);
    } else {
      // Update existing dropzone customer's information and check-in status
      const dropzoneCustomerDocRef = doc(db, 'dropzones', dropzone.id, 'customers', dropzoneCustomerSnapshot.docs[0].id);
      await updateDoc(dropzoneCustomerDocRef, {
        firstName: customerData.firstName || '',
        lastName: customerData.lastName || '',
        nickname: customerData.nickname || '',
        useNickname: customerData.useNickname || false,
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        dateOfBirth: customerData.dateOfBirth || '',
        height: customerData.height || 0,
        weight: customerData.weight || 0,
        license: customerData.license || '',
        licenseExpiry: customerData.licenseExpiry || '',
        status: customerData.status || 'Active',
        lastJump: customerData.lastJump || '',
        checkedIn: true,
        updatedAt: serverTimestamp(),
        lastCheckIn: serverTimestamp(),
      });
      logger.log(`✅ Updated existing dropzone customer's information and check-in status`);
    }

    logger.log(`✅ User ${customerData.firstName} ${customerData.lastName} checked into ${dropzone.name}`);

    return { success: true };
  } catch (error) {
    logger.error('Error checking in:', error);
    return { success: false, error: 'Failed to check in' };
  }
}

export async function checkOutFromDropzone(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get customer document
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('accountId', '==', accountId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, error: 'Customer not found' };
    }

    const customerDoc = snapshot.docs[0];
    const customerData = customerDoc.data();

    // Perform both updates in parallel for faster checkout
    const updates: Promise<any>[] = [
      // Remove check-in info from customer
      updateDoc(doc(db, 'customers', customerDoc.id), {
        currentDropzone: null,
      })
    ];

    // Update checkedIn field in dropzone customer document
    if (customerData.currentDropzone?.dropzoneId) {
      const dropzoneCustomersRef = collection(db, 'dropzones', customerData.currentDropzone.dropzoneId, 'customers');
      const dropzoneCustomerQuery = query(dropzoneCustomersRef, where('customerId', '==', customerData.customerId));

      updates.push(
        getDocs(dropzoneCustomerQuery).then((dropzoneCustomerSnapshot) => {
          if (!dropzoneCustomerSnapshot.empty) {
            const dropzoneCustomerDocRef = doc(db, 'dropzones', customerData.currentDropzone.dropzoneId, 'customers', dropzoneCustomerSnapshot.docs[0].id);
            return updateDoc(dropzoneCustomerDocRef, {
              checkedIn: false,
            });
          }
        })
      );
    }

    await Promise.all(updates);

    return { success: true };
  } catch (error) {
    logger.error('Error checking out:', error);
    return { success: false, error: 'Failed to check out' };
  }
}

export async function getCurrentCheckIn(
  accountId: string
): Promise<CheckInStatus | null> {
  try {
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('accountId', '==', accountId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const customerData = snapshot.docs[0].data();
    return customerData.currentDropzone || null;
  } catch (error) {
    logger.error('Error getting check-in status:', error);
    return null;
  }
}

export async function getCheckedInUsers(
  dropzoneId: string
): Promise<CheckedInUserProfile[]> {
  try {
    const dropzoneCustomersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const q = query(dropzoneCustomersRef, where('checkedIn', '==', true));
    const snapshot = await getDocs(q);

    const users: CheckedInUserProfile[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        customerId: data.customerId,
        accountId: data.accountId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        checkedInAt: data.lastCheckIn,
      });
    });

    return users;
  } catch (error) {
    logger.error('Error getting checked-in users:', error);
    return [];
  }
}
