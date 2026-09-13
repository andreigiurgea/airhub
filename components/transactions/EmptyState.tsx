import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Receipt, SearchX } from 'lucide-react-native';

interface EmptyStateProps {
  hasFilters?: boolean;
}

export default function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        {hasFilters
          ? <SearchX size={32} color="#5A6E7F" strokeWidth={1.5} />
          : <Receipt size={32} color="#009688" strokeWidth={1.5} />
        }
      </View>
      <Text style={styles.title}>
        {hasFilters ? 'No matching transactions' : 'No transactions yet'}
      </Text>
      <Text style={styles.subtitle}>
        {hasFilters
          ? 'Try adjusting your filters or search term'
          : 'Your purchase history will appear here once you make a purchase at a dropzone'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2B3C',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#5A6E7F',
    textAlign: 'center',
    lineHeight: 22,
  },
});
