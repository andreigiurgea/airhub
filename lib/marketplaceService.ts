import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';

// Easy to update path later
const MARKETPLACE_PATH = 'marketplace';

export type MarketplaceCategory =
  | 'Rigs'
  | 'Containers'
  | 'Canopy'
  | 'Helmets'
  | 'Altimeters'
  | 'Accessories'
  | 'Suits';

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  'Rigs',
  'Containers',
  'Canopy',
  'Helmets',
  'Altimeters',
  'Accessories',
  'Suits',
];

export interface MarketplaceListing {
  id?: string;
  customerId: string;
  dropzoneId: string;
  images: string[];
  title: string;
  category: MarketplaceCategory;
  description: string;
  email: string;
  phone: string;
  showPhone: boolean;
  status: 'published' | 'draft';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function publishListing(
  data: Omit<MarketplaceListing, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = collection(db, MARKETPLACE_PATH);
  const docRef = await addDoc(ref, {
    ...data,
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  logger.log('Marketplace listing published:', docRef.id);
  return docRef.id;
}

export async function updateListing(
  listingId: string,
  data: Partial<Omit<MarketplaceListing, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, MARKETPLACE_PATH, listingId);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getListingById(id: string): Promise<MarketplaceListing | null> {
  const ref = doc(db, MARKETPLACE_PATH, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<MarketplaceListing, 'id'>) };
}

export function subscribeToListings(
  callback: (listings: MarketplaceListing[]) => void,
  category?: MarketplaceCategory
): () => void {
  const ref = collection(db, MARKETPLACE_PATH);
  const q = query(ref, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      let items: MarketplaceListing[] = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<MarketplaceListing, 'id'>) }))
        .filter((l) => l.status === 'published');
      if (category) {
        items = items.filter((l) => l.category === category);
      }
      callback(items);
    },
    (error) => {
      logger.error('Marketplace subscription error:', error);
      callback([]);
    }
  );
}
