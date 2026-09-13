import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Switch,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Search,
  SlidersHorizontal,
  Plus,
  X,
  ChevronDown,
  Image as ImageIcon,
  Package,
  Layers,
  Box,
  Wind,
  Shield,
  Clock,
  Wrench,
  Tag,
  Check,
} from 'lucide-react-native';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import {
  publishListing,
  subscribeToListings,
  MARKETPLACE_CATEGORIES,
  type MarketplaceListing,
  type MarketplaceCategory,
} from '@/lib/marketplaceService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;

const CATEGORY_META: Record<MarketplaceCategory, { bg: string; text: string; accent: string; icon: any }> = {
  Rigs:        { bg: '#EBF4FF', text: '#1565C0', accent: '#3B82F6',  icon: Layers },
  Containers:  { bg: '#F3EEFF', text: '#5B21B6', accent: '#8B5CF6',  icon: Box },
  Canopy:      { bg: '#ECFDF5', text: '#065F46', accent: '#10B981',  icon: Wind },
  Helmets:     { bg: '#FFF9EB', text: '#92400E', accent: '#F59E0B',  icon: Shield },
  Altimeters:  { bg: '#FFF0F6', text: '#9D174D', accent: '#EC4899',  icon: Clock },
  Accessories: { bg: '#F0FDF4', text: '#166534', accent: '#22C55E',  icon: Wrench },
  Suits:       { bg: '#FFF5F5', text: '#991B1B', accent: '#EF4444',  icon: Tag },
};

// ─── Grid Card ────────────────────────────────────────────────────────────────

function GridCard({ item, onPress }: { item: MarketplaceListing; onPress: () => void }) {
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.Rigs;

  const getSubtitle = () => {
    if (!item.description) return '';
    const words = item.description.trim().split(/\s+/);
    return words.slice(0, 4).join(' ');
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.cardImgWrap}>
        {item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.cardImg} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <ImageIcon size={32} color="#C8D6E0" />
          </View>
        )}
        <View style={styles.cardCatBadge}>
          <Text style={styles.cardCatBadgeText}>{item.category}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        {getSubtitle() ? (
          <Text style={styles.cardSubtitle} numberOfLines={1}>{getSubtitle()}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

function FilterPanel({
  categories,
  activeCategory,
  onSelect,
  onDone,
}: {
  categories: MarketplaceCategory[];
  activeCategory: MarketplaceCategory | 'All';
  onSelect: (cat: MarketplaceCategory | 'All') => void;
  onDone: () => void;
}) {
  return (
    <View style={styles.filterPanel}>
      <Text style={styles.filterTitle}>Filters</Text>
      <View style={styles.filterChipsGrid}>
        <TouchableOpacity
          style={[styles.filterChip, activeCategory === 'All' && styles.filterChipActive]}
          onPress={() => onSelect('All')}
          activeOpacity={0.75}
        >
          <Search size={13} color={activeCategory === 'All' ? '#1A2B3C' : '#6B7280'} strokeWidth={2} />
          <Text style={[styles.filterChipText, activeCategory === 'All' && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onSelect(cat)}
              activeOpacity={0.75}
            >
              <Search size={13} color={active ? '#1A2B3C' : '#6B7280'} strokeWidth={2} />
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.85}>
        <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Create Listing Modal ─────────────────────────────────────────────────────

const EMPTY_FORM = {
  images: [] as string[],
  title: '',
  category: '' as MarketplaceCategory | '',
  description: '',
  email: '',
  phone: '',
  showPhone: true,
};

function CreateListingModal({
  visible,
  onClose,
  onPublished,
  defaultEmail,
}: {
  visible: boolean;
  onClose: () => void;
  onPublished: () => void;
  defaultEmail: string;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...EMPTY_FORM, email: defaultEmail });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm({ ...EMPTY_FORM, email: defaultEmail });
      setErrors({});
    }
  }, [visible, defaultEmail]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      const newUris = await Promise.all(
        result.assets.map(async (a) => {
          if (a.base64) {
            const mime = a.mimeType || 'image/jpeg';
            return `data:${mime};base64,${a.base64}`;
          }
          if (Platform.OS === 'web' && a.uri.startsWith('blob:')) {
            try {
              const res = await fetch(a.uri);
              const blob = await res.blob();
              return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch {
              return a.uri;
            }
          }
          return a.uri;
        })
      );
      setForm((f) => ({ ...f, images: [...f.images, ...newUris].slice(0, 8) }));
    }
  };

  const removeImage = (idx: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.images.length === 0) e.images = 'At least one image is required.';
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.category) e.category = 'Category is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePublish = async () => {
    if (!validate()) return;
    if (!user) return;
    setPublishing(true);
    try {
      await publishListing({
        customerId: user.uid,
        dropzoneId: '',
        images: form.images,
        title: form.title.trim(),
        category: form.category as MarketplaceCategory,
        description: form.description.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        showPhone: form.showPhone,
      });
      onPublished();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish listing.');
    } finally {
      setPublishing(false);
    }
  };

  const selectedMeta = form.category ? CATEGORY_META[form.category as MarketplaceCategory] : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sellContainer}>
          <View style={styles.sellHeader}>
            <TouchableOpacity onPress={onClose} style={styles.sellHeaderBtn}>
              <X size={18} color="#1A2B3C" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.sellHeaderTitle}>New Listing</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
            <Text style={styles.fieldLabel}>Photos <Text style={styles.req}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
                <View style={styles.addPhotoInner}>
                  <ImageIcon size={20} color="#3B82F6" />
                </View>
                <Text style={styles.addPhotoText}>Add</Text>
              </TouchableOpacity>
              {form.images.map((uri, i) => (
                <View key={i} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeImage(i)}>
                    <X size={10} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {errors.images ? <Text style={styles.fieldError}>{errors.images}</Text> : null}

            <Text style={styles.fieldLabel}>Title <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.title ? styles.inputErr : null]}
              placeholder="e.g. Javelin J5 — great condition"
              value={form.title}
              onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
              placeholderTextColor="#B8C5D0"
            />
            {errors.title ? <Text style={styles.fieldError}>{errors.title}</Text> : null}

            <Text style={styles.fieldLabel}>Category <Text style={styles.req}>*</Text></Text>
            <TouchableOpacity
              style={[styles.pickerBtn, errors.category ? styles.inputErr : null]}
              onPress={() => setShowCategoryPicker(true)}
            >
              {form.category && selectedMeta ? (
                <View style={styles.pickerSelected}>
                  <View style={[styles.pickerDot, { backgroundColor: selectedMeta.accent }]} />
                  <Text style={[styles.pickerSelectedText, { color: selectedMeta.text }]}>{form.category}</Text>
                </View>
              ) : (
                <Text style={styles.pickerPlaceholder}>Select a category</Text>
              )}
              <ChevronDown size={17} color="#9AAAB8" />
            </TouchableOpacity>
            {errors.category ? <Text style={styles.fieldError}>{errors.category}</Text> : null}

            <Text style={styles.fieldLabel}>Description <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description ? styles.inputErr : null]}
              placeholder="Condition, size, manufacturer, jump count…"
              value={form.description}
              onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#B8C5D0"
            />
            {errors.description ? <Text style={styles.fieldError}>{errors.description}</Text> : null}

            <Text style={styles.fieldLabel}>Email <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputErr : null]}
              placeholder="your@email.com"
              value={form.email}
              onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#B8C5D0"
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

            <Text style={styles.fieldLabel}>
              Phone <Text style={styles.opt}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
              keyboardType="phone-pad"
              placeholderTextColor="#B8C5D0"
            />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Show phone publicly</Text>
                <Text style={styles.toggleSub}>Buyers will see your number</Text>
              </View>
              <Switch
                value={form.showPhone}
                onValueChange={(v) => setForm((f) => ({ ...f, showPhone: v }))}
                trackColor={{ false: '#E2EAF0', true: '#BFDBFE' }}
                thumbColor={form.showPhone ? '#3B82F6' : '#E8EFF5'}
              />
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>

          <View style={styles.sellActionBar}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.publishBtn, publishing && styles.publishBtnDisabled]}
              onPress={handlePublish}
              disabled={publishing}
            >
              {publishing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.publishBtnText}>Publish</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showCategoryPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryPicker(false)}
          >
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Select Category</Text>
              {MARKETPLACE_CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const IconComp = meta.icon;
                const selected = form.category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.sheetRow, selected && { backgroundColor: meta.bg }]}
                    onPress={() => {
                      setForm((f) => ({ ...f, category: cat }));
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View style={[styles.sheetIconBox, { backgroundColor: selected ? meta.accent : meta.bg }]}>
                      <IconComp size={15} color={selected ? '#FFF' : meta.accent} strokeWidth={2} />
                    </View>
                    <Text style={[styles.sheetRowText, selected && { color: meta.accent, fontWeight: '700' }]}>
                      {cat}
                    </Text>
                    {selected && <View style={[styles.sheetTick, { backgroundColor: meta.accent }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<MarketplaceCategory | 'All'>('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [defaultEmail, setDefaultEmail] = useState('');

  useEffect(() => {
    if (user?.email) setDefaultEmail(user.email);
  }, [user]);

  useEffect(() => {
    const unsub = subscribeToListings((items) => {
      setListings(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = listings.filter((l) => {
    const matchesCat = activeCategory === 'All' || l.category === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      l.title.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const handleDone = () => setFiltersOpen(false);

  return (
    <View style={styles.screen}>
      <Header title="Marketplace" showBack showNotifications={false} />

      {/* Search bar + expandable filter panel */}
      <View style={styles.topSection}>
        {/* Search row */}
        <View style={styles.searchBar}>
          <Search size={18} color="#9AAAB8" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dropzone, disipline..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#AABBC8"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#9AAAB8" strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setFiltersOpen((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SlidersHorizontal
                size={18}
                color={filtersOpen || activeCategory !== 'All' ? '#1A2B3C' : '#9AAAB8'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Expandable filter panel */}
        {filtersOpen && (
          <FilterPanel
            categories={MARKETPLACE_CATEGORIES}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            onDone={handleDone}
          />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Package size={32} color="#9AAAB8" />
          </View>
          <Text style={styles.emptyTitle}>No listings found</Text>
          <Text style={styles.emptySubtitle}>
            {search || activeCategory !== 'All'
              ? 'Try a different search or category.'
              : 'Be the first to list some gear!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id ?? item.title}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <GridCard
              item={item}
              onPress={() => router.push(`/marketplace-detail?id=${item.id}`)}
            />
          )}
        />
      )}

      {/* Sell FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
        <Plus size={22} color="#FFF" strokeWidth={2.5} />
      </TouchableOpacity>

      <CreateListingModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onPublished={() => setShowCreate(false)}
        defaultEmail={defaultEmail}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#C8DEE6',
  },

  // Top section (search + filter panel)
  topSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A2B3C',
    padding: 0,
  },

  // Filter panel
  filterPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  filterChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#F3F5F7',
    borderWidth: 1.5,
    borderColor: '#EAEEF2',
  },
  filterChipActive: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A6278',
  },
  filterChipTextActive: {
    color: '#1A2B3C',
    fontWeight: '600',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    borderRadius: 22,
    paddingVertical: 15,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Grid
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 4,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImgWrap: {
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: CARD_WIDTH * 1.0,
    backgroundColor: '#E8F0F5',
  },
  cardImgPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCatBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  cardCatBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B6CBA',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#7A8E9C',
    fontWeight: '400',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // Empty / Loading
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B8299',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sell / Create listing modal
  sellContainer: {
    flex: 1,
    backgroundColor: '#F5F8FA',
  },
  sellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBF0F5',
    backgroundColor: '#FFFFFF',
  },
  sellHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#F3F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2B3C',
  },
  formScroll: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A6278',
    marginBottom: 6,
    marginTop: 16,
  },
  req: {
    color: '#EF4444',
  },
  opt: {
    color: '#B8C5D0',
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#1A2B3C',
    borderWidth: 1.5,
    borderColor: '#E2EAF0',
  },
  inputErr: {
    borderColor: '#EF4444',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  fieldError: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  pickerBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: '#E2EAF0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pickerSelectedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickerPlaceholder: {
    fontSize: 14,
    color: '#B8C5D0',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2EAF0',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2B3C',
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 11,
    color: '#9AAAB8',
  },
  addPhotoBtn: {
    width: 86,
    height: 86,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#EBF4FF',
    gap: 5,
  },
  addPhotoInner: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '700',
  },
  photoThumbWrap: {
    position: 'relative',
    marginRight: 10,
  },
  photoThumb: {
    width: 86,
    height: 86,
    borderRadius: 14,
    backgroundColor: '#EBF0F5',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellActionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBF0F5',
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2EAF0',
    paddingVertical: 14,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A6278',
  },
  publishBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  publishBtnDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0,
    elevation: 0,
  },
  publishBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Category sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2EAF0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2B3C',
    marginBottom: 14,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 12,
    marginBottom: 2,
  },
  sheetIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetRowText: {
    fontSize: 15,
    color: '#1A2B3C',
    flex: 1,
    fontWeight: '500',
  },
  sheetTick: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
