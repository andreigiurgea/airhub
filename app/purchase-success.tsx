import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, Package } from 'lucide-react-native';
import { useEffect, useState } from 'react';

interface PurchaseItem {
  name: string;
  quantity: number;
  price: number;
}

interface PurchaseDetails {
  refNumber: string;
  date: string;
  methodDisplay: string;
  totalPaid: string;
  balanceUsed: string | null;
  remainingPaid: string | null;
  remainingMethod: string | null;
  items: PurchaseItem[];
  currency: string;
  couponCode: string | null;
  couponDiscount: string | null;
  subtotalBeforeDiscount: string | null;
}

export default function PurchaseSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [details, setDetails] = useState<PurchaseDetails | null>(null);

  useEffect(() => {
    if (params.purchaseData) {
      try {
        const data = JSON.parse(params.purchaseData as string);
        setDetails(data);
      } catch (error) {
        console.error('Error parsing purchase data:', error);
      }
    }
  }, [params.purchaseData]);

  if (!details) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successSection}>
          <View style={styles.checkmarkContainer}>
            <CheckCircle size={44} color="#4CAF50" strokeWidth={1.8} />
          </View>
          <Text style={styles.thankYouText}>Thank You!</Text>
          <Text style={styles.processingText}>Your order is being processed.</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>PAYMENT DETAILS</Text>

          <View style={styles.itemsList}>
            {details.items.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.itemRow,
                  index < details.items.length - 1 && styles.itemRowBorder,
                ]}
              >
                <View style={styles.itemIconContainer}>
                  <Package size={18} color="#9B7EDE" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {details.currency} {(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          {details.couponCode && details.couponDiscount && (
            <>
              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text style={styles.detailValue}>
                  {details.currency} {details.subtotalBeforeDiscount}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Coupon Code</Text>
                <Text style={styles.couponCode}>{details.couponCode}</Text>
              </View>

              <View style={[styles.detailRow, styles.noBorder]}>
                <Text style={styles.detailLabel}>Discount</Text>
                <Text style={styles.discountAmount}>
                  - {details.currency} {details.couponDiscount}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ref Number</Text>
            <Text style={styles.detailValue}>{details.refNumber}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{details.date}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Method</Text>
            <Text style={styles.detailValue}>{details.methodDisplay}</Text>
          </View>

          {details.balanceUsed && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From Balance</Text>
              <Text style={styles.balanceDeduction}>
                - {details.currency} {details.balanceUsed}
              </Text>
            </View>
          )}

          {details.remainingPaid && details.remainingMethod && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Via {details.remainingMethod}</Text>
              <Text style={styles.detailValue}>
                {details.currency} {details.remainingPaid}
              </Text>
            </View>
          )}

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>
              {details.balanceUsed && parseFloat(details.totalPaid) === 0
                ? 'Total (from Balance)'
                : 'Total Paid'}
            </Text>
            <Text style={styles.totalAmount}>
              {details.currency} {details.totalPaid}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.replace('/shop')}
        >
          <Text style={styles.continueButtonText}>Continue shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  content: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  checkmarkContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  thankYouText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  processingText: {
    fontSize: 14,
    color: '#666',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 16,
  },
  itemsList: {
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#999',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  balanceDeduction: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  couponCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B7EDE',
  },
  discountAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  totalSection: {
    paddingTop: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#D4E8F0',
  },
  continueButton: {
    backgroundColor: '#9B7EDE',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
