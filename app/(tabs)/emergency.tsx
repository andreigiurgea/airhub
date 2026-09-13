import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Phone, MapPin, ThumbsUp, Navigation, TriangleAlert as AlertTriangle, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sendDropzoneNotification, getCurrentLocation, type EmergencyType, type EmergencyLocation } from '@/lib/emergencyService';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import Header from '@/components/Header';

interface CustomerInfo {
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
}

export default function Emergency() {
  const { user } = useAuth();
  const [sending, setSending] = useState<EmergencyType | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<{ dropzoneId: string; dropzoneName: string } | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      try {
        const customerSnap = await getDocs(query(collection(db, 'customers'), where('accountId', '==', user.uid)));
        if (customerSnap.empty) return;

        const customerDocRef = doc(db, 'customers', customerSnap.docs[0].id);

        unsubscribe = onSnapshot(customerDocRef, (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data();

          const currentDropzone = data.currentDropzone || null;
          setCheckInStatus(
            currentDropzone?.dropzoneId
              ? { dropzoneId: currentDropzone.dropzoneId, dropzoneName: currentDropzone.dropzoneName }
              : null
          );

          setCustomerInfo({
            customerId: data.customerId,
            customerName: `${data.firstName} ${data.lastName}`.trim() || data.email || user.email || 'Unknown',
            email: data.email || user.email || '',
            phone: data.phone || '',
          });
        });
      } catch (e) {}
    };

    setup();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user]);

  const sendNotification = async (type: EmergencyType, afterSend?: () => void) => {
    if (!user) {
      Alert.alert('Not signed in', 'You must be signed in to use emergency features.');
      return;
    }

    if (!checkInStatus) {
      Alert.alert('Not checked in', 'You are not currently checked in to a dropzone. Your alert cannot be sent.');
      return;
    }

    setSending(type);
    try {
      const location: EmergencyLocation | null = await getCurrentLocation();

      await sendDropzoneNotification(
        checkInStatus.dropzoneId,
        type,
        customerInfo?.customerId || user.uid,
        customerInfo?.customerName || user.email || 'Unknown',
        customerInfo?.email || user.email || '',
        location,
        customerInfo?.phone || ''
      );

      if (afterSend) afterSend();
    } catch (e) {
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    } finally {
      setSending(null);
    }
  };

  const handleNeedHelp = () =>
    sendNotification('need_help', () =>
      Alert.alert('Alert Sent', 'The dropzone has been notified that you need help.')
    );

  const handleAllGood = () =>
    sendNotification('all_good', () =>
      Alert.alert('Status Sent', `${checkInStatus?.dropzoneName ?? 'Your dropzone'} has been notified you are all good and walking back.`)
    );

  const handleNeedRide = () =>
    sendNotification('need_ride', () =>
      Alert.alert('Ride Request Sent', `${checkInStatus?.dropzoneName ?? 'Your dropzone'} has been notified you need a ride back.`)
    );

  const handleCallEmergency = () => {
    Alert.alert(
      'Call Emergency Services',
      'Do you want to call 911? The dropzone will also be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 911',
          style: 'destructive',
          onPress: () => {
            sendNotification('call_emergency');
            Linking.openURL('tel:911');
          },
        },
      ]
    );
  };

  const isSending = (type: EmergencyType) => sending === type;

  const actions: { icon: any; label: string; type: EmergencyType; onPress: () => void; danger?: boolean }[] = [
    { icon: Navigation, label: 'I need help', type: 'need_help', onPress: handleNeedHelp, danger: true },
    { icon: ThumbsUp, label: 'All good. Walking back', type: 'all_good', onPress: handleAllGood },
    { icon: MapPin, label: 'I need a ride back', type: 'need_ride', onPress: handleNeedRide },
    { icon: Phone, label: 'Call emergency', type: 'call_emergency', onPress: handleCallEmergency, danger: true },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Emergency" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
          <View style={styles.warningIconWrap}>
            <AlertTriangle size={20} color="#B45309" />
          </View>
          <Text style={styles.warningText}>
            Use these options if you need assistance after landing away from the dropzone.
          </Text>
        </View>

        {!checkInStatus && (
          <View style={styles.notCheckedInBadge}>
            <AlertTriangle size={14} color="#B45309" />
            <Text style={styles.notCheckedInText}>Not checked in — alerts cannot be sent</Text>
          </View>
        )}

        <View style={styles.actionsCard}>
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isLast = index === actions.length - 1;
            const loading = isSending(action.type);
            return (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionRow, !isLast && styles.actionRowBorder, loading && styles.actionRowLoading]}
                onPress={action.onPress}
                activeOpacity={0.7}
                disabled={loading || !checkInStatus}
              >
                <View style={styles.actionIconWrap}>
                  {loading ? (
                    <ActivityIndicator color="#6B7280" size="small" />
                  ) : (
                    <Icon size={20} color={!checkInStatus ? '#9CA3AF' : '#4B5563'} />
                  )}
                </View>
                <Text style={[styles.actionLabel, !checkInStatus && styles.actionLabelDisabled]}>
                  {loading ? 'Sending...' : action.label}
                </Text>
                {!loading && <ChevronRight size={18} color="#9CA3AF" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.footerNote}>
          Your GPS coordinates and a Google Maps link will be included with every alert.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  warningIconWrap: {
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 21,
    fontWeight: '500',
  },
  notCheckedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  notCheckedInText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionRowLoading: {
    opacity: 0.7,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconWrapDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  actionLabelDisabled: {
    color: '#9CA3AF',
  },
  actionLabelDanger: {
    color: '#DC2626',
  },
  footerNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
