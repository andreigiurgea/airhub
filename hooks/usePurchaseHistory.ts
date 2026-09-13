import { useState, useEffect, useRef, useCallback } from 'react';
import { onPurchasesChange } from '@/lib/purchaseService';
import { onCreditChange, type CreditBalance } from '@/lib/creditService';
import { logger } from '@/lib/logger';

export interface PurchaseItem {
  name: string;
  quantity: number;
  price: number;
  productId?: string;
  category?: string;
  used?: boolean;
  canceled?: boolean;
}

export interface Purchase {
  id: string;
  accountId: string;
  customerId: string;
  dropzoneId: string;
  dropzoneName?: string;
  items: PurchaseItem[];
  totalAmount: number;
  subtotal?: number;
  total?: number;
  amountFromBalance: number;
  amountCharged: number;
  creditUsed?: number;
  currency: string;
  paymentMethod: string;
  status: string;
  canceled: boolean;
  purchasedAt: any;
  createdAt?: any;
  refNumber?: string;
  mobilePurchase?: boolean;
  couponCode?: string | null;
  couponDiscount?: number;
}

export interface UsePurchaseHistoryResult {
  purchases: Purchase[];
  credit: CreditBalance;
  loading: boolean;
  error: string | null;
  addOptimistic: (purchase: Purchase) => () => void;
}

const DEFAULT_CREDIT: CreditBalance = {
  balance: 0,
  currency: 'AED',
  dropzoneCustomerDocId: null,
};

export function usePurchaseHistory(
  customerId: string | null,
  dropzoneId: string | null,
  accountId: string | null
): UsePurchaseHistoryResult {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [credit, setCredit] = useState<CreditBalance>(DEFAULT_CREDIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchasesUnsubRef = useRef<(() => void) | null>(null);
  const creditUnsubRef = useRef<(() => void) | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    purchasesUnsubRef.current?.();
    purchasesUnsubRef.current = null;
    creditUnsubRef.current?.();
    creditUnsubRef.current = null;

    if (!customerId || !dropzoneId || !accountId) {
      setPurchases([]);
      setCredit(DEFAULT_CREDIT);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    loadingRef.current = true;
    setError(null);

    purchasesUnsubRef.current = onPurchasesChange(
      customerId,
      dropzoneId,
      accountId,
      (incoming) => {
        setPurchases((prev) => {
          const tempIds = new Set(
            prev.filter((p) => p.id.startsWith('temp-')).map((p) => p.id)
          );
          const merged = incoming.slice();
          if (tempIds.size > 0) {
            const confirmedRefNumbers = new Set(
              incoming.map((p) => p.refNumber).filter(Boolean)
            );
            for (const tempId of tempIds) {
              const tempPurchase = prev.find((p) => p.id === tempId);
              if (tempPurchase && !confirmedRefNumbers.has(tempPurchase.refNumber)) {
                merged.unshift(tempPurchase);
              }
            }
          }
          return merged;
        });
        if (loadingRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      },
      (err) => {
        logger.error('usePurchaseHistory purchases error', err);
        setError('Failed to load transactions');
        if (loadingRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    );

    creditUnsubRef.current = onCreditChange(
      dropzoneId,
      customerId,
      accountId,
      (c) => setCredit(c),
      (err) => logger.error('usePurchaseHistory credit error', err)
    );

    return () => {
      purchasesUnsubRef.current?.();
      purchasesUnsubRef.current = null;
      creditUnsubRef.current?.();
      creditUnsubRef.current = null;
    };
  }, [customerId, dropzoneId, accountId]);

  const addOptimistic = useCallback(
    (purchase: Purchase): (() => void) => {
      setPurchases((prev) => [purchase, ...prev]);
      return () => {
        setPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
      };
    },
    []
  );

  return { purchases, credit, loading, error, addOptimistic };
}
