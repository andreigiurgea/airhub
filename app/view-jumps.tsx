import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react-native';
import Header from '@/components/Header';
import { Jump } from '@/lib/jumpsService';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function ViewJumpsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [jumps, setJumps] = useState<Jump[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerId = async () => {
      if (!user) return;

      try {
        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('accountId', '==', user.uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const customerDoc = snapshot.docs[0];
          setCustomerId(customerDoc.data().customerId);
        }
      } catch (error) {
        console.error('Error fetching customer ID:', error);
      }
    };

    fetchCustomerId();
  }, [user]);

  useEffect(() => {
    if (!customerId) return;

    setLoading(true);
    let unsubscribeJumps: (() => void) | null = null;

    const setupJumpsListener = () => {
      try {
        const logbookRef = collection(db, 'logbook');
        const q = query(
          logbookRef,
          where('customerId', '==', customerId),
          orderBy('createdAt', 'desc')
        );

        console.log('Setting up real-time jumps listener for customer:', customerId);

        unsubscribeJumps = onSnapshot(q, (snapshot) => {
          const fetchedJumps: Jump[] = [];

          snapshot.forEach((doc) => {
            fetchedJumps.push({
              id: doc.id,
              ...doc.data()
            } as Jump);
          });

          setJumps(fetchedJumps);
          setLoading(false);
          console.log('Jumps updated in real-time:', fetchedJumps.length);
        }, (error) => {
          console.error('Error in jumps listener:', error);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up jumps listener:', error);
        setLoading(false);
      }
    };

    setupJumpsListener();

    return () => {
      if (unsubscribeJumps) {
        console.log('Cleaning up jumps listener');
        unsubscribeJumps();
      }
    };
  }, [customerId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#FFC107';
      case 'pending_signature':
        return '#2196F3';
      case 'signed':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'pending_signature':
        return 'Pending Signature';
      case 'signed':
        return 'Signed';
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      <Header title="View Jumps" showBack={true} showNotifications={false} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B96D9" />
          <Text style={styles.loadingText}>Loading your jumps...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {jumps.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No jumps recorded yet</Text>
              <Text style={styles.emptySubtext}>
                Your jump entries will appear here after you complete a load
              </Text>
            </View>
          ) : (
            <View style={styles.jumpsList}>
              {jumps.map((jump) => (
                <TouchableOpacity
                  key={jump.id}
                  style={styles.jumpCard}
                  onPress={() => router.push(`/jump-details?id=${jump.id}`)}
                >
                  <View style={styles.jumpCardContent}>
                    <View style={styles.jumpCardHeader}>
                      <View>
                        <Text style={styles.jumpCardTitle}>
                          {jump.dropzoneName}
                        </Text>
                        <Text style={styles.jumpCardSubtitle}>
                          Load #{jump.loadNumber} - {jump.loadName}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(jump.status) }]}>
                        <Text style={styles.statusText}>{getStatusLabel(jump.status)}</Text>
                      </View>
                    </View>

                    <View style={styles.jumpCardDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>{jump.departureDate}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>{jump.departureTime}</Text>
                      </View>
                      {jump.jumpNumber && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Jump #:</Text>
                          <Text style={styles.detailValue}>{jump.jumpNumber}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <ChevronRight size={20} color="#CCC" />
                </TouchableOpacity>
              ))}
            </View>
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  jumpsList: {
    padding: 20,
    gap: 12,
  },
  jumpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jumpCardContent: {
    flex: 1,
  },
  jumpCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jumpCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  jumpCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  jumpCardDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
});
