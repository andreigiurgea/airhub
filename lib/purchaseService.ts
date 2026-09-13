import {
  db,
} from './firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { logger } from './logger';
import type { Purchase, PurchaseItem } from '@/hooks/usePurchaseHistory';

export interface CreatePurchaseInput {
  accountId: string;
  customerId: string;
  dropzoneId: string;
  dropzoneName: string;
  dropzoneCustomerDocId: string;
  items: PurchaseItem[];
  totalAmount: number;
  subtotal: number;
  couponCode: string | null;
  couponDiscount: number;
  amountFromBalance: number;
  amountCharged: number;
  paymentMethod: string;
  currency: string;
}

async function resolveDropzoneCustomerDocId(
  dropzoneId: string,
  customerId: string,
  accountId?: string
): Promise<string | null> {
  const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');

  const byCustomerId = query(customersRef, where('customerId', '==', customerId));
  const snap = await getDocs(byCustomerId);
  if (!snap.empty) return snap.docs[0].id;

  if (accountId) {
    const byAccountId = query(customersRef, where('accountId', '==', accountId));
    const snap2 = await getDocs(byAccountId);
    if (!snap2.empty) return snap2.docs[0].id;
  }

  return null;
}

export function onPurchasesChange(
  customerId: string,
  dropzoneId: string,
  accountId: string,
  callback: (purchases: Purchase[]) => void,
  onError?: (err: Error) => void
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    try {
      const docId = await resolveDropzoneCustomerDocId(dropzoneId, customerId, accountId);
      if (cancelled) return;

      if (!docId) {
        callback([]);
        return;
      }

      const purchasesRef = collection(
        db,
        'dropzones',
        dropzoneId,
        'customers',
        docId,
        'purchases'
      );

      unsubscribe = onSnapshot(
        purchasesRef,
        (snapshot) => {
          if (cancelled) return;
          const result: Purchase[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            result.push({
              id: docSnap.id,
              accountId: d.accountId || accountId,
              customerId: d.customerId || customerId,
              dropzoneId: d.dropzoneId || dropzoneId,
              dropzoneName: d.dropzoneName,
              items: d.items || [],
              totalAmount: d.totalAmount ?? d.total ?? 0,
              subtotal: d.subtotal,
              total: d.total,
              amountFromBalance: d.amountFromBalance || 0,
              amountCharged: d.amountCharged || 0,
              creditUsed: d.creditUsed,
              currency: d.currency || 'AED',
              paymentMethod: d.paymentMethod || '',
              status: d.status || 'completed',
              canceled: d.canceled === true,
              purchasedAt: d.purchasedAt,
              createdAt: d.createdAt,
              refNumber: d.refNumber,
              mobilePurchase: d.mobilePurchase,
              couponCode: d.couponCode,
              couponDiscount: d.couponDiscount,
            });
          });
          result.sort((a, b) => {
            const aTime = a.purchasedAt?.toMillis?.() ?? (a.purchasedAt?.seconds ?? 0) * 1000;
            const bTime = b.purchasedAt?.toMillis?.() ?? (b.purchasedAt?.seconds ?? 0) * 1000;
            return bTime - aTime;
          });
          callback(result);
        },
        (err) => {
          logger.error('purchaseService.onPurchasesChange snapshot error', err);
          onError?.(err);
        }
      );
    } catch (err: any) {
      logger.error('purchaseService.onPurchasesChange setup error', err);
      onError?.(err);
    }
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function create(input: CreatePurchaseInput): Promise<string> {
  const {
    accountId,
    customerId,
    dropzoneId,
    dropzoneName,
    dropzoneCustomerDocId,
    items,
    totalAmount,
    subtotal,
    couponCode,
    couponDiscount,
    amountFromBalance,
    amountCharged,
    paymentMethod,
    currency,
  } = input;

  const purchasesRef = collection(
    db,
    'dropzones',
    dropzoneId,
    'customers',
    dropzoneCustomerDocId,
    'purchases'
  );

  const purchaseDocRef = await addDoc(purchasesRef, {
    customerId,
    accountId,
    dropzoneId,
    dropzoneName,
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      productId: item.productId ?? null,
      category: item.category ?? null,
      used: false,
      canceled: false,
    })),
    totalAmount,
    subtotal,
    total: totalAmount,
    couponCode: couponCode || null,
    couponDiscount: couponDiscount || 0,
    amountFromBalance,
    amountCharged,
    creditUsed: amountFromBalance,
    paymentMethod,
    currency,
    purchasedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    date: serverTimestamp(),
    status: 'completed',
    canceled: false,
    validated: true,
    mobilePurchase: true,
    userId: accountId,
  });

  const refNumber = purchaseDocRef.id.substring(0, 10).toUpperCase();
  await updateDoc(purchaseDocRef, { refNumber });

  if (couponCode) {
    try {
      const couponsRef = collection(db, 'dropzones', dropzoneId, 'coupons');
      const q = query(couponsRef, where('code', '==', couponCode));
      const couponSnap = await getDocs(q);
      if (!couponSnap.empty) {
        await updateDoc(couponSnap.docs[0].ref, {
          redeemed: true,
          redeemedAt: serverTimestamp(),
          redeemedByCustomerId: customerId,
          purchaseRef: purchaseDocRef.id,
          status: 'redeemed',
        });
      }
    } catch (err) {
      logger.error('purchaseService.create: failed to mark coupon redeemed', err);
    }
  }

  try {
    const customerDocRef = doc(
      db,
      'dropzones',
      dropzoneId,
      'customers',
      dropzoneCustomerDocId
    );
    await updateDoc(customerDocRef, {
      totalSpent: increment(totalAmount),
      purchaseCount: increment(1),
      lastPurchaseAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    logger.error('purchaseService.create: failed to update customer stats', err);
  }

  return purchaseDocRef.id;
}

export async function removePurchaseItem(
  dropzoneId: string,
  dropzoneCustomerDocId: string,
  purchaseId: string,
  itemIndex: number,
  purchase: Purchase
): Promise<void> {
  const purchaseDocRef = doc(
    db,
    'dropzones',
    dropzoneId,
    'customers',
    dropzoneCustomerDocId,
    'purchases',
    purchaseId
  );

  const items = purchase.items.map((item, i) =>
    i === itemIndex ? { ...item, canceled: true } : item
  );

  const canceledItem = purchase.items[itemIndex];
  const itemValue = canceledItem.price * canceledItem.quantity;
  const totalAmount = purchase.totalAmount;

  const refundRatio = totalAmount > 0 ? itemValue / totalAmount : 0;
  const balanceRefund = Math.round(purchase.amountFromBalance * refundRatio * 100) / 100;

  await updateDoc(purchaseDocRef, { items });

  if (balanceRefund > 0) {
    try {
      const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
      const snap = await getDocs(
        query(customersRef, where('customerId', '==', purchase.customerId))
      );
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, {
          balance: increment(balanceRefund),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      logger.error('purchaseService.removePurchaseItem: failed to refund balance', err);
    }
  }
}

/**
 * Mark one use of a purchased ticket item (increment usedCount by 1).
 * dropzoneCustomerDocId is the document ID in dropzones/{dz}/customers/.
 */
export async function useTicket(
  dropzoneId: string,
  customerId: string,
  accountId: string,
  purchaseId: string,
  itemIndex: number
): Promise<void> {
  const docId = await resolveDropzoneCustomerDocId(dropzoneId, customerId, accountId);
  if (!docId) {
    logger.error('useTicket: could not resolve customer doc');
    return;
  }
  const purchaseRef = doc(db, 'dropzones', dropzoneId, 'customers', docId, 'purchases', purchaseId);
  const snap = await getDoc(purchaseRef);
  if (!snap.exists()) {
    logger.error('useTicket: purchase not found', purchaseId);
    return;
  }
  const items: any[] = (snap.data().items || []).map((item: any, i: number) => {
    if (i !== itemIndex) return item;
    return { ...item, usedCount: (item.usedCount ?? 0) + 1 };
  });
  await updateDoc(purchaseRef, { items });
}

/**
 * Restore one use of a ticket item (decrement usedCount by 1, min 0).
 */
export async function restoreTicket(
  dropzoneId: string,
  customerId: string,
  accountId: string,
  purchaseId: string,
  itemIndex: number
): Promise<void> {
  const docId = await resolveDropzoneCustomerDocId(dropzoneId, customerId, accountId);
  if (!docId) {
    logger.error('restoreTicket: could not resolve customer doc');
    return;
  }
  const purchaseRef = doc(db, 'dropzones', dropzoneId, 'customers', docId, 'purchases', purchaseId);
  const snap = await getDoc(purchaseRef);
  if (!snap.exists()) {
    logger.error('restoreTicket: purchase not found', purchaseId);
    return;
  }
  const items: any[] = (snap.data().items || []).map((item: any, i: number) => {
    if (i !== itemIndex) return item;
    const current = item.usedCount ?? 0;
    return { ...item, usedCount: Math.max(0, current - 1) };
  });
  await updateDoc(purchaseRef, { items });
}
