import { db } from './firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { logger } from './logger';

export interface CreditBalance {
  balance: number;
  currency: string;
  dropzoneCustomerDocId: string | null;
}

export function onCreditChange(
  dropzoneId: string,
  customerId: string,
  accountId: string,
  callback: (credit: CreditBalance) => void,
  onError?: (err: Error) => void
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    try {
      const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');

      let q = query(customersRef, where('customerId', '==', customerId));
      let snap = await getDocs(q);

      if (snap.empty && accountId) {
        q = query(customersRef, where('accountId', '==', accountId));
        snap = await getDocs(q);
      }

      if (cancelled) return;

      if (snap.empty) {
        callback({ balance: 0, currency: 'AED', dropzoneCustomerDocId: null });
        return;
      }

      const customerDoc = snap.docs[0];
      const docId = customerDoc.id;

      unsubscribe = onSnapshot(
        customerDoc.ref,
        (docSnap) => {
          if (cancelled) return;
          if (!docSnap.exists()) {
            callback({ balance: 0, currency: 'AED', dropzoneCustomerDocId: docId });
            return;
          }
          const data = docSnap.data();
          callback({
            balance: data.balance ?? 0,
            currency: data.currency ?? 'AED',
            dropzoneCustomerDocId: docId,
          });
        },
        (err) => {
          logger.error('creditService.onCreditChange snapshot error', err);
          onError?.(err);
        }
      );
    } catch (err: any) {
      logger.error('creditService.onCreditChange setup error', err);
      onError?.(err);
    }
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
