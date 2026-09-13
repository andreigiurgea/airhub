import type { Purchase } from '@/hooks/usePurchaseHistory';

export type SortOption = 'newest' | 'oldest' | 'highest';
export type StatusFilter = 'all' | 'completed' | 'canceled';
export type PaymentMethodFilter = 'all' | 'card' | 'balance' | 'cash' | 'other';

export interface TransactionFiltersState {
  search: string;
  status: StatusFilter;
  paymentMethod: PaymentMethodFilter;
  sort: SortOption;
}

export type { Purchase };
