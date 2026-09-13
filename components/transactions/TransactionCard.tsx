import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import {
  ChevronDown,
  CreditCard,
  Banknote,
  Wallet,
  Smartphone,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';
import type { Purchase } from './TransactionTypes';
import { formatCurrency } from '@/lib/currencyFormatter';
import TransactionDetails from './TransactionDetails';

interface TransactionCardProps {
  purchase: Purchase;
}

function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  let date: Date;
  if (timestamp?.toDate) date = timestamp.toDate();
  else if (timestamp?.seconds) date = new Date(timestamp.seconds * 1000);
  else if (timestamp instanceof Date) date = timestamp;
  else return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function PaymentBadge({ method }: { method: string }) {
  if (!method) return null;
  const isCash = method === 'cash';
  const isCard = method.includes('card') || method === 'visa' || method === 'mastercard';
  const isBalance = method === 'balance' || method.startsWith('balance+');
  const isMobile = method === 'mobile' || method === 'app';

  let IconComp: any = CreditCard;
  let color = '#5A6E7F';
  let bg = '#F0F4F8';
  let label = method.charAt(0).toUpperCase() + method.slice(1);

  if (isCash) { IconComp = Banknote; color = '#E65100'; bg = '#FFF3E0'; label = 'Cash'; }
  else if (isCard) { IconComp = CreditCard; color = '#3B82F6'; bg = '#EBF4FF'; label = 'Card'; }
  else if (isBalance) { IconComp = Wallet; color = '#009688'; bg = '#E0F2F1'; label = 'Balance'; }
  else if (isMobile) { IconComp = Smartphone; color = '#3B82F6'; bg = '#EBF4FF'; label = 'Mobile'; }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <IconComp size={11} color={color} strokeWidth={2} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function TransactionCard({ purchase }: TransactionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(rotateAnim, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const currency = purchase.currency || 'AED';
  const activeItems = purchase.items?.filter((i) => !i.canceled) ?? [];
  const allCanceled = (purchase.items?.length ?? 0) > 0 && activeItems.length === 0;
  const effectivelyCanceled = purchase.canceled || allCanceled;
  const itemCount = purchase.items?.length ?? 0;
  const refLabel = purchase.refNumber
    ? purchase.refNumber.toUpperCase()
    : purchase.id.slice(0, 10).toUpperCase();

  return (
    <View style={[styles.card, effectivelyCanceled && styles.cardCanceled]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.78} style={styles.row}>
        {/* Status icon */}
        <View style={[styles.iconBox, effectivelyCanceled ? styles.iconBoxCanceled : styles.iconBoxActive]}>
          {effectivelyCanceled ? (
            <View style={styles.cancelDot} />
          ) : (
            <CheckCircle size={16} color="#009688" strokeWidth={2.5} />
          )}
        </View>

        {/* Left: ref + date + dropzone */}
        <View style={styles.left}>
          <View style={styles.refRow}>
            <Text style={[styles.ref, effectivelyCanceled && styles.refCanceled]}>
              {refLabel}
            </Text>
            <Text style={styles.date}>{formatDate(purchase.purchasedAt)}</Text>
          </View>
          {purchase.dropzoneName ? (
            <Text style={styles.dz} numberOfLines={1}>{purchase.dropzoneName}</Text>
          ) : null}
        </View>

        {/* Right: payment + amount + count + chevron */}
        <View style={styles.right}>
          {purchase.paymentMethod ? (
            <PaymentBadge method={purchase.paymentMethod} />
          ) : null}
          <View style={styles.amountCol}>
            {effectivelyCanceled && purchase.totalAmount > 0 ? (
              <Text style={styles.amountStrike}>
                {formatCurrency(purchase.totalAmount, currency)}
              </Text>
            ) : null}
            <Text style={[styles.amount, effectivelyCanceled && styles.amountCanceled]}>
              {effectivelyCanceled
                ? formatCurrency(0, currency)
                : formatCurrency(purchase.totalAmount, currency)}
            </Text>
            <Text style={styles.itemCount}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <ChevronDown size={16} color="#9AAAB8" strokeWidth={2.5} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandWrap}>
          <View style={styles.expandDivider} />
          <TransactionDetails purchase={purchase} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardCanceled: {
    backgroundColor: '#FFFAFA',
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBoxActive: {
    backgroundColor: '#E0F2F1',
  },
  iconBoxCanceled: {
    backgroundColor: '#FFEBEE',
  },
  cancelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  left: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  ref: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.4,
  },
  refCanceled: {
    textDecorationLine: 'line-through',
    color: '#9AAAB8',
  },
  date: {
    fontSize: 12,
    color: '#9AAAB8',
  },
  dz: {
    fontSize: 12,
    color: '#4A6278',
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  amountStrike: {
    fontSize: 10,
    color: '#B0BECB',
    textDecorationLine: 'line-through',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  amountCanceled: {
    color: '#9AAAB8',
  },
  itemCount: {
    fontSize: 10,
    color: '#9AAAB8',
  },
  expandWrap: {},
  expandDivider: {
    height: 1,
    backgroundColor: '#F0F4F8',
    marginHorizontal: 14,
  },
});
