import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, orderBy, limit, updateDoc } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';
import { MapPin, TriangleAlert as AlertTriangle, Plane, Plus, Bell, LogIn, LogOut, Clock, X, Users, Wind, Info } from 'lucide-react-native';
import {
  getAllDropzones,
  checkInToDropzone,
  checkOutFromDropzone,
  getCurrentCheckIn,
  type Dropzone,
  type CheckInStatus
} from '@/lib/dropzoneService';
import { subscribeToGroupsAsMember, type Group } from '@/lib/groupsService';
import { subscribeToEquipment, type Equipment } from '@/lib/equipmentService';
import { logger } from '@/lib/logger';
import { QUERY_LIMITS, REFRESH_INTERVALS } from '@/lib/constants';
import { fahrenheitToCelsius, calculateMinutesUntilDeparture } from '@/lib/timeUtils';
import { getCustomerData } from '@/lib/customerCache';

interface UserProfile {
  fullName: string;
  totalJumps: number;
}

interface NextLoad {
  id: string;
  aircraft: string;
  loadNumber: number;
  time: string;
  availableSlots: number;
  maxSlots: number;
  loadMaster: string;
}

interface WeatherData {
  windSpeed?: number;
  windSpeedKmh?: number;
  windSpeedMph?: number;
  windDirection?: string;
  windDirectionCompass?: string;
  temperature?: number;
  temperatureF?: number;
  temperatureC?: number;
  conditions?: string;
  visibility?: number;
  visibilityKm?: number;
  visibilityMi?: number;
  jumpRun?: string;
  jumpRunCompass?: string;
  jumpRunNote?: string | null;
}

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

interface EquipmentAlert {
  equipmentId: string;
  rigName: string;
  type: 'reserve_packing' | 'aad_expiry';
  label: string;
  daysLeft: number;
  expiryDate: string;
}

function getDaysLeft(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ffSeconds(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(val as string);
  return isNaN(n) ? 0 : n;
}

function totalFreefallDisplay(totalSecs: number): string {
  if (totalSecs === 0) return '0s';
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nextLoad, setNextLoad] = useState<NextLoad | null>(null);
  const [upcomingLoads, setUpcomingLoads] = useState<NextLoad[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [standbyState, setStandbyState] = useState<StandbyState>({ isActive: false });
  const [refreshing, setRefreshing] = useState(false);
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckInStatus | null>(null);
  const [availableDropzones, setAvailableDropzones] = useState<Dropzone[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null | undefined>(undefined);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [equipmentAlerts, setEquipmentAlerts] = useState<EquipmentAlert[]>([]);
  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<Set<string>>(new Set());
  const [logbookDocId, setLogbookDocId] = useState<string | null>(null);
  const [logbookJumps, setLogbookJumps] = useState(0);
  const [logbookFallTime, setLogbookFallTime] = useState('0s');

  const { user, signOut, checkWaiverForDropzone } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const loadData = async () => {
    if (!user) return;

    try {
      const customerResult = await getCustomerData(user.uid);

      if (customerResult) {
        const userData = customerResult.data;
        const firstName = userData.firstName || '';
        const lastName = userData.lastName || '';

        let displayName = `${firstName} ${lastName}`.trim();
        if (userData.useNickname && userData.nickname) {
          displayName = userData.nickname;
        }

        setProfile({
          fullName: displayName,
          totalJumps: userData.stats?.totalJumps || 0,
        });

        setCustomerId(customerResult.customerId);
        setLogbookDocId(customerResult.docId);

        const qrValue = userData.qrCode || customerResult.customerId;
        setQrCodeValue(qrValue);

        if (!userData.qrCode && customerResult.customerId) {
          try {
            const customerDocRef = doc(db, 'customers', customerResult.docId);
            await updateDoc(customerDocRef, { qrCode: customerResult.customerId });
          } catch (e) {
            logger.error('Error saving qrCode to customer:', e);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading data:', error);
    }
  };


  const loadCheckInStatus = async () => {
    if (!user) return;
    const status = await getCurrentCheckIn(user.uid);
    setCurrentCheckIn(status);
  };

  const loadDropzones = async () => {
    const dropzones = await getAllDropzones();
    setAvailableDropzones(dropzones);
  };

  const handleCheckIn = async (dropzoneId: string, allowSwitch: boolean = false) => {
    if (!user || isCheckingIn) return;

    setIsCheckingIn(true);

    // Check if this dropzone requires a waiver the user hasn't signed yet
    const waiver = await checkWaiverForDropzone(dropzoneId);
    setIsCheckingIn(false);

    if (waiver.required && waiver.text && waiver.version) {
      const dz = availableDropzones.find((d) => d.id === dropzoneId);
      router.push({
        pathname: '/waiver',
        params: {
          dropzoneId,
          dropzoneName: waiver.dropzoneName ?? dz?.name ?? dropzoneId,
          waiverText: waiver.text,
          waiverVersion: waiver.version,
          allowSwitch: allowSwitch ? 'true' : 'false',
        },
      });
      return;
    }

    // No waiver needed — check in directly
    setIsCheckingIn(true);
    const result = await checkInToDropzone(user.uid, dropzoneId, allowSwitch);
    setIsCheckingIn(false);

    if (result.success) {
      await loadCheckInStatus();
    } else if (result.needsConfirmation && result.currentDropzone) {
      Alert.alert(
        'Switch Dropzone',
        `You are currently checked in to ${result.currentDropzone}. Do you want to switch?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', onPress: () => handleCheckIn(dropzoneId, true) },
        ]
      );
    } else {
      Alert.alert('Check-in Failed', result.error || 'Unable to check in');
    }
  };

  const handleCheckOut = async () => {
    if (!user) {
      logger.log('Check-out failed: No user');
      return;
    }

    logger.log('Check-out button pressed');
    logger.log('Current check-in:', currentCheckIn);
    logger.log('Calling checkOutFromDropzone...');

    const result = await checkOutFromDropzone(user.uid);

    logger.log('Check-out result:', result);

    if (result.success) {
      logger.log('Check-out successful, updating UI...');
      setCurrentCheckIn(null);
      setAnnouncements([]);
      await loadCheckInStatus();
      logger.log('UI updated');
    } else {
      logger.log('Check-out failed:', result.error);
      Alert.alert('Check-out Failed', result.error || 'Unable to check out');
    }
  };

  useEffect(() => {
    loadData();
    loadCheckInStatus();
    loadDropzones();

    if (!user) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const setupCheckInListener = async () => {
      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('accountId', '==', user.uid));
      const snapshot = await getDocs(q);

      if (cancelled || snapshot.empty) return;

      const customerDocRef = doc(db, 'customers', snapshot.docs[0].id);
      unsubscribe = onSnapshot(customerDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const newCheckIn = data.currentDropzone || null;

          logger.log('Listener update received:', {
            currentState: newCheckIn ? newCheckIn.dropzoneName : 'Not checked in',
            newState: newCheckIn ? newCheckIn.dropzoneName : 'Not checked in'
          });

          setCurrentCheckIn(newCheckIn);

          if (newCheckIn) {
            logger.log(`Now checked into: ${newCheckIn.dropzoneName}`);
          } else {
            logger.log('Now checked out');
          }
        }
      });
    };

    setupCheckInListener();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!currentCheckIn?.dropzoneId) {
      setWeather(null);
      return;
    }

    const weatherRef = doc(db, 'dropzones', currentCheckIn.dropzoneId, 'weather', 'current');
    const unsubscribe = onSnapshot(weatherRef, (doc) => {
      if (doc.exists()) {
        setWeather(doc.data() as WeatherData);
      } else {
        setWeather(null);
      }
    });

    return () => unsubscribe();
  }, [currentCheckIn?.dropzoneId]);

  useEffect(() => {
    if (!currentCheckIn?.dropzoneId) {
      setAnnouncements([]);
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
    });

    return () => unsubscribe();
  }, [currentCheckIn?.dropzoneId]);

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
    });

    return () => unsubscribe();
  }, [currentCheckIn?.dropzoneId]);

  useEffect(() => {
    if (!currentCheckIn?.dropzoneId) {
      setNextLoad(null);
      setUpcomingLoads([]);
      return;
    }

    const loadsRef = collection(db, 'dropzones', currentCheckIn.dropzoneId, 'loads');
    const q = query(loadsRef, where('status', '==', 'upcoming'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const loadsData: Array<NextLoad & { timeInMinutes: number }> = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          const jumpers = Array.isArray(data.jumpers) ? data.jumpers : [];
          const maxSlots = data.maxSlots || 20;
          const availableSlots = maxSlots - jumpers.length;

          const loadMasterData = Array.isArray(data.loadMasters) && data.loadMasters.length > 0
            ? data.loadMasters[0]
            : null;
          const loadMaster = loadMasterData
            ? (loadMasterData.useNickname && loadMasterData.nickname
                ? loadMasterData.nickname
                : loadMasterData.name || '')
            : '';

          const timeStr = data.time || '';
          const match = timeStr.match(/(\d+):(\d+)/);
          const timeInMinutes = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 999999;

          loadsData.push({
            id: doc.id,
            aircraft: data.aircraft || 'Unknown',
            loadNumber: data.loadNumber || 0,
            time: data.time || 'TBD',
            availableSlots,
            maxSlots,
            loadMaster,
            timeInMinutes,
          });
        });

        loadsData.sort((a, b) => a.timeInMinutes - b.timeInMinutes);

        const sorted = loadsData.map(({ timeInMinutes, ...rest }) => rest);

        if (sorted.length > 0) {
          setNextLoad(sorted[0]);
          setUpcomingLoads(sorted.slice(1, 4));
        } else {
          setNextLoad(null);
          setUpcomingLoads([]);
        }
      } else {
        setNextLoad(null);
        setUpcomingLoads([]);
      }
    });

    return () => unsubscribe();
  }, [currentCheckIn]);

  useEffect(() => {
    setDismissedAlertKeys(new Set());
  }, [user?.uid, currentCheckIn?.dropzoneId]);

  useEffect(() => {
    if (!customerId) return;
    const unsub = subscribeToEquipment(customerId, (items) => {
      const alerts: EquipmentAlert[] = [];
      const THRESHOLD = 15;
      items.forEach((eq) => {
        const rigName = `${eq.container.model} ${eq.container.series}`.trim();
        if (eq.reserveCanopy.packingExpiryDate) {
          const days = getDaysLeft(eq.reserveCanopy.packingExpiryDate);
          if (days <= THRESHOLD) {
            alerts.push({ equipmentId: eq.id!, rigName, type: 'reserve_packing', label: 'Reserve packing expires', daysLeft: days, expiryDate: eq.reserveCanopy.packingExpiryDate });
          }
        }
        if (eq.aad.expiryDate) {
          const days = getDaysLeft(eq.aad.expiryDate);
          if (days <= THRESHOLD) {
            alerts.push({ equipmentId: eq.id!, rigName, type: 'aad_expiry', label: 'AAD expires', daysLeft: days, expiryDate: eq.aad.expiryDate });
          }
        }
      });
      setEquipmentAlerts(alerts);
    });
    return unsub;
  }, [customerId]);

  useEffect(() => {
    if (!customerId || !currentCheckIn?.dropzoneId) {
      setActiveGroup(null);
      return;
    }

    const unsubscribe = subscribeToGroupsAsMember(
      currentCheckIn.dropzoneId,
      customerId,
      (groups) => {
        const active = groups.find((g) => g.isActive) || null;
        setActiveGroup(active);
      }
    );

    return () => unsubscribe();
  }, [customerId, currentCheckIn?.dropzoneId]);

  useEffect(() => {
    if (!logbookDocId) return;
    const logbookRef = collection(db, 'customers', logbookDocId, 'logbook');
    const unsub = onSnapshot(logbookRef, (snap) => {
      const entries = snap.docs.map((d) => d.data());
      const jumpNumbers = entries.map((e) => e.jumpNumber).filter((n) => n != null);
      const totalJumps = jumpNumbers.length > 0 ? Math.max(...jumpNumbers) : 0;
      const totalSecs = entries.reduce((acc, e) => acc + ffSeconds(e.freefallTime), 0);
      setLogbookJumps(totalJumps);
      setLogbookFallTime(totalFreefallDisplay(totalSecs));
    });
    return () => unsub();
  }, [logbookDocId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadCheckInStatus(), loadDropzones()]);
    setRefreshing(false);
  };

  const calculateTimeUntilBoarding = (loadTime: string): string => {
    if (!loadTime || loadTime === 'TBD') return 'TBD';

    const [hours, minutes] = loadTime.split(':').map(Number);
    const now = new Date();
    const loadDate = new Date();
    loadDate.setHours(hours, minutes, 0, 0);

    if (loadDate < now) {
      loadDate.setDate(loadDate.getDate() + 1);
    }

    const diffMs = loadDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };

  const firstName = profile?.fullName?.split(' ')[0] || 'Skydiver';

  // Normalize weather data from both old and new Firebase schemas
  const weatherDisplay = useMemo(() => {
    if (!weather) return null;

    const tempF = weather.temperatureF ?? weather.temperature;
    const tempC = weather.temperatureC ?? (tempF != null ? parseFloat(fahrenheitToCelsius(tempF)) : undefined);

    const windKmh = weather.windSpeedKmh ?? weather.windSpeed;
    const windMph = weather.windSpeedMph ?? (windKmh != null ? (windKmh * 0.621371).toFixed(1) : undefined);

    const visKm = weather.visibilityKm ?? weather.visibility;
    const visMi = weather.visibilityMi ?? (visKm != null ? (visKm * 0.621371).toFixed(1) : undefined);

    const windDir = weather.windDirectionCompass ?? weather.windDirection ?? '';
    const jumpRun = weather.jumpRunCompass ?? weather.jumpRun ?? '';
    const conditions = weather.conditions ?? '';

    return {
      temperatureFahrenheit: tempF,
      temperatureCelsius: tempC != null ? (typeof tempC === 'number' ? tempC.toFixed(1) : tempC) : undefined,
      windSpeedKmh: windKmh,
      windSpeedMph: windMph,
      visibilityKm: visKm,
      visibilityMiles: visMi,
      windDirection: windDir,
      jumpRun,
      conditions,
    };
  }, [weather]);

  const handleSignOut = async () => {
    try {
      // Check if user is currently checked in to a dropzone
      if (currentCheckIn) {
        Alert.alert(
          'Check Out Required',
          `You are currently checked in at ${currentCheckIn.dropzoneName}. Logging out will also check you out from the dropzone.`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Logout & Check Out',
              style: 'destructive',
              onPress: async () => {
                // Check out from dropzone first
                if (user) {
                  await checkOutFromDropzone(user.uid);
                }
                // Then sign out
                await signOut();
                router.replace('/(auth)/login');
              }
            }
          ]
        );
      } else {
        // Not checked in, just sign out normally
        await signOut();
        router.replace('/(auth)/login');
      }
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>Hello, <Text style={styles.userName}>{firstName}</Text></Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <Bell size={20} color="#1A1A1A" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {currentCheckIn ? (
          <View style={styles.dropzoneCard}>
            <View style={styles.dropzoneHeader}>
              <MapPin size={20} color="#4CAF50" />
              <Text style={styles.dropzoneName}>
                {currentCheckIn.dropzoneName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckOut}
            >
              <LogOut size={16} color="#FFFFFF" />
              <Text style={styles.checkoutButtonText}>Check Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.dropzoneCardNotCheckedIn}
            onPress={() => router.push('/select-dropzone')}
          >
            <View style={styles.dropzoneHeader}>
              <LogIn size={20} color="#9B7EDE" />
              <Text style={styles.dropzoneNameNotCheckedIn}>
                Check in to a dropzone
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {currentCheckIn && equipmentAlerts.filter(a => !dismissedAlertKeys.has(`${a.equipmentId}-${a.type}`)).length > 0 && (
          <View style={styles.equipmentAlertsSection}>
            {equipmentAlerts
              .filter(a => !dismissedAlertKeys.has(`${a.equipmentId}-${a.type}`))
              .map((alert) => {
                const alertKey = `${alert.equipmentId}-${alert.type}`;
                const when = alert.daysLeft <= 0 ? 'today' : alert.daysLeft === 1 ? 'tomorrow' : `in ${alert.daysLeft} days`;
                const formattedDate = (() => {
                  try {
                    return new Date(alert.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  } catch {
                    return alert.expiryDate;
                  }
                })();
                const isExpired = alert.daysLeft <= 0;
                return (
                  <TouchableOpacity
                    key={alertKey}
                    style={[styles.equipmentAlertCard, isExpired && styles.equipmentAlertCardExpired]}
                    onPress={() => router.push({ pathname: '/equipment-view', params: { id: alert.equipmentId } })}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.equipmentAlertIcon, isExpired && styles.equipmentAlertIconExpired]}>
                      <AlertTriangle size={18} color={isExpired ? '#991B1B' : '#92400E'} />
                    </View>
                    <View style={styles.equipmentAlertBody}>
                      <Text style={[styles.equipmentAlertTitle, isExpired && styles.equipmentAlertTitleExpired]}>{alert.rigName}</Text>
                      <Text style={[styles.equipmentAlertMessage, isExpired && styles.equipmentAlertMessageExpired]}>
                        {alert.type === 'reserve_packing' && alert.daysLeft <= 0
                          ? `The reserve canopy has expired on ${formattedDate}. Give it a fresh repack before it refuses to jump with you.`
                          : `${alert.label} ${when}`}
                      </Text>
                      {!isExpired && <Text style={styles.equipmentAlertDate}>{formattedDate}</Text>}
                    </View>
                    <TouchableOpacity
                      style={[styles.equipmentAlertClose, isExpired && styles.equipmentAlertCloseExpired]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setDismissedAlertKeys(prev => new Set([...prev, alertKey]));
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={16} color={isExpired ? '#991B1B' : '#92400E'} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
          </View>
        )}

        {(announcements.length > 0 || standbyState.isActive) && (
          <View style={styles.announcementsSection}>
            {standbyState.isActive && (
              <View style={styles.standbyCard}>
                <View style={styles.standbyIconCircle}>
                  <Clock size={18} color="#D97706" />
                </View>
                <View style={styles.announcementCardContent}>
                  <Text style={styles.announcementCardTitle}>Standby Mode Active</Text>
                  <Text style={styles.announcementCardMessage}>
                    Operations are currently on standby. Load timers are paused.
                  </Text>
                  {standbyState.activatedAt && (
                    <Text style={styles.announcementCardTime}>
                      Since {(() => {
                        try {
                          const date = standbyState.activatedAt.toDate ?
                            standbyState.activatedAt.toDate() :
                            new Date(standbyState.activatedAt);
                          return date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                        } catch (e) {
                          return '';
                        }
                      })()}
                    </Text>
                  )}
                </View>
                <View style={styles.standbyBadge}>
                  <Text style={styles.standbyBadgeText}>Live</Text>
                </View>
              </View>
            )}
            {announcements.map((announcement) => {
              const isHigh = announcement.priority === 'high';
              const isMed = announcement.priority === 'medium';
              const cardBg = isHigh ? '#FEF0EE' : isMed ? '#FFF4E8' : '#FEF0EE';
              const iconBg = isHigh ? '#FDDDD8' : isMed ? '#FDDCAA' : '#FDDDD8';
              const iconColor = isHigh ? '#E05848' : isMed ? '#D97706' : '#E05848';
              const IconComponent = isHigh ? AlertTriangle : isMed ? Wind : AlertTriangle;
              return (
                <View key={announcement.id} style={[styles.announcementCard, { backgroundColor: cardBg }]}>
                  <View style={[styles.announcementIconCircle, { backgroundColor: iconBg }]}>
                    <IconComponent size={14} color={iconColor} />
                  </View>
                  <Text style={styles.announcementCardTitle}>{announcement.title || announcement.message}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.nextLoadCard}>
          <View style={styles.nextLoadHeader}>
            <Text style={styles.nextLoadTitle}>Next Load</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/loads')}
            >
              <Plus size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {nextLoad ? (
            <>
              {(() => {
                const mins = calculateMinutesUntilDeparture(nextLoad.time);
                const pct = Math.min(100, Math.max(0, (mins / 20) * 100));
                const fillColor = mins <= 1 ? 'rgba(187,247,208,0.7)' : mins <= 15 ? 'rgba(253,230,138,0.7)' : 'rgba(191,219,254,0.6)';
                const textColor = mins <= 1 ? '#2E7D32' : mins <= 15 ? '#C47A1E' : '#3B6FBE';
                const formattedTime = nextLoad.time !== 'TBD' ? nextLoad.time.replace(/^(\d+):(\d+)$/, (_, h, m) => {
                  const hour = parseInt(h);
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                  return `${displayHour}:${m} ${ampm}`;
                }) : 'TBD';
                const countdownLabel = mins <= 1 ? 'Taking Off' : `${calculateTimeUntilBoarding(nextLoad.time)} until departure`;
                return (
              <View style={styles.nextLoadPrimary}>
                <View style={StyleSheet.absoluteFillObject}>
                  <View style={[styles.nextLoadBgFill, { width: `${pct}%`, backgroundColor: fillColor }]} />
                </View>
                <View style={styles.nextLoadPrimaryContent}>
                  <View style={styles.nextLoadNameRow}>
                    <Text style={[styles.nextLoadAircraft, { color: textColor }]}>{formattedTime}</Text>
                    <Text style={styles.nextLoadNumber}>#{nextLoad.loadNumber}</Text>
                  </View>
                  <View style={styles.nextLoadInfoPills}>
                    <View style={styles.nextLoadPill}>
                      <Users size={14} color={textColor} strokeWidth={2.2} />
                      <Text style={[styles.nextLoadPillText, { color: textColor }]}>{nextLoad.availableSlots}</Text>
                    </View>
                    <View style={styles.nextLoadPill}>
                      <Text style={[styles.nextLoadCountdown, { color: textColor }]}>{countdownLabel}</Text>
                    </View>
                  </View>
                  {nextLoad.loadMaster ? (
                    <View style={styles.nextLoadMasterRow}>
                      <View style={styles.nextLoadMasterAvatar}>
                        <Text style={styles.nextLoadMasterAvatarText}>
                          {nextLoad.loadMaster.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.nextLoadMasterName}>{nextLoad.loadMaster}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
                );
              })()}

              {upcomingLoads.length > 0 && (
                <View style={styles.nextLoadUpcoming}>
                  {upcomingLoads.map((load, index) => (
                    <View
                      key={load.id}
                      style={[
                        styles.nextLoadUpcomingPill,
                        index === 1 && styles.nextLoadUpcomingPillHighlight,
                      ]}
                    >
                      <Text style={styles.nextLoadUpcomingPillText}>{load.aircraft}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.viewAllLoadsBtn}
                onPress={() => router.push('/loads')}
              >
                <Text style={styles.viewAllLoadsBtnText}>View All Loads</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.nextLoadEmpty}>
              <Text style={styles.nextLoadEmptyText}>No upcoming loads</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.groupCard}
          onPress={() => router.push('/(tabs)/groups')}
          activeOpacity={0.85}
        >
          <Text style={styles.groupCardHeading}>{activeGroup ? activeGroup.name : 'Group'}</Text>
          <View style={styles.groupCardInner}>
            {activeGroup ? (
              <>
                <Text style={styles.groupCardActiveLabel}>Active Group</Text>
                <Text style={styles.groupMemberCount}>
                  {activeGroup.members?.length ?? 0} member{(activeGroup.members?.length ?? 0) !== 1 ? 's' : ''}
                </Text>
              </>
            ) : (
              <Text style={styles.groupCardNoActive}>No Active Group</Text>
            )}
            <View style={styles.groupQrWrapper}>
              {qrCodeValue ? (
            <QRCode value={qrCodeValue} size={90} />
              ) : (
                <View style={styles.groupQrPlaceholder} />
              )}
            </View>
            <Text style={styles.groupCardScanLabel}>Scan To Join The Group</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.progressCard} onPress={() => router.push('/logbook')} activeOpacity={0.8}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <View style={styles.progressPlusBtn}>
              <Plus size={18} color="#1A1A1A" strokeWidth={2} />
            </View>
          </View>
          <View style={styles.progressStatsRow}>
            <View style={[styles.progressStatCell, { backgroundColor: '#EEF2FF' }]}>
              <View>
                <Text style={styles.progressStatNumber}>{logbookJumps}</Text>
                <Text style={styles.progressStatLabel}>Total jumps</Text>
              </View>
              <View style={styles.progressStatIconBlue}>
                <Plane size={16} color="#3B82F6" strokeWidth={1.8} />
              </View>
            </View>
            <View style={[styles.progressStatCell, { backgroundColor: '#F3F4F6' }]}>
              <View>
                <Text style={styles.progressStatNumber}>{logbookFallTime}</Text>
                <Text style={styles.progressStatLabel}>Full time</Text>
              </View>
              <View style={styles.progressStatIconOrange}>
                <Clock size={16} color="#F97316" strokeWidth={1.8} />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.weatherCard}>
          {weather && weatherDisplay ? (
            <View style={styles.weatherRow}>
              <View style={styles.weatherIconWrap}>
                <Text style={styles.weatherEmoji}>
                  {weatherDisplay.conditions?.toLowerCase().includes('partly') ? '🌤️' :
                   weatherDisplay.conditions?.toLowerCase().includes('cloud') ? '⛅' :
                   weatherDisplay.conditions?.toLowerCase().includes('rain') ? '🌧️' :
                   weatherDisplay.conditions?.toLowerCase().includes('storm') ? '⛈️' :
                   weatherDisplay.conditions?.toLowerCase().includes('snow') ? '🌨️' :
                   weatherDisplay.conditions?.toLowerCase().includes('fog') ? '🌫️' : '☀️'}
                </Text>
              </View>
              <View style={styles.weatherDetails}>
                <View style={styles.weatherTopRow}>
                  <Text style={styles.weatherConditions}>{weatherDisplay.conditions || 'Unknown'}</Text>
                  <Text style={styles.weatherTemp}>
                    {weatherDisplay.temperatureFahrenheit != null ? `${weatherDisplay.temperatureFahrenheit}°F` : ''}
                    {weatherDisplay.temperatureCelsius != null ? ` / ${weatherDisplay.temperatureCelsius}°C` : ''}
                  </Text>
                </View>
                <View style={styles.weatherBottomRow}>
                  <Text style={styles.weatherSub}>
                    {weatherDisplay.windSpeedKmh != null ? `${weatherDisplay.windSpeedKmh}kmh` : ''}
                    {weatherDisplay.windSpeedMph != null ? ` / ${weatherDisplay.windSpeedMph}mph` : ''}
                    {weatherDisplay.windDirection ? ` ${weatherDisplay.windDirection}` : ''}
                  </Text>
                  <Text style={styles.weatherSub}>
                    Jump Run: {weatherDisplay.jumpRun || 'N/A'}
                    {weather.jumpRunNote ? ` (${weather.jumpRunNote})` : ''}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.weatherRow}>
              <View style={styles.weatherIconWrap}>
                <Text style={styles.weatherEmoji}>🌤️</Text>
              </View>
              <Text style={styles.weatherNoData}>No weather data available</Text>
            </View>
          )}
        </View>

        <View style={styles.eventsCard}>
          <View style={styles.eventsHeader}>
            <View style={styles.eventsBadge}>
              <Text style={styles.eventsBadgeText}>2</Text>
            </View>
          </View>
          <Text style={styles.eventsTitle}>Upcoming Camps</Text>
          <TouchableOpacity style={styles.exploreButton}>
            <Text style={styles.exploreButtonText}>Explore</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingRow: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '300',
    color: '#1A1A1A',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dropzoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropzoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropzoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  checkoutButton: {
    backgroundColor: '#9B7EDE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dropzoneCardNotCheckedIn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropzoneNameNotCheckedIn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9B7EDE',
    flex: 1,
  },
  announcementsSection: {
    gap: 10,
    marginBottom: 16,
  },
  announcementCard: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  announcementIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  announcementCardContent: {
    flex: 1,
    gap: 3,
  },
  announcementCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  announcementCardMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  announcementCardTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  announcementPriorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  announcementPriorityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  standbyCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  standbyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  standbyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FDE68A',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  standbyBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
  },
  nextLoadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  nextLoadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  nextLoadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextLoadPrimary: {
    backgroundColor: '#EBEBED',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  nextLoadBgFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#BFCFE8',
    borderRadius: 0,
  },
  nextLoadPrimaryContent: {
    padding: 16,
    gap: 12,
  },
  nextLoadNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextLoadAircraft: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  nextLoadCountdown: {
    fontSize: 15,
    fontWeight: '400',
    color: '#374151',
  },
  nextLoadNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  nextLoadInfoPills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  nextLoadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  nextLoadPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  nextLoadPillTimeBlue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  nextLoadPillDot: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  nextLoadMasterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  nextLoadMasterAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9D4C8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextLoadMasterAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9B4D3A',
  },
  nextLoadMasterName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  nextLoadUpcoming: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    justifyContent: 'center',
  },
  nextLoadUpcomingPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  nextLoadUpcomingPillHighlight: {
    backgroundColor: '#E8F4FD',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderStyle: 'dashed',
  },
  nextLoadUpcomingPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  viewAllLoadsBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllLoadsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  nextLoadEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  nextLoadEmptyText: {
    fontSize: 14,
    color: '#999',
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#B8D4E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  groupCardHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  groupCardInner: {
    borderWidth: 1,
    borderColor: '#E5EBF0',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  groupCardActiveLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  groupCardNoActive: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  groupMemberCount: {
    fontSize: 12,
    color: '#6B8299',
    textAlign: 'center',
  },
  groupQrWrapper: {
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  groupQrPlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  groupCardScanLabel: {
    fontSize: 12,
    color: '#9AAAB8',
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  progressPlusBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  progressStatCell: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStatNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 1,
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  progressStatIconBlue: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStatIconOrange: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    paddingRight: 24,
    marginBottom: 16,
    shadowColor: '#B8D4E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  weatherIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EBF4FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherEmoji: {
    fontSize: 30,
  },
  weatherDetails: {
    flex: 1,
    gap: 6,
  },
  weatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherConditions: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2B3C',
  },
  weatherTemp: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A2B3C',
  },
  weatherSub: {
    fontSize: 13,
    color: '#6B8299',
  },
  weatherNoData: {
    fontSize: 14,
    color: '#6B8299',
    fontStyle: 'italic',
  },
  eventsCard: {
    borderRadius: 10,
    padding: 20,
    marginBottom: 32,
    minHeight: 150,
    backgroundColor: '#2D3E50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventsBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  eventsBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  exploreButton: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  equipmentAlertsSection: {
    gap: 10,
    marginBottom: 16,
  },
  equipmentAlertCard: {
    backgroundColor: '#FAFFE7',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  equipmentAlertIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipmentAlertBody: {
    flex: 1,
    gap: 2,
  },
  equipmentAlertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78350F',
  },
  equipmentAlertMessage: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  equipmentAlertDate: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  equipmentAlertClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  equipmentAlertCardExpired: {
    backgroundColor: '#FEF2F2',
    shadowColor: '#991B1B',
  },
  equipmentAlertIconExpired: {
    backgroundColor: '#FECACA',
  },
  equipmentAlertTitleExpired: {
    color: '#7F1D1D',
  },
  equipmentAlertMessageExpired: {
    color: '#991B1B',
  },
  equipmentAlertDateExpired: {
    color: '#B91C1C',
  },
  equipmentAlertCloseExpired: {
    backgroundColor: '#FECACA',
  },
});
