import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Package, Wallet, CreditCard, X, Smartphone } from 'lucide-react-native';
import type { Purchase } from './TransactionTypes';
import { formatCurrency } from '@/lib/currencyFormatter';

interface TransactionDetailsProps {
  purchase: Purchase;
}

function CategoryLabel({ category }: { category?: string }) {
  if (!category) return null;
  return <Text style={styles.itemCategory}>{category}</Text>;
}

export default function TransactionDetails({ purchase }: TransactionDetailsProps) {
  const currency = purchase.currency || 'AED';
  const hasBalancePayment = purchase.amountFromBalance > 0;
  const hasChargedPayment = purchase.amountCharged > 0;
  const hasCoupon = purchase.couponCode && (purchase.couponDiscount ?? 0) > 0;

  return (
    <View style={styles.container}>
      {purchase.items && purchase.items.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Package size={13} color="#009688" strokeWidth={2} />
            </View>
            <Text style={styles.sectionTitle}>Items</Text>
          </View>
          {purchase.items.map((item, index) => (
            <View key={index} style={[styles.itemRow, item.canceled && styles.itemRowCanceled]}>
              <View style={styles.itemLeft}>
                <View style={styles.itemNameRow}>
                  <Text style={[styles.itemName, item.canceled && styles.itemNameCanceled]}>
                    {item.name}
                  </Text>
                  {item.canceled && (
                    <View style={styles.itemCanceledBadge}>
                      <X size={8} color="#C62828" strokeWidth={3} />
                      <Text style={styles.itemCanceledText}>Canceled</Text>
                    </View>
                  )}
                </View>
                <CategoryLabel category={item.category} />
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemQty, item.canceled && styles.itemQtyCanceled]}>
                  x{item.quantity}
                </Text>
                <Text style={[styles.itemPrice, item.canceled && styles.itemPriceCanceled]}>
                  {formatCurrency(item.price * item.quantity, currency)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconWrap}>
            <Wallet size={13} color="#009688" strokeWidth={2} />
          </View>
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>
        </View>

        {purchase.subtotal !== undefined && purchase.subtotal !== purchase.totalAmount && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(purchase.subtotal, currency)}</Text>
          </View>
        )}

        {hasCoupon && (
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, styles.discountLabel]}>
              Coupon ({purchase.couponCode})
            </Text>
            <Text style={styles.discountValue}>
              -{formatCurrency(purchase.couponDiscount!, currency)}
            </Text>
          </View>
        )}

        {hasBalancePayment && (
          <View style={styles.breakdownRow}>
            <View style={styles.payMethodTag}>
              <Wallet size={11} color="#009688" strokeWidth={2} />
              <Text style={styles.payMethodTagText}>Balance</Text>
            </View>
            <Text style={styles.breakdownValue}>
              {formatCurrency(purchase.amountFromBalance, currency)}
            </Text>
          </View>
        )}

        {hasChargedPayment && (
          <View style={styles.breakdownRow}>
            <View style={[styles.payMethodTag, styles.payMethodTagAlt]}>
              <CreditCard size={11} color="#5A6E7F" strokeWidth={2} />
              <Text style={[styles.payMethodTagText, styles.payMethodTagAltText]}>
                {purchase.paymentMethod.includes('+')
                  ? purchase.paymentMethod.split('+').pop()
                  : purchase.paymentMethod}
              </Text>
            </View>
            <Text style={styles.breakdownValue}>
              {formatCurrency(purchase.amountCharged, currency)}
            </Text>
          </View>
        )}

        <View style={[styles.breakdownRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Paid</Text>
          <Text style={styles.totalValue}>{formatCurrency(purchase.totalAmount, currency)}</Text>
        </View>
      </View>

      {purchase.mobilePurchase && (
        <View style={styles.mobileBadge}>
          <Smartphone size={11} color="#5B8CDB" strokeWidth={2} />
          <Text style={styles.mobileBadgeText}>Mobile Purchase</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  section: {
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A2B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F7FA',
  },
  itemRowCanceled: {
    opacity: 0.55,
    backgroundColor: '#FFF8F8',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  itemLeft: {
    flex: 1,
    gap: 3,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2B3C',
  },
  itemNameCanceled: {
    textDecorationLine: 'line-through',
    color: '#8A9BAC',
  },
  itemCanceledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemCanceledText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C62828',
  },
  itemCategory: {
    fontSize: 11,
    color: '#8A9BAC',
    textTransform: 'capitalize',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemQty: {
    fontSize: 11,
    color: '#8A9BAC',
    fontWeight: '500',
  },
  itemQtyCanceled: {
    textDecorationLine: 'line-through',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  itemPriceCanceled: {
    textDecorationLine: 'line-through',
    color: '#8A9BAC',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF4F7',
    marginVertical: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#5A6E7F',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2B3C',
  },
  discountLabel: {
    color: '#00897B',
  },
  discountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00897B',
  },
  payMethodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  payMethodTagAlt: {
    backgroundColor: '#F2F7FA',
  },
  payMethodTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#009688',
    textTransform: 'capitalize',
  },
  payMethodTagAltText: {
    color: '#5A6E7F',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF4F7',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  mobileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#EBF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  mobileBadgeText: {
    fontSize: 11,
    color: '#5B8CDB',
    fontWeight: '600',
  },
});
