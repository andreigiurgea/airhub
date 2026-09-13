import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Header from '@/components/Header';
import { Save, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerData } from '@/lib/customerCache';

interface LogbookEntry {
  id: string;
  jumpNumber: number | null;
  date: string;
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

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function ReadOnly({ value }: { value?: string }) {
  return (
    <View style={styles.readOnly}>
      <Text style={styles.readOnlyText}>{value || '—'}</Text>
    </View>
  );
}

export default function LogbookEntryScreen() {
  const { id, customerDocId: paramDocId } = useLocalSearchParams<{ id: string; customerDocId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [entry, setEntry] = useState<LogbookEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerDocId, setCustomerDocId] = useState<string | null>(paramDocId || null);

  const [form, setForm] = useState({
    jumpNumber: '',
    date: '',
    dropzoneName: '',
    freefallDelay: '',
    equipment: '',
    aircraft: '',
    exitAltitude: '',
    deploymentAltitude: '',
    notes: '',
  });

  useEffect(() => {
    if (!user || customerDocId) return;
    getCustomerData(user.uid).then((result) => {
      if (result) setCustomerDocId(result.docId);
    });
  }, [user]);

  useEffect(() => {
    if (!id || !customerDocId) return;
    (async () => {
      try {
        // Read from the subcollection: /customers/{customerDocId}/logbook/{id}
        const entryRef = doc(db, 'customers', customerDocId, 'logbook', id);
        const snap = await getDoc(entryRef);
        if (snap.exists()) {
          const data = snap.data() as LogbookEntry;
          setEntry({ ...data, id: snap.id });
          // freefallDelay is stored as a number (seconds) or string
          const ffRaw = data.freefallDelay ?? data.freefallTime;
          setForm({
            jumpNumber: data.jumpNumber?.toString() || '',
            date: data.date || '',
            dropzoneName: data.dropzoneName || '',
            freefallDelay: ffRaw != null ? String(ffRaw) : '',
            equipment: data.equipment || '',
            aircraft: data.aircraft || '',
            exitAltitude: data.exitAltitude || '',
            deploymentAltitude: data.deploymentAltitude || '',
            notes: data.notes || '',
          });
        }
      } catch {
        Alert.alert('Error', 'Failed to load entry');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, customerDocId]);

  const handleSave = async () => {
    if (!id || !customerDocId) return;
    if (!form.date) { Alert.alert('Required', 'Please enter a date'); return; }

    setSaving(true);
    try {
      const ffNum = form.freefallDelay ? parseFloat(form.freefallDelay) : null;
      await updateDoc(doc(db, 'customers', customerDocId, 'logbook', id), {
        jumpNumber: form.jumpNumber ? parseInt(form.jumpNumber) : null,
        date: form.date,
        dropzoneName: form.dropzoneName,
        freefallDelay: form.freefallDelay,
        freefallTime: ffNum,
        equipment: form.equipment,
        aircraft: form.aircraft,
        exitAltitude: form.exitAltitude,
        deploymentAltitude: form.deploymentAltitude,
        notes: form.notes,
        updatedAt: serverTimestamp(),
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !customerDocId) {
    return (
      <View style={styles.container}>
        <Header title="Edit Jump" showBack={true} showNotifications={false} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2D3E50" />
        </View>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.container}>
        <Header title="Edit Jump" showBack={true} showNotifications={false} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Entry not found</Text>
        </View>
      </View>
    );
  }

  const isEditable = !entry.status || entry.status === 'draft';

  return (
    <View style={styles.container}>
      <Header title="Edit Jump" showBack={true} showNotifications={false} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {entry.status && entry.status !== 'draft' && (
          <View style={[styles.statusBanner, entry.status === 'signed' && styles.statusBannerSigned]}>
            <Text style={styles.statusBannerText}>
              {entry.status === 'signed'
                ? 'This entry has been signed and is read-only.'
                : 'This entry is pending signature and is read-only.'}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jump Details</Text>

          <FormField label="Jump Number">
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={form.jumpNumber}
              onChangeText={(v) => setForm((f) => ({ ...f, jumpNumber: v }))}
              placeholder="e.g. 42"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              editable={isEditable}
            />
          </FormField>

          <FormField label="Date" required>
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={form.date}
              onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              editable={isEditable}
            />
          </FormField>

          <FormField label="Dropzone">
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={form.dropzoneName}
              onChangeText={(v) => setForm((f) => ({ ...f, dropzoneName: v }))}
              placeholder="e.g. Skydive Dubai"
              placeholderTextColor="#9CA3AF"
              editable={isEditable}
            />
          </FormField>

          <FormField label="Freefall Delay">
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={form.freefallDelay}
              onChangeText={(v) => setForm((f) => ({ ...f, freefallDelay: v }))}
              placeholder="e.g. 60 (seconds)"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              editable={isEditable}
            />
          </FormField>

          <FormField label="Equipment">
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={form.equipment}
              onChangeText={(v) => setForm((f) => ({ ...f, equipment: v }))}
              placeholder="e.g. Javelin, Pilot 7"
              placeholderTextColor="#9CA3AF"
              editable={isEditable}
            />
          </FormField>

          <FormField label="Aircraft">
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={form.aircraft}
              onChangeText={(v) => setForm((f) => ({ ...f, aircraft: v }))}
              placeholder="e.g. Cessna 208"
              placeholderTextColor="#9CA3AF"
              editable={isEditable}
            />
          </FormField>

          <FormField label="Exit Altitude">
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={form.exitAltitude}
              onChangeText={(v) => setForm((f) => ({ ...f, exitAltitude: v }))}
              placeholder="e.g. 14000 ft"
              placeholderTextColor="#9CA3AF"
              editable={isEditable}
            />
          </FormField>

          <FormField label="Deployment Altitude">
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={form.deploymentAltitude}
              onChangeText={(v) => setForm((f) => ({ ...f, deploymentAltitude: v }))}
              placeholder="e.g. 4500 ft"
              placeholderTextColor="#9CA3AF"
              editable={isEditable}
            />
          </FormField>

          <FormField label="Notes">
            <TextInput
              style={[styles.input, styles.textarea, !isEditable && styles.inputDisabled]}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="Describe your jump…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={isEditable}
            />
          </FormField>
        </View>

        {isEditable && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Save size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4E8F0' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6B7280' },

  statusBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  statusBannerSigned: {
    backgroundColor: '#D1FAE5',
    borderLeftColor: '#10B981',
  },
  statusBannerText: { fontSize: 13, color: '#374151', lineHeight: 20 },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },

  formField: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#EF4444' },

  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1A1A1A',
  },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  textarea: { minHeight: 88, paddingTop: 11 },
  placeholder: { color: '#9CA3AF' },

  readOnly: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  readOnlyText: { fontSize: 15, color: '#6B7280' },

  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pickerButtonText: { fontSize: 15, color: '#1A1A1A' },
  pickerDropdown: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionActive: { backgroundColor: '#EBF2F7' },
  pickerOptionText: { fontSize: 15, color: '#374151' },
  pickerOptionTextActive: { color: '#2D3E50', fontWeight: '700' },

  saveButton: {
    backgroundColor: '#2D3E50',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginBottom: 14,
    shadowColor: '#2D3E50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
