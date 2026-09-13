import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { ArrowLeft, Calendar, Clock, MapPin, Users, ChevronRight } from 'lucide-react-native';
import { getCurrentCheckIn, getDropzoneById } from '@/lib/dropzoneService';

interface Booking {
  id: string;
  customerName: string;
  date: any;
  type: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  price: number;
  paid: number;
  currency?: string;
  coach?: {
    id?: string;
    name: string;
  };
  notes?: string;
  createdAt: any;
  updatedAt: any;
  location?: string;
  equipment?: string;
  subcategory?: string;
  creator?: {
    type: string;
    name: string;
  };
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>('AED');
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    loadCurrencyAndBookings();
  }, [user]);

  const loadCurrencyAndBookings = async () => {
    // Load dropzone currency
    const checkIn = await getCurrentCheckIn(user!.uid);
    if (checkIn?.dropzoneId) {
      const dropzone = await getDropzoneById(checkIn.dropzoneId);
      if (dropzone?.currency) {
        setCurrency(dropzone.currency);
      }
    }

    fetchBookings();
  };

  const fetchBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const bookingsRef = collection(db, 'bookings');
      const bookingsQuery = query(bookingsRef);

      const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
        const fetchedBookings: Booking[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedBookings.push({
            id: doc.id,
            ...data,
          } as Booking);
        });

        fetchedBookings.sort((a, b) => {
          const dateA = a.date?.seconds || 0;
          const dateB = b.date?.seconds || 0;
          return dateB - dateA;
        });

        setBookings(fetchedBookings);
        setLoading(false);
        console.log('Fetched bookings:', fetchedBookings.length);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'completed':
        return '#2196F3';
      case 'cancelled':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#E8F5E9';
      case 'pending':
        return '#FFF3E0';
      case 'completed':
        return '#E3F2FD';
      case 'cancelled':
        return '#FFEBEE';
      default:
        return '#F5F5F5';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getBookingTypeLabel = (type: string) => {
    if (type === 'tandem') return 'Tandem Jump';
    if (type === 'aff') return 'AFF Jump';
    if (type === 'camps') return 'Camp';
    if (type === 'flight_school') return 'Flight School';
    return 'Booking';
  };

  const renderBookingCard = (booking: Booking) => {
    const dateStr = formatDate(booking.date);
    const timeStr = booking.date?.toDate ?
      booking.date.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) :
      '';

    return (
      <TouchableOpacity
        key={booking.id}
        style={styles.bookingCard}
        onPress={() => {
          // Navigation to booking details can be added here
        }}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingHeaderLeft}>
            <View style={styles.dateIconContainer}>
              <Calendar size={20} color="#9B7EDE" />
            </View>
            <View>
              <Text style={styles.bookingTitle}>{getBookingTypeLabel(booking.type)}</Text>
              <Text style={styles.bookingDropzone}>{booking.customerName}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(booking.status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.detailText}>{dateStr}</Text>
          </View>
          {timeStr && (
            <View style={styles.detailRow}>
              <Clock size={16} color="#666" />
              <Text style={styles.detailText}>{timeStr}</Text>
            </View>
          )}
          {booking.coach && (
            <View style={styles.detailRow}>
              <Users size={16} color="#666" />
              <Text style={styles.detailText}>Coach: {booking.coach.name}</Text>
            </View>
          )}
          {booking.location && (
            <View style={styles.detailRow}>
              <MapPin size={16} color="#666" />
              <Text style={styles.detailText}>{booking.location}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.priceLabel}>Price: </Text>
            <Text style={styles.priceValue}>{booking.currency || currency} {booking.price}</Text>
            {booking.paid > 0 && (
              <Text style={styles.paidBadge}> • Paid: {booking.currency || currency} {booking.paid}</Text>
            )}
          </View>
        </View>

        {booking.notes && booking.notes.trim() && (
          <View style={styles.notesSection}>
            <Text style={styles.notesText} numberOfLines={2}>{booking.notes}</Text>
          </View>
        )}

        <View style={styles.bookingFooter}>
          <Text style={styles.createdText}>
            ID: {booking.id}
          </Text>
          <ChevronRight size={16} color="#CCC" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookings</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9B7EDE" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={64} color="#CCC" />
              <Text style={styles.emptyText}>No bookings yet</Text>
              <Text style={styles.emptySubtext}>
                Your upcoming bookings will appear here
              </Text>
            </View>
          ) : (
            bookings.map(booking => renderBookingCard(booking))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  bookingDropzone: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  notesSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  createdText: {
    fontSize: 12,
    color: '#999',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  paidBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
});
