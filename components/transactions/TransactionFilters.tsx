import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { Search, X, ChevronDown, Check } from 'lucide-react-native';
import type { TransactionFiltersState, StatusFilter, PaymentMethodFilter } from './TransactionTypes';

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  onChange: (filters: TransactionFiltersState) => void;
}

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'completed' },
  { label: 'Canceled', value: 'canceled' },
];

const PAYMENT_OPTIONS: { label: string; value: PaymentMethodFilter }[] = [
  { label: 'All Methods', value: 'all' },
  { label: 'Card', value: 'card' },
  { label: 'Balance', value: 'balance' },
  { label: 'Cash', value: 'cash' },
  { label: 'Other', value: 'other' },
];

export default function TransactionFilters({ filters, onChange }: TransactionFiltersProps) {
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const paymentLabel =
    filters.paymentMethod === 'all'
      ? 'Payment'
      : (PAYMENT_OPTIONS.find((o) => o.value === filters.paymentMethod)?.label ?? 'Payment');
  const isPaymentActive = filters.paymentMethod !== 'all';

  return (
    <View style={styles.wrapper}>
      {/* Search */}
      <View style={styles.searchCard}>
        <Search size={15} color="#9AAAB8" strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ref, item name, or date..."
          placeholderTextColor="#9AAAB8"
          value={filters.search}
          onChangeText={(t) => onChange({ ...filters, search: t })}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {filters.search !== '' && (
          <TouchableOpacity
            onPress={() => onChange({ ...filters, search: '' })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color="#9AAAB8" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status + Payment */}
      <View style={styles.controlRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillScroll}
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = filters.status === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => onChange({ ...filters, status: opt.value })}
                activeOpacity={0.75}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.paymentBtn, isPaymentActive && styles.paymentBtnActive]}
          onPress={() => setShowPaymentSheet(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.paymentBtnText, isPaymentActive && styles.paymentBtnTextActive]}>
            {paymentLabel}
          </Text>
          <ChevronDown
            size={13}
            color={isPaymentActive ? '#1A1A1A' : '#9AAAB8'}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>

      {/* Payment sheet */}
      <Modal visible={showPaymentSheet} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPaymentSheet(false)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Payment Method</Text>
            {PAYMENT_OPTIONS.map((opt) => {
              const selected = filters.paymentMethod === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sheetRow, selected && styles.sheetRowActive]}
                  onPress={() => {
                    onChange({ ...filters, paymentMethod: opt.value });
                    setShowPaymentSheet(false);
                  }}
                >
                  <Text style={[styles.sheetRowText, selected && styles.sheetRowTextActive]}>
                    {opt.label}
                  </Text>
                  {selected && <Check size={16} color="#3B82F6" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  pillActive: {
    backgroundColor: '#1A2B3C',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A6278',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  paymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  paymentBtnActive: {
    backgroundColor: '#EBF4FF',
  },
  paymentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9AAAB8',
  },
  paymentBtnTextActive: {
    color: '#1A1A1A',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  sheetRowActive: {
    backgroundColor: '#F0F7FF',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderRadius: 0,
  },
  sheetRowText: {
    fontSize: 15,
    color: '#4A6278',
    fontWeight: '500',
  },
  sheetRowTextActive: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
});
