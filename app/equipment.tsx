import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Plus,
  ListFilter as Filter,
  Trash2,
  CreditCard as Edit2,
  Eye,
  Package,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle2,
  Clock,
  Wrench,
} from 'lucide-react-native';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerData } from '@/lib/customerCache';
import {
  deleteEquipment,
  subscribeToEquipment,
  type Equipment,
  type EquipmentStatus,
} from '@/lib/equipmentService';

const STATUSES: EquipmentStatus[] = ['Active', 'Expiring Soon', 'Expired', 'Under Maintenance'];

const STATUS_COLORS: Record<EquipmentStatus, { bg: string; text: string; icon: any }> = {
  Active: { bg: '#E8F5E9', text: '#2E7D32', icon: CheckCircle2 },
  'Expiring Soon': { bg: '#FFF8E1', text: '#F57F17', icon: Clock },
  Expired: { bg: '#FFEBEE', text: '#C62828', icon: AlertCircle },
  'Under Maintenance': { bg: '#E3F2FD', text: '#1565C0', icon: Wrench },
};

function StatusBadge({ status }: { status: EquipmentStatus }) {
  const cfg = STATUS_COLORS[status];
  const Icon = cfg.icon;
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Icon size={12} color={cfg.text} />
      <Text style={[styles.statusText, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

function EquipmentCard({ item, onDelete }: { item: Equipment; onDelete: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.container.model} {item.container.series}</Text>
          <Text style={styles.cardSub}>Main: {item.mainCanopy.model} {item.mainCanopy.size}sqft</Text>
          <Text style={styles.cardSub}>Reserve: {item.reserveCanopy.model} {item.reserveCanopy.size}sqft</Text>
        </View>
        {item.container.photoUrl ? (
          <Image source={{ uri: item.container.photoUrl }} style={styles.cardThumb} />
        ) : (
          <View style={styles.cardThumbPlaceholder}>
            <Package size={24} color="#CCCCCC" />
          </View>
        )}
      </View>
      <View style={styles.cardBottom}>
        <StatusBadge status={item.status} />
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/equipment-view', params: { id: item.id } })}
          >
            <Eye size={16} color="#555555" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/equipment-edit', params: { id: item.id } })}
          >
            <Edit2 size={16} color="#1565C0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
            <Trash2 size={16} color="#C62828" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function EquipmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<EquipmentStatus | 'All'>('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    if (!user) return;
    getCustomerData(user.uid).then(data => {
      if (data) setCustomerId(data.customerId);
    });
  }, [user]);

  useEffect(() => {
    if (!customerId) return;
    const unsub = subscribeToEquipment(customerId, (items) => {
      setEquipment(items);
      setLoading(false);
    });
    return unsub;
  }, [customerId]);

  const filtered = equipment.filter(item =>
    filterStatus === 'All' || item.status === filterStatus
  );

  const handleDelete = (item: Equipment) => {
    Alert.alert(
      'Delete Equipment',
      `Delete ${item.container.model} ${item.container.series}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (!customerId || !item.id) return;
            try { await deleteEquipment(customerId, item.id); }
            catch (err: any) { Alert.alert('Error', err.message || 'Failed to delete'); }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Equipment" showBack={true} showNotifications={false} />

      <View style={styles.topBar}>
        <View style={{ position: 'relative' }}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus !== 'All' ? styles.filterButtonActive : null]}
            onPress={() => setShowFilterMenu(v => !v)}
          >
            <Filter size={15} color={filterStatus !== 'All' ? '#FFFFFF' : '#555555'} />
            {filterStatus !== 'All' && (
              <Text style={styles.filterLabel}>{filterStatus}</Text>
            )}
          </TouchableOpacity>
          {showFilterMenu && (
            <View style={styles.filterMenu}>
              {(['All', ...STATUSES] as const).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterItem, filterStatus === s ? styles.filterItemActive : null]}
                  onPress={() => { setFilterStatus(s); setShowFilterMenu(false); }}
                >
                  <Text style={[styles.filterItemText, filterStatus === s ? styles.filterItemTextActive : null]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/equipment-edit')}
        >
          <Plus size={17} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Rig</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#1A73E8" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No equipment yet</Text>
            <Text style={styles.emptySubtitle}>Add your first parachute rig to get started.</Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => router.push('/equipment-edit')}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>Add Rig</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(item => (
            <EquipmentCard key={item.id} item={item} onDelete={() => handleDelete(item)} />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4E8F0' },
  content: { flex: 1, paddingHorizontal: 16 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  filterButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF', borderRadius: 10,
  },
  filterButtonActive: { backgroundColor: '#1A1A1A' },
  filterLabel: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  filterMenu: {
    position: 'absolute', left: 0, top: 44,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
    zIndex: 100, minWidth: 170, overflow: 'hidden',
  },
  filterItem: { paddingVertical: 12, paddingHorizontal: 16 },
  filterItemActive: { backgroundColor: '#F5F5F5' },
  filterItemText: { fontSize: 14, color: '#555555' },
  filterItemTextActive: { color: '#1A1A1A', fontWeight: '600' },

  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1A1A1A', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  emptySubtitle: { fontSize: 14, color: '#888888', textAlign: 'center' },
  emptyAddButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1A1A1A', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 4,
  },
  emptyAddButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardLeft: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  cardSub: { fontSize: 13, color: '#666666' },
  cardThumb: { width: 64, height: 64, borderRadius: 10, marginLeft: 12 },
  cardThumbPlaceholder: {
    width: 64, height: 64, borderRadius: 10, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
});
