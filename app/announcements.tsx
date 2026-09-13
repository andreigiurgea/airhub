import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { Megaphone, Clock } from 'lucide-react-native';
import { getCurrentCheckIn, type CheckInStatus } from '@/lib/dropzoneService';
import { logger } from '@/lib/logger';
import { QUERY_LIMITS } from '@/lib/constants';
import Header from '@/components/Header';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: any;
  author?: string;
}

interface StandbyState {
  isActive: boolean;
  activatedAt?: any;
  activatedBy?: string;
}

export default function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckInStatus | null>(null);
  const [standbyState, setStandbyState] = useState<StandbyState>({ isActive: false });
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const loadCheckIn = async () => {
      if (!user) return;
      const checkIn = await getCurrentCheckIn(user.uid);
      setCurrentCheckIn(checkIn);
    };

    loadCheckIn();
  }, [user]);

  // Listen to announcements
  useEffect(() => {
    if (!currentCheckIn?.dropzoneId) {
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    const announcementsRef = collection(db, 'dropzones', currentCheckIn.dropzoneId, 'announcements');
    const q = query(announcementsRef, orderBy('createdAt', 'desc'), limit(QUERY_LIMITS.ANNOUNCEMENTS));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementsList: Announcement[] = [];
      snapshot.forEach((doc) => {
        announcementsList.push({
          id: doc.id,
          ...doc.data(),
        } as Announcement);
      });
      setAnnouncements(announcementsList);
      setLoading(false);
    }, (error) => {
      logger.error('Error loading announcements:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentCheckIn?.dropzoneId]);

  // Listen to standby state
  useEffect(() => {
    if (!currentCheckIn?.dropzoneId) {
      setStandbyState({ isActive: false });
      return;
    }

    const standbyRef = doc(db, 'dropzones', currentCheckIn.dropzoneId, 'system', 'standby');

    const unsubscribe = onSnapshot(standbyRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setStandbyState({
          isActive: data.isActive || false,
          activatedAt: data.activatedAt,
          activatedBy: data.activatedBy,
        });
      } else {
        setStandbyState({ isActive: false });
      }
    }, (error) => {
      logger.error('Error listening to standby state:', error);
      setStandbyState({ isActive: false });
    });

    return () => unsubscribe();
  }, [currentCheckIn?.dropzoneId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Announcements" showBack={true} showNotifications={true} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : announcements.length === 0 && !standbyState.isActive ? (
          <View style={styles.card}>
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Megaphone size={48} color="#CCC" />
              </View>
              <Text style={styles.emptyTitle}>No Announcements</Text>
              <Text style={styles.emptySubtext}>
                There are no announcements at this time
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            {standbyState.isActive && (
              <View style={[styles.row, styles.standbyRow]}>
                <View style={styles.standbyHeader}>
                  <Clock size={18} color="#FF9800" />
                  <Text style={styles.standbyTitle}>Standby Mode Active</Text>
                </View>
                <Text style={styles.standbyMessage}>
                  Operations are currently on standby. Load timers are paused.
                </Text>
                {standbyState.activatedAt && (
                  <Text style={styles.standbyTime}>
                    Since {formatDate(standbyState.activatedAt)}
                  </Text>
                )}
              </View>
            )}
            {announcements.map((announcement, index) => (
              <View
                key={announcement.id}
                style={[
                  styles.row,
                  (standbyState.isActive || index > 0) && styles.rowBorder,
                ]}
              >
                <View style={styles.announcementMeta}>
                  {announcement.createdAt && (
                    <Text style={styles.announcementTime}>
                      {formatDate(announcement.createdAt)}
                    </Text>
                  )}
                  <View style={[
                    styles.priorityBadge,
                    announcement.priority === 'high' && styles.priorityBadgeHigh,
                    announcement.priority === 'medium' && styles.priorityBadgeMedium,
                    announcement.priority === 'low' && styles.priorityBadgeLow,
                  ]}>
                    <Text style={[
                      styles.priorityBadgeText,
                      announcement.priority === 'high' && styles.priorityBadgeTextHigh,
                      announcement.priority === 'medium' && styles.priorityBadgeTextMedium,
                      announcement.priority === 'low' && styles.priorityBadgeTextLow,
                    ]}>
                      {announcement.priority?.toUpperCase() || 'LOW'}
                    </Text>
                  </View>
                </View>
                {announcement.title ? (
                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                ) : null}
                <Text style={styles.announcementText}>{announcement.message}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  standbyRow: {
    backgroundColor: '#FFFBEB',
  },
  standbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  standbyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  standbyMessage: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
    marginBottom: 6,
  },
  standbyTime: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '500',
  },
  announcementMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  announcementTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  announcementText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
  },
  priorityBadgeHigh: {
    backgroundColor: '#FEE2E2',
  },
  priorityBadgeMedium: {
    backgroundColor: '#FEF3C7',
  },
  priorityBadgeLow: {
    backgroundColor: '#DBEAFE',
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  priorityBadgeTextHigh: {
    color: '#DC2626',
  },
  priorityBadgeTextMedium: {
    color: '#D97706',
  },
  priorityBadgeTextLow: {
    color: '#2563EB',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 21,
  },
});
