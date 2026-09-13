import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Users, Search, Star, Check, QrCode, X } from 'lucide-react-native';
import { CameraView, Camera } from 'expo-camera';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentCheckIn } from '@/lib/dropzoneService';
import { searchCustomers, createGroup, getCustomerByQrCode, sendGroupInvitation, isCustomerCheckedIn, type Customer, type GroupMember } from '@/lib/groupsService';
import { notifyGroupInvitation } from '@/lib/notificationsService';
import { getCustomerData } from '@/lib/customerCache';
import Header from '@/components/Header';
import { logger } from '@/lib/logger';

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Map<string, Customer>>(new Map());
  const [searching, setSearching] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dropzoneId, setDropzoneId] = useState<string | null>(null);
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(null);
  const [currentCustomerProfile, setCurrentCustomerProfile] = useState<GroupMember | null>(null);
  const [currentActorName, setCurrentActorName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      setInitLoading(true);
      setDropzoneId(null);
      setCurrentCustomerId(null);
      setCurrentCustomerProfile(null);
      setError(null);

      const init = async () => {
        try {
          const [checkIn, customerResult] = await Promise.all([
            getCurrentCheckIn(user.uid),
            getCustomerData(user.uid),
          ]);

          if (checkIn?.dropzoneId) setDropzoneId(checkIn.dropzoneId);
          if (customerResult) {
            const d = customerResult.data;
            const resolvedCustomerId = d.customerId || customerResult.customerId || customerResult.docId;
            setCurrentCustomerId(resolvedCustomerId);
            setCurrentCustomerProfile({
              customerId: resolvedCustomerId,
              firstName: d.firstName || '',
              lastName: d.lastName || '',
              nickname: d.nickname || '',
              useNickname: d.useNickname || false,
              profileImage: d.profileImage || d.photoURL || '',
            });
            const name = (d.useNickname && d.nickname)
              ? d.nickname
              : `${d.firstName || ''} ${d.lastName || ''}`.trim();
            setCurrentActorName(name || 'Someone');
          }
        } catch (err) {
          logger.error('Error initializing:', err);
        } finally {
          setInitLoading(false);
        }
      };
      init();
    }, [user])
  );

  const runSearch = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchCustomers(trimmed, currentCustomerId, dropzoneId);
      setSearchResults(results);
    } catch (err) {
      logger.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [currentCustomerId, dropzoneId]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(text), 350);
  };

  const toggleMember = useCallback((customer: Customer) => {
    setSelectedMembers((prev) => {
      const next = new Map(prev);
      if (next.has(customer.customerId)) {
        next.delete(customer.customerId);
      } else {
        next.set(customer.customerId, customer);
      }
      return next;
    });
  }, []);

  const getDisplayName = (customer: Customer) => {
    if (customer.useNickname && customer.nickname) return customer.nickname;
    return `${customer.firstName} ${customer.lastName}`.trim() || 'Unknown';
  };

  const getInitials = (customer: Customer) => {
    if (customer.useNickname && customer.nickname) {
      return customer.nickname.slice(0, 2).toUpperCase();
    }
    const first = customer.firstName?.[0] || '';
    const last = customer.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '??';
  };

  const handleOpenScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setScanFeedback('Camera permission denied.');
      return;
    }
    setScanFeedback(null);
    setShowScanner(true);
  };

  const handleQrScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanning) return;
    setScanning(true);
    try {
      const customer = await getCustomerByQrCode(data);
      if (!customer) {
        setScanFeedback('No customer found for this QR code.');
        return;
      }
      if (customer.customerId === currentCustomerId) {
        setScanFeedback('You cannot add yourself.');
        return;
      }
      if (dropzoneId) {
        const checkedIn = await isCustomerCheckedIn(dropzoneId, customer.customerId);
        if (!checkedIn) {
          setScanFeedback(`${getDisplayName(customer)} is not checked in at this dropzone.`);
          return;
        }
      }
      if (selectedMembers.has(customer.customerId)) {
        setScanFeedback(`${getDisplayName(customer)} is already added.`);
        setShowScanner(false);
        return;
      }
      setSelectedMembers((prev) => {
        const next = new Map(prev);
        next.set(customer.customerId, customer);
        return next;
      });
      setScanFeedback(`${getDisplayName(customer)} added!`);
      setShowScanner(false);
    } catch (e) {
      logger.error('QR scan error:', e);
      setScanFeedback('Error reading QR code.');
    } finally {
      setScanning(false);
    }
  }, [scanning, currentCustomerId, selectedMembers, dropzoneId]);

  const handleSave = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name.');
      return;
    }
    if (selectedMembers.size === 0) {
      setError('Please add at least one member.');
      return;
    }
    if (!dropzoneId) {
      setError('You must be checked in to a dropzone to create a group.');
      return;
    }
    if (!currentCustomerId || !currentCustomerProfile) {
      setError('Unable to load your profile. Please try again.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const result = await createGroup(
        groupName.trim(),
        [currentCustomerProfile],
        isFavorite,
        currentCustomerId,
        dropzoneId
      );

      if (result.success && result.groupId) {
        const inviteeList = Array.from(selectedMembers.values());
        for (const c of inviteeList) {
          const inv = await sendGroupInvitation(
            result.groupId,
            groupName.trim(),
            dropzoneId,
            currentCustomerId,
            currentActorName,
            c.customerId
          );
          if (inv.success && inv.invitation) {
            notifyGroupInvitation(inv.invitation, dropzoneId)
              .catch((e) => logger.error('Notify invite error:', e));
          }
        }
        router.back();
      } else {
        setError(result.error || 'Failed to create group.');
      }
    } catch (err) {
      logger.error('Error saving group:', err);
      setError('Failed to create group.');
    } finally {
      setSaving(false);
    }
  };

  const selectedList = Array.from(selectedMembers.values());
  const hasTyped = searchQuery.trim().length >= 2;

  if (initLoading) {
    return (
      <View style={styles.container}>
        <Header title="Create Group" showBack={true} showNotifications={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Create Group" showBack={true} showNotifications={true} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.groupIconWrap}>
              <View style={styles.groupIconCircle}>
                <Users size={36} color="#6B7280" strokeWidth={1.5} />
              </View>
            </View>

            <View style={styles.nameRow}>
              <TextInput
                style={styles.nameInput}
                placeholder="Group Name"
                placeholderTextColor="#B0B0B0"
                value={groupName}
                onChangeText={(t) => { setGroupName(t); setError(null); }}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.favoriteButton} onPress={() => setIsFavorite((v) => !v)}>
                <Star
                  size={22}
                  color={isFavorite ? '#9B7EDE' : '#CBD5E1'}
                  fill={isFavorite ? '#9B7EDE' : 'transparent'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search Member"
                placeholderTextColor="#B0B0B0"
                value={searchQuery}
                onChangeText={handleSearchChange}
                returnKeyType="search"
              />
              {searching
                ? <ActivityIndicator size="small" color="#9B7EDE" />
                : <Search size={20} color="#B0B0B0" />
              }
              <View style={styles.searchDivider} />
              <TouchableOpacity onPress={handleOpenScanner} style={styles.qrButton}>
                <QrCode size={20} color="#9B7EDE" />
              </TouchableOpacity>
            </View>

            {scanFeedback && (
              <Text style={[styles.scanFeedback, scanFeedback.includes('added!') && styles.scanFeedbackSuccess]}>
                {scanFeedback}
              </Text>
            )}

            {hasTyped && !searching && searchResults.length === 0 && (
              <Text style={styles.noResults}>No members found</Text>
            )}

            {searchResults.map((item) => {
              const isSelected = selectedMembers.has(item.customerId);
              return (
                <TouchableOpacity
                  key={item.customerId}
                  style={styles.customerRow}
                  onPress={() => toggleMember(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{getInitials(item)}</Text>
                  </View>
                  <Text style={styles.customerName}>{getDisplayName(item)}</Text>
                  <Star
                    size={22}
                    color={isSelected ? '#9B7EDE' : '#CBD5E1'}
                    fill={isSelected ? '#9B7EDE' : 'transparent'}
                  />
                </TouchableOpacity>
              );
            })}

            {selectedList.length > 0 && (
              <>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>Pending Invites</Text>
                {selectedList.map((item) => (
                  <TouchableOpacity
                    key={item.customerId}
                    style={styles.memberRow}
                    onPress={() => toggleMember(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatarCircle, styles.avatarSmall]}>
                      <Text style={styles.avatarText}>{getInitials(item)}</Text>
                    </View>
                    <Text style={styles.customerName}>{getDisplayName(item)}</Text>
                    <View style={styles.checkBox}>
                      <Check size={14} color="#9B7EDE" strokeWidth={2.5} />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.saveButtonText}>Create & Send Invites</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showScanner} animationType="slide" statusBarTranslucent>
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanning ? undefined : handleQrScanned}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan Member QR Code</Text>
              <TouchableOpacity onPress={() => { setShowScanner(false); setScanFeedback(null); }} style={styles.closeButton}>
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.scannerFrame} />
            {scanFeedback && !scanFeedback.includes('added!') ? (
              <View style={styles.scannerErrorBanner}>
                <Text style={styles.scannerErrorText}>{scanFeedback}</Text>
                <TouchableOpacity onPress={() => setScanFeedback(null)} style={styles.scannerErrorDismiss}>
                  <Text style={styles.scannerErrorDismissText}>Tap to scan again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.scannerHint}>Point the camera at a member's QR code</Text>
            )}
            {scanning && <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 16 }} />}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C8DEE6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  groupIconWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  groupIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  innerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResults: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    paddingVertical: 16,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  customerName: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  starButton: {
    padding: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkButton: {
    padding: 2,
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9B7EDE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF5A5F',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#9B7EDE',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#9B7EDE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  searchDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  qrButton: {
    padding: 2,
  },
  scanFeedback: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  scanFeedbackSuccess: {
    color: '#10B981',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scannerHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 220,
    height: 220,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  scannerHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  scannerErrorBanner: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginHorizontal: 20,
    gap: 8,
  },
  scannerErrorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  scannerErrorDismiss: {
    marginTop: 2,
  },
  scannerErrorDismissText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
  },
});
