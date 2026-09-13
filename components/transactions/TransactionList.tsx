import React, { useMemo, memo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { CircleAlert as AlertCircle } from 'lucide-react-native';
import TransactionCard from './TransactionCard';
import EmptyState from './EmptyState';
import type { Purchase, TransactionFiltersState } from './TransactionTypes';

interface TransactionListProps {
  purchases: Purchase[];
  filters: TransactionFiltersState;
}

function purchaseChanged(prev: Purchase, next: Purchase): boolean {
  if (prev.canceled !== next.canceled) return false;
  if (prev.status !== next.status) return false;
  if (prev.totalAmount !== next.totalAmount) return false;
  if (prev.items?.length !== next.items?.length) return false;
  for (let i = 0; i < (next.items?.length ?? 0); i++) {
    if (prev.items[i]?.canceled !== next.items[i]?.canceled) return false;
    if (prev.items[i]?.used !== next.items[i]?.used) return false;
  }
  return true;
}

const MemoizedCard = memo(TransactionCard, (prev, next) =>
  prev.purchase.id === next.purchase.id && purchaseChanged(prev.purchase, next.purchase)
);

function matchesPaymentMethod(method: string, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'balance') return method === 'balance' || method.startsWith('balance+');
  if (filter === 'card') return method.includes('card') || method === 'visa' || method === 'mastercard';
  if (filter === 'cash') return method === 'cash';
  return (
    method !== 'balance' &&
    !method.startsWith('balance+') &&
    method !== 'cash' &&
    !method.includes('card') &&
    method !== 'visa' &&
    method !== 'mastercard'
  );
}

function applyFilters(purchases: Purchase[], filters: TransactionFiltersState): Purchase[] {
  let result = [...purchases];

  if (filters.search) {
    const lower = filters.search.toLowerCase();
    result = result.filter((p) => {
      if (p.refNumber?.toLowerCase().includes(lower)) return true;
      if (p.id.toLowerCase().includes(lower)) return true;
      if (p.items?.some((item) => item.name.toLowerCase().includes(lower))) return true;
      return false;
    });
  }

  if (filters.status !== 'all') {
    result = result.filter((p) => {
      if (filters.status === 'canceled') return p.canceled;
      if (filters.status === 'completed') return !p.canceled && p.status === 'completed';
      return true;
    });
  }

  if (filters.paymentMethod !== 'all') {
    result = result.filter((p) => matchesPaymentMethod(p.paymentMethod, filters.paymentMethod));
  }

  if (filters.sort === 'oldest') {
    result.sort((a, b) => {
      const aTime = a.purchasedAt?.toMillis?.() || (a.purchasedAt?.seconds ?? 0) * 1000;
      const bTime = b.purchasedAt?.toMillis?.() || (b.purchasedAt?.seconds ?? 0) * 1000;
      return aTime - bTime;
    });
  } else if (filters.sort === 'highest') {
    result.sort((a, b) => b.totalAmount - a.totalAmount);
  } else {
    result.sort((a, b) => {
      const aTime = a.purchasedAt?.toMillis?.() || (a.purchasedAt?.seconds ?? 0) * 1000;
      const bTime = b.purchasedAt?.toMillis?.() || (b.purchasedAt?.seconds ?? 0) * 1000;
      return bTime - aTime;
    });
  }

  return result;
}

type ListItem =
  | { type: 'purchase'; data: Purchase }
  | { type: 'canceled_banner' };

export default function TransactionList({ purchases, filters }: TransactionListProps) {
  const filtered = useMemo(() => applyFilters(purchases, filters), [purchases, filters]);
  const hasFilters = filters.search !== '' || filters.status !== 'all' || filters.paymentMethod !== 'all';

  const listItems = useMemo((): ListItem[] => {
    const result: ListItem[] = [];
    let bannerInserted = false;
    for (const p of filtered) {
      if (p.canceled && !bannerInserted) {
        result.push({ type: 'canceled_banner' });
        bannerInserted = true;
      }
      result.push({ type: 'purchase', data: p });
    }
    return result;
  }, [filtered]);

  if (filtered.length === 0) {
    return <EmptyState hasFilters={hasFilters} />;
  }

  return (
    <FlatList
      data={listItems}
      keyExtractor={(item, idx) =>
        item.type === 'canceled_banner' ? `banner-${idx}` : item.data.id
      }
      renderItem={({ item }) => {
        if (item.type === 'canceled_banner') {
          return (
            <View style={styles.canceledBanner}>
              <AlertCircle size={13} color="#EF4444" strokeWidth={2.5} />
              <Text style={styles.canceledBannerText}>TRANSACTION CANCELED</Text>
            </View>
          );
        }
        return <MemoizedCard purchase={item.data} />;
      }}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={5}
      ListFooterComponent={
        <Text style={styles.footer}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  canceledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  canceledBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.8,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9AAAB8',
    marginTop: 8,
  },
});
