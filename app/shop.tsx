import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, onSnapshot, doc as firestoreDoc, limit } from 'firebase/firestore';
import { ShoppingCart, ArrowLeft, Package, ChevronDown, Ticket, Wallet, MapPin, Tag } from 'lucide-react-native';
import { getUserBalance } from '@/lib/balanceService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type CheckInStatus } from '@/lib/dropzoneService';
import { getCustomerData } from '@/lib/customerCache';
import { logger } from '@/lib/logger';
import { QUERY_LIMITS } from '@/lib/constants';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface PurchasedTicket {
  id: string;
  quantity: number;
  ticketType: string;
  dropzoneId: string;
  dropzoneName: string;
  price: number;
  currency: string;
  altitude?: number;
}

interface CouponCode {
  id: string;
  code: string;
  amount: number;
  customerId: string;
  used: boolean;
  dropzoneId: string;
  dropzoneName?: string;
  status?: string;
  redeemed?: boolean;
}

export default function ShopScreen() {
  const [activeTab, setActiveTab] = useState<'shop' | 'tickets' | 'couponcodes'>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>([]);
  const [couponCodes, setCouponCodes] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('AED');
  const [ticketsViewed, setTicketsViewed] = useState(false);
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckInStatus | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const productsListenerRef = useRef<(() => void) | null>(null);
  const checkInListenerRef = useRef<(() => void) | null>(null);

  useFocusEffect(useCallback(() => { loadTicketsViewedState(); }, []));

  useEffect(() => {
    if (!user) return;
    const setupCheckInListener = async () => {
      try {
        if (checkInListenerRef.current) {
          checkInListenerRef.current();
          checkInListenerRef.current = null;
        }
        const customerResult = await getCustomerData(user.uid);
        if (!customerResult) return;
        const customerDocRef = firestoreDoc(db, 'customers', customerResult.docId);
        const unsubscribe = onSnapshot(customerDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setCurrentCheckIn(data.currentDropzone || null);
          }
        }, (error) => { logger.error('Check-in listener error:', error); });
        checkInListenerRef.current = unsubscribe;
        return unsubscribe;
      } catch (error) {
        logger.error('Error setting up check-in listener:', error);
      }
    };
    const unsubscribePromise = setupCheckInListener();
    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) { unsubscribe(); checkInListenerRef.current = null; }
      });
    };
  }, [user]);

  useEffect(() => {
    if (!currentCheckIn) {
      if (productsListenerRef.current) { productsListenerRef.current(); productsListenerRef.current = null; }
      setProducts([]); setCategories([]); setLoading(false);
      return;
    }
    if (productsListenerRef.current) { productsListenerRef.current(); productsListenerRef.current = null; }
    setLoading(true);
    const dropzoneId = currentCheckIn.dropzoneId;

    const unsubscribeCategories = onSnapshot(
      collection(db, 'dropzones', dropzoneId, 'shop_categories'),
      (snapshot) => {
        const fetched: Category[] = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name || '' }));
        setCategories(fetched);
      },
      (error) => { logger.error('Categories listener error:', error); }
    );

    const unsubscribeProducts = onSnapshot(
      query(collection(db, 'dropzones', dropzoneId, 'shop_products'), limit(QUERY_LIMITS.PRODUCTS)),
      (snapshot) => {
        const prods: Product[] = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Product))
          .filter(p => p.active !== false);
        setProducts(prods);
        setLoading(false);
      },
      (error) => { logger.error('Products listener error:', error); setLoading(false); }
    );

    productsListenerRef.current = () => { unsubscribeCategories(); unsubscribeProducts(); };
    return () => {
      if (productsListenerRef.current) { productsListenerRef.current(); productsListenerRef.current = null; }
    };
  }, [currentCheckIn]);

  const loadTicketsViewedState = async () => {
    try {
      const viewed = await AsyncStorage.getItem('ticketsViewed');
      setTicketsViewed(viewed === 'true');
    } catch (error) { logger.error('Error loading tickets viewed state:', error); }
  };

  const markTicketsAsViewed = async () => {
    setTicketsViewed(true);
    try {
      await AsyncStorage.setItem('ticketsViewed', 'true');
      const fingerprint = JSON.stringify(purchasedTickets.map(t => `${t.ticketType}|${t.price}|${t.quantity}`).sort());
      await AsyncStorage.setItem('lastKnownTicketFingerprint', fingerprint);
    } catch (error) { logger.error('Error saving tickets viewed state:', error); }
  };

  useEffect(() => {
    if (!user || !currentCheckIn) { setBalance(null); return; }
    let isMounted = true;
    let unsubscribeCustomerDoc: (() => void) | null = null;
    let unsubscribeBalanceDoc: (() => void) | null = null;

    const setupBalanceListener = async () => {
      try {
        const dropzoneId = currentCheckIn.dropzoneId;
        const { getDropzoneById } = await import('@/lib/dropzoneService');
        const [customerResult, dropzone] = await Promise.all([getCustomerData(user.uid), getDropzoneById(dropzoneId)]);
        if (!isMounted) return;
        if (!customerResult) return;
        const customerId = customerResult.customerId;
        setCurrency(dropzone?.currency || 'AED');
        const dropzoneCustomersSnapshot = await getDocs(query(collection(db, 'dropzones', dropzoneId, 'customers'), where('customerId', '==', customerId)));
        if (!isMounted || dropzoneCustomersSnapshot.empty) { if (!dropzoneCustomersSnapshot.empty) setBalance(0); return; }
        const dropzoneCustomerId = dropzoneCustomersSnapshot.docs[0].id;
        unsubscribeCustomerDoc = onSnapshot(firestoreDoc(db, 'dropzones', dropzoneId, 'customers', dropzoneCustomerId), (doc) => {
          if (!isMounted) return;
          if (doc.exists() && typeof doc.data().balance === 'number') setBalance(doc.data().balance);
          else setBalance(0);
        });
        unsubscribeBalanceDoc = onSnapshot(firestoreDoc(db, 'dropzones', dropzoneId, 'customers', dropzoneCustomerId, 'credits', 'balance'), (doc) => {
          if (!isMounted) return;
          if (doc.exists()) setBalance(doc.data().balance || 0);
        });
      } catch (error) { logger.error('Error setting up balance listener:', error); }
    };
    setupBalanceListener();
    return () => {
      isMounted = false;
      unsubscribeCustomerDoc?.();
      unsubscribeBalanceDoc?.();
    };
  }, [user, currentCheckIn]);

  useEffect(() => {
    if (!user || !currentCheckIn) { setCouponCodes([]); return; }
    let cleanup: (() => void) | null = null;
    const fetch = async () => {
      try {
        const customerResult = await getCustomerData(user.uid);
        if (!customerResult) { setCouponCodes([]); return; }
        const unsubscribe = onSnapshot(
          query(collection(db, 'dropzones', currentCheckIn.dropzoneId, 'coupons'), where('customerId', '==', customerResult.customerId)),
          (snapshot) => {
            setCouponCodes(snapshot.docs.map(doc => {
              const data = doc.data();
              return { id: doc.id, code: data.code || doc.id, amount: data.amount || 0, customerId: data.customerId || '', used: data.used || false, dropzoneId: currentCheckIn.dropzoneId, dropzoneName: currentCheckIn.dropzoneName, status: data.status || (data.redeemed ? 'redeemed' : 'active'), redeemed: data.redeemed || false };
            }));
          },
          (error) => { logger.error('Coupon codes listener error:', error); }
        );
        cleanup = () => unsubscribe();
      } catch (error) { logger.error('Error setting up coupon codes listener:', error); }
    };
    fetch();
    return () => { if (cleanup) cleanup(); };
  }, [user, currentCheckIn]);

  useEffect(() => {
    if (!user || !currentCheckIn) { setPurchasedTickets([]); return; }
    let cleanup: (() => void) | null = null;
    const fetch = async () => {
      try {
        const customerResult = await getCustomerData(user.uid);
        if (!customerResult) { setPurchasedTickets([]); return; }
        const dropzoneCustomersSnapshot = await getDocs(query(collection(db, 'dropzones', currentCheckIn.dropzoneId, 'customers'), where('customerId', '==', customerResult.customerId)));
        if (dropzoneCustomersSnapshot.empty) { setPurchasedTickets([]); return; }
        const dropzoneCustomerDocId = dropzoneCustomersSnapshot.docs[0].id;

        const unsubscribe = onSnapshot(
          collection(db, 'dropzones', currentCheckIn.dropzoneId, 'customers', dropzoneCustomerDocId, 'purchases'),
          (snapshot) => {
            const tickets: PurchasedTicket[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data.canceled === true) return;
              if (data.items && Array.isArray(data.items)) {
                data.items.forEach((item: any, index: number) => {
                  if (item.canceled === true || item.used === true) return;
                  const usedCount = item.usedCount ?? 0;
                  const remaining = (item.quantity || 1) - usedCount;
                  if (remaining <= 0) return;
                  tickets.push({ id: `${doc.id}-item-${index}`, quantity: remaining, ticketType: item.name || 'Unknown Item', dropzoneId: currentCheckIn.dropzoneId, dropzoneName: data.dropzoneName || currentCheckIn.dropzoneName, price: item.price || 0, currency: data.currency || currency, altitude: data.altitude || 13000 });
                });
              }
            });
            const consolidated = tickets.reduce((acc, ticket) => {
              const existing = acc.find(t => t.ticketType.toLowerCase() === ticket.ticketType.toLowerCase() && t.price === ticket.price && t.dropzoneId === ticket.dropzoneId);
              if (existing) existing.quantity += ticket.quantity;
              else acc.push({ ...ticket });
              return acc;
            }, [] as PurchasedTicket[]);

            const fingerprint = JSON.stringify(consolidated.map(t => `${t.ticketType}|${t.price}|${t.quantity}|${t.dropzoneId}`).sort());
            AsyncStorage.getItem('lastKnownTicketFingerprint').then(last => {
              if (last !== null && fingerprint !== last) { setTicketsViewed(false); AsyncStorage.removeItem('ticketsViewed').catch(() => {}); }
              AsyncStorage.setItem('lastKnownTicketFingerprint', fingerprint).catch(() => {});
            }).catch(() => {});
            setPurchasedTickets(consolidated);
          },
          (error) => { logger.error('Purchases listener error:', error); }
        );
        cleanup = () => unsubscribe();
      } catch (error) { logger.error('Error setting up tickets listener:', error); }
    };
    fetch();
    return () => { if (cleanup) cleanup(); };
  }, [user, currentCheckIn, currency]);

  const loadCart = async () => {
    if (!user) return;
    try {
      const cartString = await AsyncStorage.getItem(`cart_${user.uid}`);
      if (cartString) {
        const cartData = JSON.parse(cartString);
        const newCart = new Map<string, number>();
        Object.entries(cartData).forEach(([productId, quantity]) => newCart.set(productId, quantity as number));
        setCart(newCart);
      } else { setCart(new Map()); }
    } catch (error) { setCart(new Map()); }
  };

  useEffect(() => { loadCart(); }, [user]);
  useFocusEffect(useCallback(() => { loadCart(); }, [user]));

  const saveCart = (newCart: Map<string, number>) => {
    if (!user) return;
    const cartData: { [key: string]: number } = {};
    newCart.forEach((quantity, productId) => { if (quantity > 0) cartData[productId] = quantity; });
    AsyncStorage.setItem(`cart_${user.uid}`, JSON.stringify(cartData));
  };

  const updateQuantity = (productId: string, delta: number) => {
    const currentQty = quantities.get(productId) || 1;
    const newQty = Math.max(1, currentQty + delta);
    const newQuantities = new Map(quantities);
    newQuantities.set(productId, newQty);
    setQuantities(newQuantities);
  };

  const getQuantity = (productId: string) => quantities.get(productId) || 1;

  const addToCart = (product: Product) => {
    if (!user) { Alert.alert('Error', 'Please sign in to add items to cart'); return; }
    const quantity = getQuantity(product.id);
    const newCart = new Map(cart);
    newCart.set(product.id, (newCart.get(product.id) || 0) + quantity);
    setCart(newCart);
    saveCart(newCart);
    const newQuantities = new Map(quantities);
    newQuantities.delete(product.id);
    setQuantities(newQuantities);
  };

  const getProductsByCategory = (): [string, Product[]][] => {
    const PRIORITY: { [name: string]: number } = { 'jumping tickets': 0, 'packing tickets': 1 };
    const sorted = [...categories].sort((a, b) => {
      const pa = PRIORITY[a.name.toLowerCase()] ?? 2;
      const pb = PRIORITY[b.name.toLowerCase()] ?? 2;
      if (pa !== pb) return pa - pb;
      return categories.indexOf(a) - categories.indexOf(b);
    });
    const entries: [string, Product[]][] = sorted.map(c => [c.id, products.filter(p => p.category === c.id)]);
    const knownIds = new Set(categories.map(c => c.id));
    const uncategorized = products.filter(p => !knownIds.has(p.category));
    if (uncategorized.length > 0) entries.push(['__uncategorized__', uncategorized]);
    return entries;
  };

  const getCategoryDisplayName = (categoryId: string) => {
    if (categoryId === '__uncategorized__') return 'Other';
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  const getValidCart = () => {
    const productIds = new Set(products.map(p => p.id));
    const valid = new Map<string, number>();
    cart.forEach((qty, id) => { if (qty > 0 && productIds.has(id)) valid.set(id, qty); });
    return valid;
  };

  const getTotalItems = () => Array.from(getValidCart().values()).reduce((sum, qty) => sum + qty, 0);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      if (prev.has(categoryId)) return new Set();
      return new Set([categoryId]);
    });
  };

  const getTicketsCount = () => {
    const filtered = currentCheckIn ? purchasedTickets.filter(t => t.dropzoneId === currentCheckIn.dropzoneId) : [];
    return filtered.reduce((sum, t) => sum + t.quantity, 0);
  };

  const getActiveCouponsCount = () =>
    currentCheckIn ? couponCodes.filter(c => c.dropzoneId === currentCheckIn.dropzoneId && c.status === 'active').length : 0;

  const renderProductCard = (product: Product) => {
    const quantity = getQuantity(product.id);
    return (
      <View key={product.id} style={styles.productCard}>
        <View style={styles.productTopRow}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>{product.price.toFixed(2)} {currency}</Text>
        </View>
        {product.description ? <Text style={styles.productDescription}>{product.description}</Text> : null}
        <View style={styles.productFooter}>
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => updateQuantity(product.id, -1)}>
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{quantity}</Text>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => updateQuantity(product.id, 1)}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.addToCartBtn} onPress={() => addToCart(product)} activeOpacity={0.8}>
            <ShoppingCart size={14} color="#fff" strokeWidth={2} />
            <Text style={styles.addToCartBtnText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCategorySection = ([categoryId, categoryProducts]: [string, Product[]]) => {
    if (categoryProducts.length === 0) return null;
    const isExpanded = expandedCategories.has(categoryId);
    return (
      <View key={categoryId} style={[styles.categoryCard, isExpanded && styles.categoryCardExpanded]}>
        <TouchableOpacity style={styles.categoryRow} onPress={() => toggleCategory(categoryId)} activeOpacity={0.7}>
          <View style={styles.categoryIconWrap}>
            <Package size={20} color="#6B7280" strokeWidth={1.5} />
          </View>
          <Text style={styles.categoryTitle}>{getCategoryDisplayName(categoryId)}</Text>
          <View style={[styles.chevronWrap, isExpanded && styles.chevronWrapOpen]}>
            <ChevronDown size={18} color="#9CA3AF" strokeWidth={2} />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.productsContainer}>
            {categoryProducts.map(p => renderProductCard(p))}
          </View>
        )}
      </View>
    );
  };

  const renderTicketCard = (ticket: PurchasedTicket) => (
    <View key={ticket.id} style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketIconWrap}>
          <Ticket size={20} color="#16A34A" />
        </View>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketName}>{ticket.ticketType}</Text>
          <Text style={styles.ticketDropzone}>{ticket.dropzoneName}</Text>
          {ticket.altitude ? <Text style={styles.ticketAltitude}>{ticket.altitude}ft</Text> : null}
        </View>
      </View>
      <View style={styles.ticketFooter}>
        <View style={styles.ticketQtyBadge}>
          <Text style={styles.ticketQtyText}>{ticket.quantity}x</Text>
        </View>
        <Text style={styles.ticketPrice}>{ticket.currency} {ticket.price}</Text>
      </View>
    </View>
  );

  const ticketsCount = getTicketsCount();
  const couponsCount = getActiveCouponsCount();
  const productsByCategory = getProductsByCategory();
  const totalProducts = products.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1A1A1A" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop</Text>
        <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/cart')}>
          <ShoppingCart size={22} color="#1A1A1A" strokeWidth={2} />
          {getTotalItems() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Scrollable content including sticky-ish header cards */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dropzone name pill */}
        {currentCheckIn && (
          <View style={styles.dropzoneRow}>
            <View style={styles.dropzonePill}>
              <MapPin size={13} color="#16A34A" strokeWidth={2} />
              <Text style={styles.dropzonePillText}>{currentCheckIn.dropzoneName}</Text>
            </View>
          </View>
        )}

        {/* Available Balance card */}
        {balance !== null && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceIconWrap}>
              <Wallet size={22} color="#8B5CF6" strokeWidth={1.8} />
            </View>
            <View style={styles.balanceTextBlock}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>{balance.toFixed(2)} {currency}</Text>
            </View>
          </View>
        )}

        {/* Tab bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.pillTab, activeTab === 'shop' && styles.pillTabActive]}
            onPress={() => setActiveTab('shop')}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillTabText, activeTab === 'shop' && styles.pillTabTextActive]}>Products</Text>
            {totalProducts > 0 && (
              <View style={[styles.pillBadge, activeTab === 'shop' ? styles.pillBadgeOnActive : styles.pillBadgeBlue]}>
                <Text style={styles.pillBadgeText}>{totalProducts}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillTab, activeTab === 'tickets' && styles.pillTabActive]}
            onPress={() => { setActiveTab('tickets'); markTicketsAsViewed(); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillTabText, activeTab === 'tickets' && styles.pillTabTextActive]}>Tickets</Text>
            {ticketsCount > 0 && (
              <View style={[styles.pillBadge, activeTab === 'tickets' ? styles.pillBadgeOnActive : (ticketsViewed ? styles.pillBadgeGrey : styles.pillBadgeBlue)]}>
                <Text style={[styles.pillBadgeText, ticketsViewed && activeTab !== 'tickets' && styles.pillBadgeTextGrey]}>{ticketsCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillTab, activeTab === 'couponcodes' && styles.pillTabActive]}
            onPress={() => router.push('/gift-cards')}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillTabText, activeTab === 'couponcodes' && styles.pillTabTextActive]}>Coupons</Text>
            {couponsCount > 0 && (
              <View style={[styles.pillBadge, activeTab === 'couponcodes' ? styles.pillBadgeOnActive : styles.pillBadgeBlue]}>
                <Text style={styles.pillBadgeText}>{couponsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : activeTab === 'shop' ? (
          !currentCheckIn ? (
            <View style={styles.centered}>
              <MapPin size={44} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Check in to a Dropzone</Text>
              <Text style={styles.emptySubtext}>You need to check in to view and purchase products</Text>
              <TouchableOpacity style={styles.goHomeBtn} onPress={() => router.push('/(tabs)/')}>
                <Text style={styles.goHomeBtnText}>Go to Home</Text>
              </TouchableOpacity>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.centered}>
              <Package size={44} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Products Available</Text>
              <Text style={styles.emptySubtext}>{currentCheckIn.dropzoneName} hasn't listed any products yet</Text>
            </View>
          ) : (
            <View style={styles.categoriesList}>
              {productsByCategory.map(entry => renderCategorySection(entry))}
            </View>
          )
        ) : activeTab === 'tickets' ? (
          (() => {
            const filtered = currentCheckIn ? purchasedTickets.filter(t => t.dropzoneId === currentCheckIn.dropzoneId) : [];
            return filtered.length === 0 ? (
              <View style={styles.centered}>
                <Ticket size={44} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>{currentCheckIn ? 'No Tickets' : 'Check in to View Tickets'}</Text>
                <Text style={styles.emptySubtext}>{currentCheckIn ? `You don't have any tickets for ${currentCheckIn.dropzoneName}` : 'Check in to a dropzone to see your available tickets'}</Text>
              </View>
            ) : (
              <View style={styles.ticketsList}>
                {filtered.map(t => renderTicketCard(t))}
              </View>
            );
          })()
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4E8F0' },

  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cartButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: '#EF4444', borderRadius: 9,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  dropzoneRow: {
    paddingBottom: 10,
  },
  dropzonePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: '#16A34A',
    borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  dropzonePillText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  balanceCard: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#FFFFFF', borderRadius: 18,
    padding: 18, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  balanceIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center', alignItems: 'center',
  },
  balanceTextBlock: { flex: 1 },
  balanceLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },

  // Tab bar — one white card matching balance card style
  tabBar: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#FFFFFF', borderRadius: 18,
    paddingVertical: 6, paddingHorizontal: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  pillTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 26,
  },
  pillTabActive: { backgroundColor: '#3B82F6' },
  pillTabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  pillTabTextActive: { color: '#fff' },
  // Badge on active tab: white circle
  pillBadgeOnActive: {
    minWidth: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  // Badge on inactive tab: blue circle
  pillBadgeBlue: {
    minWidth: 24, height: 24, borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  pillBadgeGrey: {
    minWidth: 24, height: 24, borderRadius: 12,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  pillBadge: {
    minWidth: 24, height: 24, borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  pillBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  pillBadgeTextGrey: { color: '#6B7280' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },

  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 64, paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18, fontWeight: '700', color: '#111827',
    marginTop: 16, marginBottom: 6, textAlign: 'center',
  },
  emptySubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  goHomeBtn: {
    backgroundColor: '#3B82F6', borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 20,
  },
  goHomeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  categoriesList: { gap: 10 },

  // Category card — white rounded card, products inside when expanded
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryCardExpanded: {},
  categoryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 18, paddingHorizontal: 18, gap: 12,
  },
  categoryIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  categoryTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  chevronWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  chevronWrapOpen: { transform: [{ rotate: '180deg' }] },

  productsContainer: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },

  // Product card — light grey background, nested inside category
  productCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
  },
  productTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  productName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  productDescription: { fontSize: 13, color: '#6B7280', marginBottom: 10, lineHeight: 18 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  productPrice: { fontSize: 15, fontWeight: '700', color: '#111827' },
  addToCartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3B82F6', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  addToCartBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 24,
    paddingHorizontal: 4, paddingVertical: 4, gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  stepperBtnText: { fontSize: 20, color: '#374151', fontWeight: '400', lineHeight: 22 },
  stepperValue: {
    minWidth: 28, textAlign: 'center',
    fontSize: 15, fontWeight: '600', color: '#111827',
  },

  // Tickets
  ticketsList: { gap: 10 },
  ticketCard: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  ticketHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  ticketIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center',
  },
  ticketInfo: { flex: 1 },
  ticketName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  ticketDropzone: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  ticketAltitude: { fontSize: 12, color: '#9CA3AF' },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketQtyBadge: {
    backgroundColor: '#EFF6FF', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  ticketQtyText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  ticketPrice: { fontSize: 15, fontWeight: '700', color: '#111827' },
});
