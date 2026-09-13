import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentCheckIn } from '@/lib/dropzoneService';
import { getCustomerData } from '@/lib/customerCache';
import { usePurchaseHistory } from '@/hooks/usePurchaseHistory';
import { formatCurrency } from '@/lib/currencyFormatter';
import Header from '@/components/Header';
import TransactionFilters from '@/components/transactions/TransactionFilters';
import TransactionList from '@/components/transactions/TransactionList';
import LoadingSkeleton from '@/components/transactions/LoadingSkeleton';
import type { TransactionFiltersState } from '@/components/transactions/TransactionTypes';
import { Receipt } from 'lucide-react-native';

const DEFAULT_FILTERS: TransactionFiltersState = {
  search: '',
  status: 'all',
  paymentMethod: 'all',
  sort: 'newest',
};

export default function TransactionHistoryScreen() {
  const { user } = useAuth();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [dropzoneId, setDropzoneId] = useState<string | null>(null);
  const [currency, setCurrency] = useState('AED');
  const [initLoading, setInitLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFiltersState>(DEFAULT_FILTERS);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [customerResult, checkIn] = await Promise.all([
          getCustomerData(user.uid),
          getCurrentCheckIn(user.uid),
        ]);
        if (cancelled) return;
        if (customerResult) {
          setCustomerId(customerResult.customerId);
          setUserName(customerResult.data?.name || customerResult.data?.displayName || '');
        }
        if (checkIn) {
          setDropzoneId(checkIn.dropzoneId);
          if (customerResult?.data?.currency) setCurrency(customerResult.data.currency);
        }
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const { purchases, loading: purchasesLoading, error } = usePurchaseHistory(
    customerId,
    dropzoneId,
    user?.uid ?? null
  );

  const isLoading = initLoading || purchasesLoading;

  const activePurchases = useMemo(
    () => purchases.filter((p) => {
      if (p.canceled) return false;
      const active = p.items?.filter((i) => !i.canceled) ?? [];
      if ((p.items?.length ?? 0) > 0 && active.length === 0) return false;
      return true;
    }),
    [purchases]
  );

  const canceledCount = useMemo(() => purchases.filter((p) => p.canceled).length, [purchases]);

  const totalSpent = useMemo(
    () => activePurchases.reduce((sum, p) => {
      const active = p.items?.filter((i) => !i.canceled) ?? [];
      const t = active.reduce((s, i) => s + i.price * i.quantity, 0);
      return sum + (active.length > 0 ? t : p.totalAmount);
    }, 0),
    [activePurchases]
  );

  const activeCurrency = useMemo(() => {
    return activePurchases.find((p) => p.currency)?.currency || currency;
  }, [activePurchases, currency]);

  return (
    <View style={styles.root}>
      <Header title="Transaction History" showBack showNotifications={false} />

      {/* Stats cards */}
      {!isLoading && purchases.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activePurchases.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueBlue]}>
              {formatCurrency(totalSpent, activeCurrency)}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          {canceledCount > 0 && (
            <View style={styles.statCard}>
              <Text style={[styles.statValue, styles.statValueRed]}>{canceledCount}</Text>
              <Text style={styles.statLabel}>Canceled</Text>
            </View>
          )}
        </View>
      )}

      {/* Filters */}
      {!isLoading && (
        <TransactionFilters filters={filters} onChange={setFilters} />
      )}

      {/* Content */}
      {error ? (
        <View style={styles.feedbackWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : !dropzoneId ? (
        <View style={styles.feedbackWrap}>
          <View style={styles.emptyIconWrap}>
            <Receipt size={28} color="#009688" strokeWidth={1.5} />
          </View>
          <Text style={styles.feedbackTitle}>Not checked in</Text>
          <Text style={styles.feedbackSub}>
            Check in to a dropzone to view your transaction history.
          </Text>
        </View>
      ) : (
        <TransactionList purchases={purchases} filters={filters} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  statValueBlue: {
    color: '#3B82F6',
    fontSize: 15,
  },
  statValueRed: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 11,
    color: '#8A9BAC',
    fontWeight: '500',
  },

  // Feedback
  feedbackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  feedbackTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  feedbackSub: {
    fontSize: 14,
    color: '#6B8299',
    textAlign: 'center',
    lineHeight: 21,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
});
