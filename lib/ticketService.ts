import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  updateDoc,
  query,
  where,
  orderBy,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import { logger } from './logger';

export interface TicketDeduction {
  purchaseId: string;
  itemIndex: number;
}

const TICKET_CATEGORIES = ['Tickets', 'jumping_tickets'];

async function resolveCustomerDocId(dropzoneId: string, customerId: string): Promise<string | null> {
  const snap = await getDocsFromServer(
    query(
      collection(db, 'dropzones', dropzoneId, 'customers'),
      where('customerId', '==', customerId)
    )
  );
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * Deduct one ticket from the customer's purchases.
 * Scans purchases oldest-first, reads each fresh from server to bypass IndexedDB cache.
 * Optionally filters by product name and/or product ID.
 * Returns the exact { purchaseId, itemIndex } of the deducted item.
 */
export async function deductTicketFromPurchase(
  customerId: string,
  dropzoneId: string,
  ticketProductId?: string,
  ticketProductName?: string
): Promise<TicketDeduction | null> {
  const docId = await resolveCustomerDocId(dropzoneId, customerId);
  if (!docId) {
    logger.error('deductTicketFromPurchase: could not resolve customer doc for', customerId);
    return null;
  }

  const purchasesRef = collection(db, 'dropzones', dropzoneId, 'customers', docId, 'purchases');
  const purchasesSnap = await getDocsFromServer(query(purchasesRef, orderBy('purchasedAt', 'asc')));

  for (const purchaseDoc of purchasesSnap.docs) {
    const freshSnap = purchaseDoc;
    if (!freshSnap.exists()) continue;

    const data = freshSnap.data();
    if (data.canceled === true) continue;

    const items: any[] = data.items || [];
    const targetIndex = items.findIndex((item, i) => {
      if (item.canceled) return false;
      if (!TICKET_CATEGORIES.includes(item.category)) return false;
      const usedCount = item.usedCount ?? 0;
      const remaining = (item.quantity ?? 1) - usedCount;
      if (remaining < 1) return false;
      if (ticketProductName && item.name?.toLowerCase() !== ticketProductName.toLowerCase()) return false;
      if (ticketProductId && item.productId !== ticketProductId) return false;
      return true;
    });

    if (targetIndex === -1) continue;

    const updatedItems = items.map((item: any, i: number) => {
      if (i !== targetIndex) return item;
      const newUsedCount = (item.usedCount ?? 0) + 1;
      const newRemaining = (item.quantity ?? 1) - newUsedCount;
      if (newRemaining <= 0) {
        return { ...item, usedCount: newUsedCount, canceled: true, canceledAt: new Date().toISOString() };
      }
      return { ...item, usedCount: newUsedCount };
    });

    await updateDoc(purchaseDoc.ref, { items: updatedItems });

    // Update ticketBalance on the customer doc (fresh read)
    try {
      const customerRef = doc(db, 'dropzones', dropzoneId, 'customers', docId);
      const customerSnap = await getDocFromServer(customerRef);
      if (customerSnap.exists()) {
        const cd = customerSnap.data();
        const tb = cd.ticketBalance || { available: 0, used: 0 };
        await updateDoc(customerRef, {
          ticketBalance: {
            available: Math.max(0, (tb.available ?? 0) - 1),
            used: (tb.used ?? 0) + 1,
          },
        });
      }
    } catch (err) {
      logger.error('deductTicketFromPurchase: failed to update ticketBalance', err);
    }

    return { purchaseId: purchaseDoc.id, itemIndex: targetIndex };
  }

  logger.error('deductTicketFromPurchase: no eligible ticket found for', customerId);
  return null;
}

/**
 * Refund one ticket back to the exact purchase item identified by { purchaseId, itemIndex }.
 * Uses server reads to bypass cache.
 */
export async function refundTicketToPurchase(
  customerId: string,
  dropzoneId: string,
  purchaseId: string,
  itemIndex: number
): Promise<void> {
  const docId = await resolveCustomerDocId(dropzoneId, customerId);
  if (!docId) {
    logger.error('refundTicketToPurchase: could not resolve customer doc for', customerId);
    return;
  }

  const purchaseRef = doc(db, 'dropzones', dropzoneId, 'customers', docId, 'purchases', purchaseId);
  const freshSnap = await getDocFromServer(purchaseRef);
  if (!freshSnap.exists()) {
    logger.error('refundTicketToPurchase: purchase not found', purchaseId);
    return;
  }

  const items: any[] = (freshSnap.data().items || []).map((item: any, i: number) => {
    if (i !== itemIndex) return item;
    const newUsedCount = Math.max(0, (item.usedCount ?? 0) - 1);
    const { canceledAt, ...rest } = item;
    return { ...rest, usedCount: newUsedCount, canceled: false };
  });

  await updateDoc(purchaseRef, { items });

  // Update ticketBalance on the customer doc (fresh read)
  try {
    const customerRef = doc(db, 'dropzones', dropzoneId, 'customers', docId);
    const customerSnap = await getDocFromServer(customerRef);
    if (customerSnap.exists()) {
      const cd = customerSnap.data();
      const tb = cd.ticketBalance || { available: 0, used: 0 };
      await updateDoc(customerRef, {
        ticketBalance: {
          available: (tb.available ?? 0) + 1,
          used: Math.max(0, (tb.used ?? 0) - 1),
        },
      });
    }
  } catch (err) {
    logger.error('refundTicketToPurchase: failed to update ticketBalance', err);
  }
}

/**
 * Fallback refund for legacy jumpers that have no ticketDeduction stored.
 * Scans purchases newest-first:
 *   1. First prefers a canceled:true, usedCount>=1 ticket item to restore.
 *   2. Falls back to the newest non-canceled ticket item and decrements its usedCount.
 */
export async function refundMostRecentTicketFromPurchase(
  customerId: string,
  dropzoneId: string,
  ticketProductId?: string,
  ticketProductName?: string
): Promise<void> {
  const docId = await resolveCustomerDocId(dropzoneId, customerId);
  if (!docId) {
    logger.error('refundMostRecentTicketFromPurchase: could not resolve customer doc for', customerId);
    return;
  }

  const purchasesRef = collection(db, 'dropzones', dropzoneId, 'customers', docId, 'purchases');
  const purchasesSnap = await getDocsFromServer(query(purchasesRef, orderBy('purchasedAt', 'desc')));

  for (const purchaseDoc of purchasesSnap.docs) {
    const freshSnap = purchaseDoc;
    if (!freshSnap.exists()) continue;

    const data = freshSnap.data();
    if (data.canceled === true) continue;

    const items: any[] = data.items || [];

    // Pass 1: find a canceled ticket item that was fully used (quantity - usedCount == 0)
    const canceledIdx = items.findIndex((item) => {
      if (!TICKET_CATEGORIES.includes(item.category)) return false;
      if (!item.canceled) return false;
      if ((item.usedCount ?? 0) < 1) return false;
      if (ticketProductName && item.name?.toLowerCase() !== ticketProductName.toLowerCase()) return false;
      if (ticketProductId && item.productId !== ticketProductId) return false;
      return true;
    });

    if (canceledIdx !== -1) {
      await refundTicketToPurchase(customerId, dropzoneId, purchaseDoc.id, canceledIdx);
      return;
    }

    // Pass 2: find newest non-canceled ticket with usedCount >= 1
    const activeIdx = items.findIndex((item) => {
      if (!TICKET_CATEGORIES.includes(item.category)) return false;
      if (item.canceled) return false;
      if ((item.usedCount ?? 0) < 1) return false;
      if (ticketProductName && item.name?.toLowerCase() !== ticketProductName.toLowerCase()) return false;
      if (ticketProductId && item.productId !== ticketProductId) return false;
      return true;
    });

    if (activeIdx !== -1) {
      await refundTicketToPurchase(customerId, dropzoneId, purchaseDoc.id, activeIdx);
      return;
    }
  }

  logger.error('refundMostRecentTicketFromPurchase: no eligible ticket found for', customerId);
}
