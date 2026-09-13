import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Plane, Clock, MapPin, Calendar, Tag, User, ChevronRight, Search, X, BookOpen, Wind, PenLine, Check, CircleAlert as AlertCircle } from 'lucide-react-native';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { logger } from '@/lib/logger';
import { getCustomerData } from '@/lib/customerCache';
import { getCurrentCheckIn } from '@/lib/dropzoneService';
import { sendSignatureRequest } from '@/lib/notificationsService';

interface LogbookEntry {
  id: string;
  jumpNumber: number | null;
  date: string;
  dropzoneId?: string;
  dropzoneName: string;
  aircraft?: string;
  exitAltitude?: string;
  deploymentAltitude?: string;
  freefallTime?: number | string | null;
  discipline?: string;
  equipment?: string;
  instructor?: string;
  notes?: string;
  weather?: string;
  jumpType?: string;
  status?: 'draft' | 'pending_signature' | 'signed';
  signedBy?: string;
  signedByLicense?: string;
  signedAt?: string;
  createdAt: any;
  updatedAt?: any;
}

interface CustomerOption {
  docId: string;
  customerId: string;
  displayName: string;
  license: string;
  accountId: string;
}

const DISCIPLINES = [
  'AFF',
  'Fun Jumpers',
  'Fun Jump',
  'Coaching',
  'Tandem',
  'Wingsuit',
  'Freefly',
  'Formation',
  'Canopy Piloting',
  'Other',
];

const SORT_OPTIONS = ['Newest', 'Oldest', 'Jump #'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

function ffSeconds(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function formatFF(val: number | string | null | undefined): string {
  const n = ffSeconds(val);
  if (n === 0) return '—';
  if (n < 60) return `${n}s`;
  const m = Math.floor(n / 60);
  const s = n % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function totalFreefallDisplay(entries: LogbookEntry[]): string {
  const total = entries.reduce((acc, e) => acc + ffSeconds(e.freefallTime), 0);
  if (total === 0) return '0s';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

function disciplineColor(d: string): string {
  const map: Record<string, string> = {
    AFF: '#3B82F6',
    'Fun Jumpers': '#10B981',
    'Fun Jump': '#10B981',
    Coaching: '#F59E0B',
    Tandem: '#64748B',
    Wingsuit: '#EF4444',
    Freefly: '#06B6D4',
    Formation: '#EC4899',
    'Canopy Piloting': '#F97316',
  };
  return map[d] || '#6B7280';
}

function statusPill(entry: LogbookEntry) {
  if (entry.status === 'signed') {
    return (
      <View style={styles.signedPill}>
        <Check size={11} color="#16A34A" strokeWidth={2.5} />
        <Text style={styles.signedPillText}>Signed</Text>
      </View>
    );
  }
  if (entry.status === 'pending_signature') {
    return (
      <View style={styles.pendingPill}>
        <Clock size={11} color="#F59E0B" strokeWidth={2.5} />
        <Text style={styles.pendingPillText}>Pending</Text>
      </View>
    );
  }
  return null;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowLeft}>
        {icon}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue} numberOfLines={2}>{String(value)}</Text>
    </View>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formField}>
      <View style={styles.formLabelRow}>
        <Text style={styles.formLabel}>{label}</Text>
        {hint ? <Text style={styles.formHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function LogbookScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerDocId, setCustomerDocId] = useState<string | null>(null);
  const [myCustomerId, setMyCustomerId] = useState<string | null>(null);
  const [myName, setMyName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('Newest');
  const [searchText, setSearchText] = useState('');
  const [checkedInDropzone, setCheckedInDropzone] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Signature flow
  const [signingEntry, setSigningEntry] = useState<LogbookEntry | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [sendingSignature, setSendingSignature] = useState<string | null>(null); // customerId being sent to

  const [form, setForm] = useState({
    jumpNumber: '',
    date: new Date().toISOString().split('T')[0],
    dropzoneName: '',
    freefallDelay: '',
    equipment: '',
    aircraft: '',
    exitAltitude: '',
    deploymentAltitude: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const result = await getCustomerData(user.uid);
      if (result) {
        setCustomerDocId(result.docId);
        setMyCustomerId(result.customerId);
        const d = result.data;
        const name = (d?.useNickname && d?.nickname)
          ? d.nickname
          : `${d?.firstName || ''} ${d?.lastName || ''}`.trim();
        setMyName(name);
      }
      const checkIn = await getCurrentCheckIn(user.uid);
      if (checkIn) {
        setCheckedInDropzone({ id: checkIn.dropzoneId, name: checkIn.dropzoneName });
        setForm((f) => ({ ...f, dropzoneName: checkIn.dropzoneName }));
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!customerDocId) return;
    setLoading(true);
    const logbookRef = collection(db, 'customers', customerDocId, 'logbook');
    const q = query(logbookRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: LogbookEntry[] = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as LogbookEntry)
        );
        setEntries(items);
        setLoading(false);
      },
      (err) => {
        logger.error('Logbook listener error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [customerDocId]);

  // Load all customers for signer picker
  const loadCustomers = async (searchQuery: string) => {
    setCustomersLoading(true);
    try {
      const snap = await getDocs(collection(db, 'customers'));
      const list: CustomerOption[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.customerId === myCustomerId) return; // exclude self
        const first = data.firstName || '';
        const last = data.lastName || '';
        const nick = data.useNickname && data.nickname ? data.nickname : '';
        const displayName = nick || `${first} ${last}`.trim() || data.customerId;
        const license = data.license || '';
        if (
          !searchQuery ||
          displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          license.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          list.push({
            docId: d.id,
            customerId: data.customerId,
            displayName,
            license,
            accountId: data.accountId || '',
          });
        }
      });
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setCustomers(list);
    } catch (err) {
      logger.error('Error loading customers:', err);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (signingEntry) {
      loadCustomers(customerSearch);
    }
  }, [signingEntry, customerSearch]);

  const handleSendSignatureRequest = async (signer: CustomerOption) => {
    if (!customerDocId || !myCustomerId || !signingEntry) return;
    setSendingSignature(signer.customerId);
    try {
      // Mark entry as pending_signature
      await updateDoc(doc(db, 'customers', customerDocId, 'logbook', signingEntry.id), {
        status: 'pending_signature',
      });

      // Send notification to signer
      await sendSignatureRequest({
        signerCustomerId: signer.customerId,
        requesterCustomerId: myCustomerId,
        requesterCustomerDocId: customerDocId,
        requesterName: myName,
        logbookEntryId: signingEntry.id,
        jumpDate: signingEntry.date || '',
        dropzoneName: signingEntry.dropzoneName || '',
        discipline: signingEntry.discipline || '',
        freefallTime: signingEntry.freefallTime,
        aircraft: signingEntry.aircraft || '',
      });

      setSigningEntry(null);
      setCustomerSearch('');
      Alert.alert('Sent', `Signature request sent to ${signer.displayName}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send request');
    } finally {
      setSendingSignature(null);
    }
  };

  const sorted = [...entries].sort((a, b) => {
    if (sortBy === 'Jump #') return (b.jumpNumber ?? 0) - (a.jumpNumber ?? 0);
    if (sortBy === 'Oldest')
      return (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0);
    return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
  });

  const filtered = sorted.filter((e) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      (e.dropzoneName || '').toLowerCase().includes(q) ||
      (e.discipline || '').toLowerCase().includes(q) ||
      (e.aircraft || '').toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q)
    );
  });

  const lastJump = entries.length > 0 ? (entries[0].date || '') : null;

  const handleAddJump = async () => {
    if (!customerDocId) return;
    if (!form.date) { Alert.alert('Required', 'Please enter a date'); return; }
    setSaving(true);
    try {
      const ffNum = form.freefallDelay ? parseFloat(form.freefallDelay) : null;
      const jNum = form.jumpNumber ? parseInt(form.jumpNumber) : null;
      await addDoc(collection(db, 'customers', customerDocId, 'logbook'), {
        jumpNumber: jNum,
        date: form.date,
        dropzoneName: form.dropzoneName,
        dropzoneId: checkedInDropzone?.id || '',
        freefallDelay: form.freefallDelay,
        freefallTime: ffNum,
        equipment: form.equipment,
        aircraft: form.aircraft,
        exitAltitude: form.exitAltitude,
        deploymentAltitude: form.deploymentAltitude,
        notes: form.notes,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowAddModal(false);
      setForm({
        jumpNumber: '',
        date: new Date().toISOString().split('T')[0],
        dropzoneName: checkedInDropzone?.name || '',
        freefallDelay: '',
        equipment: '',
        aircraft: '',
        exitAltitude: '',
        deploymentAltitude: '',
        notes: '',
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add jump');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Logbook" showBack={true} showNotifications={false} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Plane size={18} color="#2D3E50" strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{entries.reduce((max, e) => e.jumpNumber != null ? Math.max(max, e.jumpNumber) : max, 0) || entries.length}</Text>
            <Text style={styles.statLabel}>Total Jumps</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Clock size={18} color="#2D3E50" strokeWidth={2} />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{totalFreefallDisplay(entries)}</Text>
            <Text style={styles.statLabel}>Freefall Time</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Calendar size={18} color="#2D3E50" strokeWidth={2} />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{lastJump || '—'}</Text>
            <Text style={styles.statLabel}>Last Jump</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Search size={15} color="#9CA3AF" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dropzone, discipline…"
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <X size={15} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Sort chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortRow}
          contentContainerStyle={styles.sortRowContent}
        >
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.sortChip, sortBy === opt && styles.sortChipActive]}
              onPress={() => setSortBy(opt)}
            >
              <Text style={[styles.sortChipText, sortBy === opt && styles.sortChipTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#2D3E50" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <BookOpen size={44} color="#B0BEC5" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No jumps yet</Text>
            <Text style={styles.emptyBody}>Tap the button below to log your first jump</Text>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {filtered.map((entry, idx) => {
              const expanded = expandedId === entry.id;
              const disc = entry.discipline || '';
              const dz = entry.dropzoneName || '';
              const date = entry.date || '';
              const ac = entry.aircraft || '';
              const ff = entry.freefallTime;
              const notes = entry.notes || '';
              const isSigned = entry.status === 'signed';
              const isPending = entry.status === 'pending_signature';

              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[styles.entryCard, idx === 0 && styles.entryCardLatest]}
                  activeOpacity={0.75}
                  onPress={() => setExpandedId((prev) => (prev === entry.id ? null : entry.id))}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.entryJumpNumWrap}>
                      <Text style={styles.entryJumpNum}>
                        {entry.jumpNumber != null ? `#${entry.jumpNumber}` : '—'}
                      </Text>
                    </View>
                    <View style={styles.entryHeaderMid}>
                      <Text style={styles.entryDz} numberOfLines={1}>{dz || 'Unknown Dropzone'}</Text>
                      <Text style={styles.entryDate}>{date || '—'}</Text>
                    </View>
                    <View style={styles.entryHeaderRight}>
                      {disc ? (
                        <View style={[styles.discPill, { backgroundColor: disciplineColor(disc) + '22' }]}>
                          <Text style={[styles.discPillText, { color: disciplineColor(disc) }]}>{disc}</Text>
                        </View>
                      ) : null}
                      {statusPill(entry)}
                    </View>
                    <View style={styles.expandIcon}>
                      {expanded
                        ? <ChevronUp size={18} color="#9CA3AF" />
                        : <ChevronDown size={18} color="#9CA3AF" />}
                    </View>
                  </View>

                  <View style={styles.quickPills}>
                    {entry.exitAltitude ? (
                      <View style={styles.quickPill}>
                        <Plane size={12} color="#6B7280" />
                        <Text style={styles.quickPillText}>{entry.exitAltitude}</Text>
                      </View>
                    ) : null}
                    {ff != null && ff !== '' ? (
                      <View style={styles.quickPill}>
                        <Clock size={12} color="#6B7280" />
                        <Text style={styles.quickPillText}>{formatFF(ff)}</Text>
                      </View>
                    ) : null}
                    {ac ? (
                      <View style={styles.quickPill}>
                        <Tag size={12} color="#6B7280" />
                        <Text style={styles.quickPillText}>{ac}</Text>
                      </View>
                    ) : null}
                    {entry.weather ? (
                      <View style={styles.quickPill}>
                        <Wind size={12} color="#6B7280" />
                        <Text style={styles.quickPillText}>{entry.weather}</Text>
                      </View>
                    ) : null}
                  </View>

                  {expanded && (
                    <View style={styles.entryExpanded}>
                      <View style={styles.divider} />
                      <View style={styles.expandedGrid}>
                        <DetailRow icon={<MapPin size={14} color="#6B7280" />} label="Dropzone" value={dz} />
                        <DetailRow icon={<Calendar size={14} color="#6B7280" />} label="Date" value={date} />
                        <DetailRow icon={<Plane size={14} color="#6B7280" />} label="Aircraft" value={ac} />
                        <DetailRow icon={<Plane size={14} color="#6B7280" />} label="Exit Alt." value={entry.exitAltitude} />
                        <DetailRow icon={<Plane size={14} color="#6B7280" />} label="Deploy Alt." value={entry.deploymentAltitude} />
                        <DetailRow icon={<Clock size={14} color="#6B7280" />} label="Freefall" value={formatFF(ff)} />
                        <DetailRow icon={<Tag size={14} color="#6B7280" />} label="Discipline" value={disc} />
                        <DetailRow icon={<Tag size={14} color="#6B7280" />} label="Jump Type" value={entry.jumpType} />
                        <DetailRow icon={<Tag size={14} color="#6B7280" />} label="Equipment" value={entry.equipment} />
                        <DetailRow icon={<User size={14} color="#6B7280" />} label="Instructor" value={entry.instructor} />
                        <DetailRow icon={<Wind size={14} color="#6B7280" />} label="Weather" value={entry.weather} />
                      </View>

                      {/* Signature info */}
                      {isSigned && entry.signedBy ? (
                        <View style={styles.signatureBox}>
                          <View style={styles.signatureBoxHeader}>
                            <Check size={14} color="#16A34A" strokeWidth={2.5} />
                            <Text style={styles.signatureBoxTitle}>Signed</Text>
                          </View>
                          <Text style={styles.signatureBoxName}>{entry.signedBy}</Text>
                          {entry.signedByLicense ? (
                            <Text style={styles.signatureBoxLicense}>License: {entry.signedByLicense}</Text>
                          ) : null}
                        </View>
                      ) : null}

                      {isPending ? (
                        <View style={styles.pendingBox}>
                          <AlertCircle size={13} color="#F59E0B" strokeWidth={2} />
                          <Text style={styles.pendingBoxText}>Awaiting signature</Text>
                        </View>
                      ) : null}

                      {notes ? (
                        <View style={styles.notesBox}>
                          <Text style={styles.notesLabel}>Notes</Text>
                          <Text style={styles.notesText}>{notes}</Text>
                        </View>
                      ) : null}

                      {/* Action row */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.editRow}
                          onPress={() => router.push(`/logbook-entry?id=${entry.id}&customerDocId=${customerDocId}`)}
                        >
                          <Text style={styles.editRowText}>Edit entry</Text>
                          <ChevronRight size={14} color="#2D3E50" />
                        </TouchableOpacity>

                        {!isSigned && !isPending ? (
                          <TouchableOpacity
                            style={styles.signBtn}
                            onPress={() => setSigningEntry(entry)}
                            activeOpacity={0.8}
                          >
                            <PenLine size={14} color="#FFFFFF" strokeWidth={2} />
                            <Text style={styles.signBtnText}>Get it Signed</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
        <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.fabText}>Add Jump</Text>
      </TouchableOpacity>

      {/* ── Signer Picker Modal ── */}
      <Modal
        visible={!!signingEntry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSigningEntry(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setSigningEntry(null); setCustomerSearch(''); }} style={styles.modalClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Get it Signed</Text>
            <View style={{ width: 36 }} />
          </View>

          {signingEntry ? (
            <View style={styles.jumpPreview}>
              <View style={styles.jumpPreviewRow}>
                <Text style={styles.jumpPreviewLabel}>Jump</Text>
                <Text style={styles.jumpPreviewValue}>
                  {signingEntry.dropzoneName} · {signingEntry.date}
                </Text>
              </View>
              {signingEntry.discipline ? (
                <View style={styles.jumpPreviewRow}>
                  <Text style={styles.jumpPreviewLabel}>Discipline</Text>
                  <View style={[styles.discPill, { backgroundColor: disciplineColor(signingEntry.discipline) + '22' }]}>
                    <Text style={[styles.discPillText, { color: disciplineColor(signingEntry.discipline) }]}>
                      {signingEntry.discipline}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.signerSearch}>
            <Search size={15} color="#9CA3AF" />
            <TextInput
              style={styles.signerSearchInput}
              placeholder="Search by name or license…"
              placeholderTextColor="#9CA3AF"
              value={customerSearch}
              onChangeText={setCustomerSearch}
              autoFocus
            />
            {customerSearch ? (
              <TouchableOpacity onPress={() => setCustomerSearch('')}>
                <X size={15} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {customersLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#2D3E50" />
            </View>
          ) : (
            <FlatList
              data={customers}
              keyExtractor={(c) => c.customerId}
              contentContainerStyle={styles.signerList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No customers found</Text>
                </View>
              }
              renderItem={({ item: signer }) => {
                const isSending = sendingSignature === signer.customerId;
                return (
                  <TouchableOpacity
                    style={styles.signerCard}
                    onPress={() => handleSendSignatureRequest(signer)}
                    disabled={!!sendingSignature}
                    activeOpacity={0.75}
                  >
                    <View style={styles.signerAvatar}>
                      <Text style={styles.signerAvatarText}>
                        {signer.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.signerInfo}>
                      <Text style={styles.signerName}>{signer.displayName}</Text>
                      {signer.license ? (
                        <Text style={styles.signerLicense}>{signer.license}</Text>
                      ) : (
                        <Text style={styles.signerNoLicense}>No license on file</Text>
                      )}
                    </View>
                    <View style={styles.signerAction}>
                      {isSending ? (
                        <ActivityIndicator size="small" color="#2D3E50" />
                      ) : (
                        <View style={styles.sendBtn}>
                          <PenLine size={14} color="#FFFFFF" strokeWidth={2} />
                          <Text style={styles.sendBtnText}>Request</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* ── Add Jump Modal ── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Jump</Text>
            <TouchableOpacity onPress={handleAddJump} disabled={saving} style={styles.modalSaveBtn}>
              {saving
                ? <ActivityIndicator size="small" color="#2D3E50" />
                : <Text style={styles.modalSaveText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Jump Details</Text>

              <FormField label="Jump Number">
                <TextInput
                  style={styles.input}
                  value={form.jumpNumber}
                  onChangeText={(v) => setForm((f) => ({ ...f, jumpNumber: v }))}
                  placeholder="e.g. 42"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </FormField>

              <FormField label="Date *" hint="YYYY-MM-DD">
                <TextInput
                  style={styles.input}
                  value={form.date}
                  onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
                  placeholder="2024-11-01"
                  placeholderTextColor="#9CA3AF"
                />
              </FormField>

              <FormField label="Dropzone">
                <TextInput
                  style={styles.input}
                  value={form.dropzoneName}
                  onChangeText={(v) => setForm((f) => ({ ...f, dropzoneName: v }))}
                  placeholder="e.g. Skydive Dubai"
                  placeholderTextColor="#9CA3AF"
                />
              </FormField>

              <FormField label="Freefall Delay">
                <TextInput
                  style={styles.input}
                  value={form.freefallDelay}
                  onChangeText={(v) => setForm((f) => ({ ...f, freefallDelay: v }))}
                  placeholder="e.g. 60 (seconds)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </FormField>

              <FormField label="Equipment">
                <TextInput
                  style={styles.input}
                  value={form.equipment}
                  onChangeText={(v) => setForm((f) => ({ ...f, equipment: v }))}
                  placeholder="e.g. Javelin, Pilot 7"
                  placeholderTextColor="#9CA3AF"
                />
              </FormField>

              <FormField label="Aircraft">
                <TextInput
                  style={styles.input}
                  value={form.aircraft}
                  onChangeText={(v) => setForm((f) => ({ ...f, aircraft: v }))}
                  placeholder="e.g. Cessna 208, Otter"
                  placeholderTextColor="#9CA3AF"
                />
              </FormField>

              <FormField label="Exit Altitude">
                <TextInput
                  style={styles.input}
                  value={form.exitAltitude}
                  onChangeText={(v) => setForm((f) => ({ ...f, exitAltitude: v }))}
                  placeholder="e.g. 14000 ft"
                  placeholderTextColor="#9CA3AF"
                />
              </FormField>

              <FormField label="Deployment Altitude">
                <TextInput
                  style={styles.input}
                  value={form.deploymentAltitude}
                  onChangeText={(v) => setForm((f) => ({ ...f, deploymentAltitude: v }))}
                  placeholder="e.g. 4500 ft"
                  placeholderTextColor="#9CA3AF"
                />
              </FormField>

              <FormField label="Notes">
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={form.notes}
                  onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                  placeholder="Describe your jump…"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </FormField>
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4E8F0' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EBF2F7',
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  statValue: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500', textAlign: 'center' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A', padding: 0 },

  sortRow: { flexGrow: 0, marginBottom: 14 },
  sortRowContent: { gap: 8 },
  sortChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  sortChipActive: { backgroundColor: '#2D3E50', borderColor: '#2D3E50' },
  sortChipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sortChipTextActive: { color: '#FFFFFF' },

  centerBox: { paddingTop: 80, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyBody: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },

  entriesList: { gap: 10 },
  entryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  entryCardLatest: { borderLeftWidth: 3, borderLeftColor: '#2D3E50' },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  entryJumpNumWrap: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#EBF2F7',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  entryJumpNum: { fontSize: 13, fontWeight: '700', color: '#2D3E50' },
  entryHeaderMid: { flex: 1, gap: 2 },
  entryHeaderRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  entryDz: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  entryDate: { fontSize: 12, color: '#6B7280' },
  discPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  discPillText: { fontSize: 11, fontWeight: '600' },
  expandIcon: { flexShrink: 0 },

  signedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  signedPillText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  pendingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF9C3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  pendingPillText: { fontSize: 10, fontWeight: '700', color: '#B45309' },

  quickPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F3F4F6', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  quickPillText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  entryExpanded: { marginTop: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginBottom: 12 },
  expandedGrid: { gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, color: '#1A1A1A', fontWeight: '600', flexShrink: 1, textAlign: 'right', maxWidth: '60%' },

  signatureBox: {
    marginTop: 12, backgroundColor: '#F0FDF4', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#BBF7D0',
  },
  signatureBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  signatureBoxTitle: { fontSize: 12, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.5 },
  signatureBoxName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  signatureBoxLicense: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  pendingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, backgroundColor: '#FFFBEB', borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: '#FDE68A',
  },
  pendingBoxText: { fontSize: 12, color: '#B45309', fontWeight: '600' },

  notesBox: { marginTop: 12, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, gap: 4 },
  notesLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 21 },

  cardActions: {
    marginTop: 12, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editRowText: { fontSize: 13, color: '#2D3E50', fontWeight: '600' },
  signBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#2D3E50', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  signBtnText: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },

  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    right: 20, left: 20,
    backgroundColor: '#2D3E50', borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
    shadowColor: '#2D3E50', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  fabText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Shared modal styles
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  modalClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalSaveBtn: { paddingHorizontal: 4 },
  modalSaveText: { fontSize: 16, fontWeight: '700', color: '#2D3E50' },
  modalScroll: { flex: 1 },

  // Jump preview in signer modal
  jumpPreview: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 2,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 8,
  },
  jumpPreviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jumpPreviewLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  jumpPreviewValue: { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },

  signerSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  signerSearchInput: { flex: 1, fontSize: 15, color: '#1A1A1A', padding: 0 },
  signerList: { paddingHorizontal: 16, paddingBottom: 40 },

  signerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14,
    marginBottom: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  signerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EBF2F7', justifyContent: 'center', alignItems: 'center',
  },
  signerAvatarText: { fontSize: 18, fontWeight: '700', color: '#2D3E50' },
  signerInfo: { flex: 1 },
  signerName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  signerLicense: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  signerNoLicense: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },
  signerAction: { flexShrink: 0 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#2D3E50', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  sendBtnText: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },

  // Add jump form
  formSection: {
    margin: 16, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  formSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  formField: { marginBottom: 16 },
  formLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  formHint: { fontSize: 11, color: '#9CA3AF' },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#1A1A1A',
  },
  textarea: { minHeight: 88, paddingTop: 11 },
  pickerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
  },
  pickerButtonText: { fontSize: 15, color: '#1A1A1A' },
  pickerDropdown: {
    marginTop: 4, backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  pickerOption: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  pickerOptionActive: { backgroundColor: '#EBF2F7' },
  pickerOptionText: { fontSize: 15, color: '#374151' },
  pickerOptionTextActive: { color: '#2D3E50', fontWeight: '700' },
});
