import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  CircleAlert as AlertCircle,
} from 'lucide-react-native';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerData } from '@/lib/customerCache';
import {
  addEquipment,
  updateEquipment,
  subscribeToEquipment,
  type Equipment,
  type ContainerSection,
  type CanopySection,
  type ReserveCanopySection,
  type AADSection,
} from '@/lib/equipmentService';

interface FormData {
  container: ContainerSection;
  mainCanopy: CanopySection;
  reserveCanopy: ReserveCanopySection;
  aad: AADSection;
}

interface FieldErrors { [key: string]: string }

const emptyContainer = (): ContainerSection => ({ model: '', series: '', photoUrl: '' });
const emptyMainCanopy = (): CanopySection => ({ model: '', series: '', size: '', certificateNumber: '', manufacturingDate: '', photoUrl: '' });
const emptyReserve = (): ReserveCanopySection => ({ model: '', series: '', size: '', certificateNumber: '', packingDate: '', packingExpiryDate: '', photoUrl: '' });
const emptyAAD = (): AADSection => ({ model: '', series: '', expiryDate: '' });
const emptyForm = (): FormData => ({ container: emptyContainer(), mainCanopy: emptyMainCanopy(), reserveCanopy: emptyReserve(), aad: emptyAAD() });

function validateForm(form: FormData): FieldErrors {
  const e: FieldErrors = {};
  if (!form.container.model) e['container.model'] = 'Required';
  if (!form.container.series) e['container.series'] = 'Required';
  if (!form.mainCanopy.model) e['mainCanopy.model'] = 'Required';
  if (!form.mainCanopy.series) e['mainCanopy.series'] = 'Required';
  if (!form.mainCanopy.size) e['mainCanopy.size'] = 'Required';
  if (!form.mainCanopy.manufacturingDate) e['mainCanopy.manufacturingDate'] = 'Required';
  if (!form.reserveCanopy.model) e['reserveCanopy.model'] = 'Required';
  if (!form.reserveCanopy.series) e['reserveCanopy.series'] = 'Required';
  if (!form.reserveCanopy.size) e['reserveCanopy.size'] = 'Required';
  if (!form.reserveCanopy.packingDate) e['reserveCanopy.packingDate'] = 'Required';
  if (!form.aad.model) e['aad.model'] = 'Required';
  if (!form.aad.series) e['aad.series'] = 'Required';
  if (!form.aad.expiryDate) e['aad.expiryDate'] = 'Required';
  return e;
}

function DateInput({ value, onChange, placeholder, error }: {
  value: string; onChange: (v: string) => void; placeholder: string; error?: string;
}) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) setDisplay(`${parts[2]}/${parts[1]}/${parts[0]}`);
    } else {
      setDisplay('');
    }
  }, [value]);

  const handleChange = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
    let formatted = cleaned;
    if (cleaned.length >= 5) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    else if (cleaned.length >= 3) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    setDisplay(formatted);
    if (cleaned.length === 8) {
      onChange(`20${cleaned.slice(6)}-${cleaned.slice(2, 4)}-${cleaned.slice(0, 2)}`);
    } else {
      onChange('');
    }
  };

  return (
    <View>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={display}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#AAAAAA"
        keyboardType="numeric"
        maxLength={10}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function PhotoUpload({ value, onChange, label }: { value?: string; onChange: (url: string) => void; label: string }) {
  const handlePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) onChange(result.assets[0].uri);
  };
  return (
    <TouchableOpacity style={styles.photoUpload} onPress={handlePick}>
      {value ? (
        <View style={styles.photoPreviewContainer}>
          <Image source={{ uri: value }} style={styles.photoPreview} />
          <View style={styles.photoChangeOverlay}>
            <Camera size={16} color="#FFFFFF" />
            <Text style={styles.photoChangeText}>Change</Text>
          </View>
        </View>
      ) : (
        <View style={styles.photoPlaceholder}>
          <Camera size={20} color="#888888" />
          <Text style={styles.photoPlaceholderText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function FormField({ label, value, onChange, error, placeholder, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || label}
        placeholderTextColor="#AAAAAA"
        keyboardType={keyboardType}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function SectionCard({ title, children }: {
  title: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function PackingExpiryDisplay({ value }: { value: string }) {
  let display = 'Auto-calculated';
  if (value) {
    const parts = value.split('-');
    if (parts.length === 3) display = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return (
    <View style={styles.readonlyInput}>
      <Text style={[styles.readonlyText, !value && styles.readonlyPlaceholder]}>{display}</Text>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function HalfField({ children }: { children: React.ReactNode }) {
  return <View style={styles.halfField}>{children}</View>;
}

export default function EquipmentEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingItem, setLoadingItem] = useState(!!id);

  const isEditing = !!id;

  useEffect(() => {
    if (!user) return;
    getCustomerData(user.uid).then(data => {
      if (data) setCustomerId(data.customerId);
    });
  }, [user]);

  useEffect(() => {
    if (!customerId || !id) return;
    const unsub = subscribeToEquipment(customerId, (items) => {
      const found = items.find(e => e.id === id);
      if (found) {
        setForm({
          container: { ...found.container },
          mainCanopy: { ...found.mainCanopy },
          reserveCanopy: { ...found.reserveCanopy },
          aad: { ...found.aad },
        });
        setLoadingItem(false);
      }
    });
    return unsub;
  }, [customerId, id]);

  const updateForm = useCallback((section: keyof FormData, field: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [section]: { ...(prev[section] as any), [field]: value } };
      if (section === 'reserveCanopy' && field === 'packingDate' && value) {
        const packingDate = new Date(value);
        const packingExpiry = new Date(packingDate.getTime() + 180 * 24 * 60 * 60 * 1000);
        const yyyy = packingExpiry.getFullYear();
        const mm = String(packingExpiry.getMonth() + 1).padStart(2, '0');
        const dd = String(packingExpiry.getDate()).padStart(2, '0');
        updated.reserveCanopy = { ...updated.reserveCanopy, packingExpiryDate: `${yyyy}-${mm}-${dd}` };
      } else if (section === 'reserveCanopy' && field === 'packingDate' && !value) {
        updated.reserveCanopy = { ...updated.reserveCanopy, packingExpiryDate: '' };
      }
      return updated;
    });
    if (touched) {
      setErrors(prev => { const next = { ...prev }; delete next[`${section}.${field}`]; return next; });
    }
  }, [touched]);

  const handleSave = async () => {
    setTouched(true);
    const errs = validateForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!customerId) return;
    setSaving(true);
    try {
      if (isEditing && id) {
        await updateEquipment(customerId, id, form);
        router.back();
      } else {
        await addEquipment(customerId, form);
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const valid = Object.keys(validateForm(form)).length === 0;

  if (loadingItem) {
    return (
      <View style={styles.container}>
        <Header title={isEditing ? 'Edit Rig' : 'Add Rig'} showBack={true} showNotifications={false} />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#1A73E8" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={isEditing ? 'Edit Rig' : 'Add Rig'} showBack={true} showNotifications={false} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 16 }}>

          <SectionCard title="Container">
            <Row>
              <HalfField>
                <FormField label="Model" value={form.container.model}
                  onChange={v => updateForm('container', 'model', v)}
                  error={touched ? errors['container.model'] : undefined} placeholder="e.g. Javelin" />
              </HalfField>
              <HalfField>
                <FormField label="Series" value={form.container.series}
                  onChange={v => updateForm('container', 'series', v)}
                  error={touched ? errors['container.series'] : undefined} placeholder="e.g. OdysseyEvo" />
              </HalfField>
            </Row>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Photo</Text>
              <PhotoUpload value={form.container.photoUrl} onChange={v => updateForm('container', 'photoUrl', v)} label="Upload container photo" />
            </View>
          </SectionCard>

          <SectionCard title="Main Canopy">
            <Row>
              <HalfField>
                <FormField label="Model" value={form.mainCanopy.model}
                  onChange={v => updateForm('mainCanopy', 'model', v)}
                  error={touched ? errors['mainCanopy.model'] : undefined} placeholder="e.g. Sabre2" />
              </HalfField>
              <HalfField>
                <FormField label="Series" value={form.mainCanopy.series}
                  onChange={v => updateForm('mainCanopy', 'series', v)}
                  error={touched ? errors['mainCanopy.series'] : undefined} placeholder="e.g. 2023" />
              </HalfField>
            </Row>
            <Row>
              <HalfField>
                <FormField label="Size (sqft)" value={form.mainCanopy.size}
                  onChange={v => updateForm('mainCanopy', 'size', v)}
                  error={touched ? errors['mainCanopy.size'] : undefined} placeholder="e.g. 150" keyboardType="numeric" />
              </HalfField>
              <HalfField>
                <FormField label="Certificate No." value={form.mainCanopy.certificateNumber}
                  onChange={v => updateForm('mainCanopy', 'certificateNumber', v)}
                  placeholder="e.g. MC-12345" />
              </HalfField>
            </Row>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Manufacturing Date</Text>
              <DateInput value={form.mainCanopy.manufacturingDate ?? ''} onChange={v => updateForm('mainCanopy', 'manufacturingDate', v)}
                placeholder="DD/MM/YY" error={touched ? errors['mainCanopy.manufacturingDate'] : undefined} />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Photo</Text>
              <PhotoUpload value={form.mainCanopy.photoUrl} onChange={v => updateForm('mainCanopy', 'photoUrl', v)} label="Upload main canopy photo" />
            </View>
          </SectionCard>

          <SectionCard title="Reserve Canopy">
            <Row>
              <HalfField>
                <FormField label="Model" value={form.reserveCanopy.model}
                  onChange={v => updateForm('reserveCanopy', 'model', v)}
                  error={touched ? errors['reserveCanopy.model'] : undefined} placeholder="e.g. PD Reserve" />
              </HalfField>
              <HalfField>
                <FormField label="Series" value={form.reserveCanopy.series}
                  onChange={v => updateForm('reserveCanopy', 'series', v)}
                  error={touched ? errors['reserveCanopy.series'] : undefined} placeholder="e.g. 2022" />
              </HalfField>
            </Row>
            <Row>
              <HalfField>
                <FormField label="Size (sqft)" value={form.reserveCanopy.size}
                  onChange={v => updateForm('reserveCanopy', 'size', v)}
                  error={touched ? errors['reserveCanopy.size'] : undefined} placeholder="e.g. 176" keyboardType="numeric" />
              </HalfField>
              <HalfField>
                <FormField label="Certificate No." value={form.reserveCanopy.certificateNumber}
                  onChange={v => updateForm('reserveCanopy', 'certificateNumber', v)}
                  placeholder="e.g. RC-54321" />
              </HalfField>
            </Row>
            <Row>
              <HalfField>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Packing Date</Text>
                  <DateInput value={form.reserveCanopy.packingDate} onChange={v => updateForm('reserveCanopy', 'packingDate', v)}
                    placeholder="DD/MM/YY" error={touched ? errors['reserveCanopy.packingDate'] : undefined} />
                </View>
              </HalfField>
              <HalfField>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Packing Expiry</Text>
                  <PackingExpiryDisplay value={form.reserveCanopy.packingExpiryDate} />
                </View>
              </HalfField>
            </Row>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Photo</Text>
              <PhotoUpload value={form.reserveCanopy.photoUrl} onChange={v => updateForm('reserveCanopy', 'photoUrl', v)} label="Upload reserve canopy photo" />
            </View>
          </SectionCard>

          <SectionCard title="AAD">
            <Row>
              <HalfField>
                <FormField label="Model" value={form.aad.model}
                  onChange={v => updateForm('aad', 'model', v)}
                  error={touched ? errors['aad.model'] : undefined} placeholder="e.g. Cypres" />
              </HalfField>
              <HalfField>
                <FormField label="Series" value={form.aad.series}
                  onChange={v => updateForm('aad', 'series', v)}
                  error={touched ? errors['aad.series'] : undefined} placeholder="e.g. Speed" />
              </HalfField>
            </Row>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Expiry Date</Text>
              <DateInput value={form.aad.expiryDate} onChange={v => updateForm('aad', 'expiryDate', v)}
                placeholder="DD/MM/YY" error={touched ? errors['aad.expiryDate'] : undefined} />
            </View>
          </SectionCard>

          {touched && !valid && (
            <View style={styles.validationBanner}>
              <AlertCircle size={16} color="#C62828" />
              <Text style={styles.validationBannerText}>Please fill in all required fields.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, (touched && !valid) ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{isEditing ? 'Save Changes' : 'Save Equipment'}</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4E8F0' },
  content: { flex: 1, paddingHorizontal: 16 },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  sectionBody: { padding: 16 },

  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  halfField: { flex: 1 },

  fieldContainer: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#555555',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    height: 44, backgroundColor: '#F7F8FA', borderRadius: 10,
    paddingHorizontal: 12, fontSize: 14, color: '#1A1A1A',
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  inputError: { borderColor: '#E53935' },
  fieldError: { fontSize: 11, color: '#E53935', marginTop: 4 },
  readonlyInput: {
    height: 44, backgroundColor: '#F0F0F0', borderRadius: 10,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#E0E0E0',
    justifyContent: 'center',
  },
  readonlyText: { fontSize: 14, color: '#555555' },
  readonlyPlaceholder: { color: '#AAAAAA' },

  photoUpload: { borderRadius: 10, overflow: 'hidden' },
  photoPlaceholder: {
    height: 80, backgroundColor: '#F7F8FA', borderRadius: 10,
    borderWidth: 1, borderColor: '#EBEBEB', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  photoPlaceholderText: { fontSize: 12, color: '#888888' },
  photoPreviewContainer: { position: 'relative' },
  photoPreview: { width: '100%', height: 120, borderRadius: 10 },
  photoChangeOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  photoChangeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  validationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  validationBannerText: { fontSize: 13, color: '#C62828', flex: 1 },

  saveButton: {
    backgroundColor: '#1A1A1A', borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  saveButtonDisabled: { backgroundColor: '#CCCCCC' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
