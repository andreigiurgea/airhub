import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface Jump {
  id: string;
  customerId: string;
  loadId: string;
  dropzoneName: string;
  loadName: string;
  loadNumber: number;
  departureDate: string;
  departureTime: string;
  jumpNumber: number | null;
  freefallDelay: string;
  equipment: string;
  aircraft: string;
  exitAltitude: string;
  totalTime: number | null;
  description: string;
  status: 'draft' | 'pending_signature' | 'signed';
  createdAt: any;
  updatedAt: any;
}

export const fetchCustomerJumps = async (customerId: string): Promise<Jump[]> => {
  try {
    const logbookRef = collection(db, 'logbook');
    const q = query(logbookRef, where('customerId', '==', customerId));

    const snapshot = await getDocs(q);
    const jumps: Jump[] = [];

    snapshot.forEach((doc) => {
      jumps.push({
        id: doc.id,
        ...doc.data()
      } as Jump);
    });

    jumps.sort((a, b) => {
      const dateA = a.createdAt?.toMillis() || 0;
      const dateB = b.createdAt?.toMillis() || 0;
      return dateB - dateA;
    });

    return jumps;
  } catch (error) {
    console.error('Error fetching customer jumps:', error);
    throw error;
  }
};

export const fetchJumpById = async (jumpId: string): Promise<Jump | null> => {
  try {
    const jumpRef = doc(db, 'logbook', jumpId);
    const jumpDoc = await getDoc(jumpRef);

    if (!jumpDoc.exists()) {
      return null;
    }

    return {
      id: jumpDoc.id,
      ...jumpDoc.data()
    } as Jump;
  } catch (error) {
    console.error('Error fetching jump:', error);
    throw error;
  }
};

export const updateJump = async (jumpId: string, data: Partial<Jump>): Promise<void> => {
  try {
    const jumpRef = doc(db, 'logbook', jumpId);
    await updateDoc(jumpRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating jump:', error);
    throw error;
  }
};

export const sendForSignature = async (jumpId: string): Promise<void> => {
  try {
    const jumpRef = doc(db, 'logbook', jumpId);
    await updateDoc(jumpRef, {
      status: 'pending_signature',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sending for signature:', error);
    throw error;
  }
};
