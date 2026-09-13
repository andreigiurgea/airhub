import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  X,
  GraduationCap,
  ChevronRight,
  Tent,
} from 'lucide-react-native';
import { getCurrentCheckIn, type CheckInStatus } from '@/lib/dropzoneService';
import { logger } from '@/lib/logger';

type EventStatus = 'upcoming' | 'active' | 'past';
type FilterTab = 'all' | EventStatus;

interface CampBooking {
  id: string;
  bookingType: string;
  customerName?: string;
  date?: any;
  endDate?: any;
  type?: string;
  status?: string;
  price?: number;
  paid?: number;
  currency?: string;
  coach?: { id?: string; name: string };
  notes?: string;
  location?: string;
  equipment?: string;
  subcategory?: string;
  createdAt?: any;
  updatedAt?: any;
}

function deriveStatus(booking: CampBooking): EventStatus {
  const s = booking.status?.toLowerCase();
  if (s === 'completed' || s === 'cancelled') return 'past';
  if (s === 'confirmed' || s === 'active') {
    const now = Date.now();
    const start = booking.date?.seconds ? booking.date.seconds * 1000 : null;
    const end = booking.endDate?.seconds ? booking.endDate.seconds * 1000 : null;
    if (start && now >= start && (!end || now <= end)) return 'active';
    if (start && now > (end ?? start)) return 'past';
    return 'upcoming';
  }
  if (s === 'pending') return 'upcoming';
  const now = Date.now();
  const start = booking.date?.seconds ? booking.date.seconds * 1000 : null;
  const end = booking.endDate?.seconds ? booking.endDate.seconds * 1000 : null;
  if (!start) return 'upcoming';
  if (end && now > end) return 'past';
  if (now >= start && (!end || now <= end)) return 'active';
  return 'upcoming';
}

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string }> = {
  upcoming: { label: 'Upcoming', color: '#1565C0', bg: '#E3F2FD' },
  active: { label: 'Active', color: '#2E7D32', bg: '#E8F5E9' },
  past: { label: 'Past', color: '#757575', bg: '#F5F5F5' },
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
];

export default function CampsEventsScreen() {
  const [camps, setCamps] = useState<CampBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState<CheckInStatus | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const ci = await getCurrentCheckIn(user.uid);
      if (!cancelled) {
        setCheckIn(ci);
        setCheckInLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (checkInLoading) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!checkIn?.dropzoneId) {
      setCamps([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const ref = collection(db, 'dropzones', checkIn.dropzoneId, 'bookings');
      const q = query(
        ref,
        where('bookingType', '==', 'camps'),
        orderBy('date', 'asc')
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: CampBooking[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as CampBooking);
          });
          setCamps(list);
          setLoading(false);
        },
        (error) => {
          logger.error('Error loading camps:', error);
          setLoading(false);
        }
      );

      unsubscribeRef.current = unsub;
    } catch (error) {
      logger.error('Failed to set up camps listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [checkIn?.dropzoneId, checkInLoading]);

  const filtered = camps.filter((c) => {
    const status = deriveStatus(c);
    if (activeFilter !== 'all' && status !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !c.customerName?.toLowerCase().includes(q) &&
        !c.notes?.toLowerCase().includes(q) &&
        !c.location?.toLowerCase().includes(q) &&
        !c.subcategory?.toLowerCase().includes(q) &&
        !c.coach?.name?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const renderCard = (booking: CampBooking) => {
    const status = deriveStatus(booking);
    const cfg = STATUS_CONFIG[status];
    const dateStr = formatDate(booking.date);
    const timeStr = formatTime(booking.date);
    const endDateStr = booking.endDate ? formatDate(booking.endDate) : null;

    return (
      <View key={booking.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.cardIconWrap}>
              <Tent size={20} color="#E91E63" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {booking.subcategory || booking.customerName || 'Camp'}
              </Text>
              {booking.coach?.name ? (
                <Text style={styles.cardSubtitle}>Coach: {booking.coach.name}</Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          {dateStr ? (
            <View style={styles.metaRow}>
              <Calendar size={14} color="#888" />
              <Text style={styles.metaText}>
                {dateStr}{endDateStr && endDateStr !== dateStr ? ` – ${endDateStr}` : ''}
              </Text>
            </View>
          ) : null}
          {timeStr ? (
            <View style={styles.metaRow}>
              <Clock size={14} color="#888" />
              <Text style={styles.metaText}>{timeStr}</Text>
            </View>
          ) : null}
          {booking.location ? (
            <View style={styles.metaRow}>
              <MapPin size={14} color="#888" />
              <Text style={styles.metaText}>{booking.location}</Text>
            </View>
          ) : null}
          {booking.customerName ? (
            <View style={styles.metaRow}>
              <Users size={14} color="#888" />
              <Text style={styles.metaText}>{booking.customerName}</Text>
            </View>
          ) : null}
        </View>

        {booking.notes && booking.notes.trim() ? (
          <Text style={styles.description} numberOfLines={2}>{booking.notes}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View>
            {booking.price != null ? (
              <Text style={styles.price}>
                {booking.currency || 'AED'} {booking.price}
              </Text>
            ) : (
              <Text style={styles.priceFree}>Free</Text>
            )}
            {booking.paid != null && booking.paid > 0 ? (
              <Text style={styles.paidText}>Paid: {booking.currency || 'AED'} {booking.paid}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.detailsButton} activeOpacity={0.75}>
            <Text style={styles.detailsButtonText}>View Details</Text>
            <ChevronRight size={14} color="#E91E63" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Camps &amp; Events</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={16} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search camps and events..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterTabText, activeFilter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading || checkInLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>Loading camps &amp; events...</Text>
        </View>
      ) : !checkIn?.dropzoneId ? (
        <View style={styles.center}>
          <GraduationCap size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Not Checked In</Text>
          <Text style={styles.emptySubtitle}>Check in to a dropzone to see its camps and events.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Tent size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>
            {camps.length === 0 ? 'No Camps or Events' : 'No Results'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {camps.length === 0
              ? 'There are no camps or events at this dropzone yet.'
              : 'Try adjusting your search or filters.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map(renderCard)}
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
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1A1A1A',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 22,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaGrid: {
    gap: 6,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  description: {
    fontSize: 13,
    color: '#888',
    lineHeight: 19,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  priceFree: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  paidText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FCE4EC',
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E91E63',
  },
});
