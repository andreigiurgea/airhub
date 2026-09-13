import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Heart,
  Share2,
  Mail,
  Phone,
  Tag,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react-native';
import { getListingById, type MarketplaceListing, type MarketplaceCategory } from '@/lib/marketplaceService';

function formatDate(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CATEGORY_COLORS: Record<MarketplaceCategory, { bg: string; text: string; accent: string }> = {
  Rigs:        { bg: '#EBF4FF', text: '#1565C0', accent: '#3B82F6' },
  Containers:  { bg: '#F3EEFF', text: '#5B21B6', accent: '#8B5CF6' },
  Canopy:      { bg: '#ECFDF5', text: '#065F46', accent: '#10B981' },
  Helmets:     { bg: '#FFF9EB', text: '#92400E', accent: '#F59E0B' },
  Altimeters:  { bg: '#FFF0F6', text: '#9D174D', accent: '#EC4899' },
  Accessories: { bg: '#F0FDF4', text: '#166534', accent: '#22C55E' },
  Suits:       { bg: '#FFF5F5', text: '#991B1B', accent: '#EF4444' },
};

export default function MarketplaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'about' | 'contact'>('about');
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!id) return;
    getListingById(id).then((l) => {
      setListing(l);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <ChevronLeft size={20} color="#1A2B3C" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.screen}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <ChevronLeft size={20} color="#1A2B3C" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.notFound}>Listing not found.</Text>
        </View>
      </View>
    );
  }

  const cat = CATEGORY_COLORS[listing.category] ?? CATEGORY_COLORS.Rigs;
  const images = listing.images;

  return (
    <View style={styles.screen}>
      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <ChevronLeft size={20} color="#1A2B3C" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{listing.category}</Text>
        <View style={styles.navRight}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setLiked((v) => !v)}>
            <Heart
              size={18}
              color={liked ? '#EF4444' : '#1A2B3C'}
              fill={liked ? '#EF4444' : 'none'}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn}>
            <Share2 size={18} color="#1A2B3C" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          {images.length > 0 ? (
            <Image
              source={{ uri: images[imageIndex] }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <ImageIcon size={56} color="#C8D6E0" />
            </View>
          )}

          {/* Thumbnail column */}
          {images.length > 1 && (
            <View style={styles.thumbCol}>
              {images.slice(0, 4).map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => setImageIndex(i)}>
                  <Image
                    source={{ uri }}
                    style={[styles.thumbItem, i === imageIndex && styles.thumbItemActive]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Seller */}
          <View style={styles.sellerRow}>
            <View style={[styles.sellerIcon, { backgroundColor: cat.bg }]}>
              <Tag size={12} color={cat.accent} />
            </View>
            <Text style={styles.sellerEmail}>{listing.email}</Text>
          </View>

          <Text style={styles.title}>{listing.title}</Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={[styles.catPill, { backgroundColor: cat.bg }]}>
              <Text style={[styles.catPillText, { color: cat.text }]}>{listing.category}</Text>
            </View>
            {listing.createdAt && (
              <View style={styles.dateRow}>
                <Calendar size={12} color="#9AAAB8" />
                <Text style={styles.dateText}>{formatDate(listing.createdAt)}</Text>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'about' && { borderBottomColor: cat.accent }]}
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' && { color: cat.accent, fontWeight: '700' }]}>
                About Item
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'contact' && { borderBottomColor: cat.accent }]}
              onPress={() => setActiveTab('contact')}
            >
              <Text style={[styles.tabText, activeTab === 'contact' && { color: cat.accent, fontWeight: '700' }]}>
                Contact Seller
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'about' ? (
            <View style={styles.tabContent}>
              <Text style={styles.description}>{listing.description || 'No description provided.'}</Text>
            </View>
          ) : (
            <View style={styles.tabContent}>
              <View style={styles.contactItem}>
                <View style={[styles.contactIcon, { backgroundColor: cat.bg }]}>
                  <Mail size={16} color={cat.accent} />
                </View>
                <View>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>{listing.email}</Text>
                </View>
              </View>
              {listing.showPhone && listing.phone ? (
                <View style={styles.contactItem}>
                  <View style={[styles.contactIcon, { backgroundColor: '#FFF9EB' }]}>
                    <Phone size={16} color="#F59E0B" />
                  </View>
                  <View>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>{listing.phone}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>Listed on</Text>
          <Text style={styles.bottomDate}>{formatDate(listing.createdAt)}</Text>
        </View>
        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: cat.accent }]}>
          <Mail size={16} color="#FFF" strokeWidth={2} />
          <Text style={styles.contactBtnText}>Contact Seller</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5F9',
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B3C',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  navRight: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFound: {
    fontSize: 15,
    color: '#6B8299',
  },
  heroWrap: {
    position: 'relative',
    backgroundColor: '#F3F7FA',
  },
  heroImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F7FA',
  },
  heroPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbCol: {
    position: 'absolute',
    left: 12,
    top: 12,
    gap: 8,
  },
  thumbItem: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#E8EFF5',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  thumbItemActive: {
    borderColor: '#3B82F6',
  },
  body: {
    padding: 20,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sellerIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerEmail: {
    fontSize: 13,
    color: '#6B8299',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2B3C',
    lineHeight: 29,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#9AAAB8',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#EBF0F5',
    marginTop: 20,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 24,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    marginBottom: -1.5,
  },
  tabText: {
    fontSize: 14,
    color: '#9AAAB8',
    fontWeight: '500',
  },
  tabContent: {
    paddingTop: 18,
  },
  description: {
    fontSize: 15,
    color: '#4A6278',
    lineHeight: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5F9',
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 11,
    color: '#9AAAB8',
    fontWeight: '500',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    color: '#1A2B3C',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EBF0F5',
  },
  bottomLabel: {
    fontSize: 11,
    color: '#9AAAB8',
    marginBottom: 2,
  },
  bottomDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
