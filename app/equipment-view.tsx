import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle2,
  Clock,
  Wrench,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerData } from '@/lib/customerCache';
import {
  subscribeToEquipment,
  deleteEquipment,
  type Equipment,
  type EquipmentStatus,
} from '@/lib/equipmentService';

const STATUS_COLORS: Record<EquipmentStatus, { bg: string; text: string; border: string; icon: any }> = {
  Active: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7', icon: CheckCircle2 },
  'Expiring Soon': { bg: '#FFF8E1', text: '#F57F17', border: '#FFE082', icon: Clock },
  Expired: { bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A', icon: AlertCircle },
  'Under Maintenance': { bg: '#E3F2FD', text: '#1565C0', border: '#90CAF9', icon: Wrench },
};

function StatusBanner({ status }: { status: EquipmentStatus }) {
  const cfg = STATUS_COLORS[status];
  const Icon = cfg.icon;
  return (
    <View style={[styles.statusBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Icon size={15} color={cfg.text} />
      <Text style={[styles.statusBannerText, { color: cfg.text }]}>{status}</Text>
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

function formatFieldValue(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  return value;
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldBox}>
        <Text style={styles.fieldValue}>{formatFieldValue(value)}</Text>
      </View>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function HalfField({ children }: { children: React.ReactNode }) {
  return <View style={styles.halfField}>{children}</View>;
}

export default function EquipmentViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [item, setItem] = useState<Equipment | null>(null);

  useEffect(() => {
    if (!user) return;
    getCustomerData(user.uid).then(data => {
      if (data) setCustomerId(data.customerId);
    });
  }, [user]);

  useEffect(() => {
    if (!customerId) return;
    const unsub = subscribeToEquipment(customerId, (items) => {
      const found = items.find(e => e.id === id);
      if (found) setItem(found);
    });
    return unsub;
  }, [customerId, id]);

  const handleDelete = () => {
    if (!item) return;
    Alert.alert(
      'Delete Equipment',
      `Delete ${item.container.model} ${item.container.series}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (!customerId || !item.id) return;
            try {
              await deleteEquipment(customerId, item.id);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  if (!item) {
    return (
      <View style={styles.container}>
        <Header title="Equipment Details" showBack={true} showNotifications={false} />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#1A73E8" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={`${item.container.model} ${item.container.series}`}
        showBack={true}
        showNotifications={false}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusBanner status={item.status} />
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push({ pathname: '/equipment-edit', params: { id: item.id } })}
            >
              <Pencil size={15} color="#1565C0" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Trash2 size={15} color="#C62828" />
            </TouchableOpacity>
          </View>
        </View>

        <SectionCard title="Container">
          <Row>
            <HalfField><Field label="Model" value={item.container.model} /></HalfField>
            <HalfField><Field label="Series" value={item.container.series} /></HalfField>
          </Row>
          {item.container.photoUrl ? (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Photo</Text>
              <Image source={{ uri: item.container.photoUrl }} style={styles.photo} />
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="Main Canopy">
          <Row>
            <HalfField><Field label="Model" value={item.mainCanopy.model} /></HalfField>
            <HalfField><Field label="Series" value={item.mainCanopy.series} /></HalfField>
          </Row>
          <Row>
            <HalfField><Field label="Size (sqft)" value={item.mainCanopy.size} /></HalfField>
            <HalfField><Field label="Certificate No." value={item.mainCanopy.certificateNumber} /></HalfField>
          </Row>
          <Field label="Manufacturing Date" value={item.mainCanopy.manufacturingDate} />
          {item.mainCanopy.photoUrl ? (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Photo</Text>
              <Image source={{ uri: item.mainCanopy.photoUrl }} style={styles.photo} />
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="Reserve Canopy">
          <Row>
            <HalfField><Field label="Model" value={item.reserveCanopy.model} /></HalfField>
            <HalfField><Field label="Series" value={item.reserveCanopy.series} /></HalfField>
          </Row>
          <Row>
            <HalfField><Field label="Size (sqft)" value={item.reserveCanopy.size} /></HalfField>
            <HalfField><Field label="Certificate No." value={item.reserveCanopy.certificateNumber} /></HalfField>
          </Row>
          <Row>
            <HalfField><Field label="Packing Date" value={item.reserveCanopy.packingDate} /></HalfField>
            <HalfField><Field label="Packing Expiry" value={item.reserveCanopy.packingExpiryDate} /></HalfField>
          </Row>
          {item.reserveCanopy.photoUrl ? (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Photo</Text>
              <Image source={{ uri: item.reserveCanopy.photoUrl }} style={styles.photo} />
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="AAD">
          <Row>
            <HalfField><Field label="Model" value={item.aad.model} /></HalfField>
            <HalfField><Field label="Series" value={item.aad.series} /></HalfField>
          </Row>
          <Field label="Expiry Date" value={item.aad.expiryDate} />
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4E8F0' },
  content: { flex: 1, paddingHorizontal: 16 },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  statusBannerText: { fontSize: 13, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  editButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E3F2FD', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 10,
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#1565C0' },
  deleteButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 16,
    overflow: 'hidden', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  sectionBody: { padding: 16 },

  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  fieldContainer: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#555555',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  fieldBox: {
    height: 44, backgroundColor: '#F7F8FA', borderRadius: 10,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#EBEBEB',
    justifyContent: 'center',
  },
  fieldValue: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },

  photo: {
    width: '100%', height: 120, borderRadius: 10,
  },
});
