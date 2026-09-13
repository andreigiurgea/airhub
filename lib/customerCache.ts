import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logger } from './logger';

interface CustomerCache {
  docId: string;
  customerId: string;
  data: any;
  timestamp: number;
}

const cache = new Map<string, CustomerCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCustomerData(accountId: string) {
  const cached = cache.get(accountId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.log(`🚀 Using cached customer data for ${accountId}`);
    return {
      docId: cached.docId,
      customerId: cached.customerId,
      data: cached.data
    };
  }

  const customersRef = collection(db, 'customers');
  const q = query(customersRef, where('accountId', '==', accountId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const docId = snapshot.docs[0].id;
  const data = snapshot.docs[0].data();
  const customerId = data.customerId;

  cache.set(accountId, {
    docId,
    customerId,
    data,
    timestamp: Date.now()
  });

  return { docId, customerId, data };
}

export function clearCustomerCache(accountId?: string) {
  if (accountId) {
    cache.delete(accountId);
  } else {
    cache.clear();
  }
}
