import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';

export type EquipmentStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Under Maintenance';

export interface ContainerSection {
  model: string;
  series: string;
  photoUrl?: string;
}

export interface CanopySection {
  model: string;
  series: string;
  size: string;
  certificateNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  photoUrl?: string;
}

export interface ReserveCanopySection {
  model: string;
  series: string;
  size: string;
  certificateNumber: string;
  packingDate: string;
  packingExpiryDate: string;
  photoUrl?: string;
}

export interface AADSection {
  model: string;
  series: string;
  expiryDate: string;
}

export interface Equipment {
  id?: string;
  customerId: string;
  container: ContainerSection;
  mainCanopy: CanopySection;
  reserveCanopy: ReserveCanopySection;
  aad: AADSection;
  status: EquipmentStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function computeStatus(equipment: Omit<Equipment, 'id' | 'status' | 'createdAt' | 'updatedAt'>): EquipmentStatus {
  const today = new Date();
  const soonThreshold = 30 * 24 * 60 * 60 * 1000;

  const dates = [
    equipment.reserveCanopy.packingExpiryDate,
    equipment.aad.expiryDate,
  ].filter(Boolean).map(d => new Date(d));

  if (dates.length === 0) return 'Active';

  const anyExpired = dates.some(d => d < today);
  if (anyExpired) return 'Expired';

  const anySoon = dates.some(d => d.getTime() - today.getTime() < soonThreshold);
  if (anySoon) return 'Expiring Soon';

  return 'Active';
}

export async function addEquipment(
  customerId: string,
  data: Omit<Equipment, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const status = computeStatus(data);
  const ref = collection(db, 'customers', customerId, 'equipment');
  const docRef = await addDoc(ref, {
    ...data,
    customerId,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  logger.log('Equipment added:', docRef.id);
  return docRef.id;
}

export async function updateEquipment(
  customerId: string,
  equipmentId: string,
  data: Omit<Equipment, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const status = computeStatus(data);
  const ref = doc(db, 'customers', customerId, 'equipment', equipmentId);
  await updateDoc(ref, {
    ...data,
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEquipment(customerId: string, equipmentId: string): Promise<void> {
  const ref = doc(db, 'customers', customerId, 'equipment', equipmentId);
  await deleteDoc(ref);
}

export function subscribeToEquipment(
  customerId: string,
  callback: (equipment: Equipment[]) => void
): () => void {
  const ref = collection(db, 'customers', customerId, 'equipment');
  const q = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items: Equipment[] = snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Equipment, 'id'>),
    }));
    callback(items);
  });
}
