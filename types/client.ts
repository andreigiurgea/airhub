export type NotificationCategory =
  | 'shop'
  | 'groups'
  | 'bookings'
  | 'equipment'
  | 'camps'
  | 'transactions'
  | 'logbook'
  | 'marketplace'
  | 'announcements'
  | 'loads'
  | 'standby'
  | 'weather'
  | 'general'
  | 'signature_request';

export interface Client {
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  country?: string;
  dateOfBirth?: string;
  weight?: number;
  licenseType?: string;
  totalJumps: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  dropzoneId?: string;
  accountId?: string;
}
