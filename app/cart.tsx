import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft, Trash2, CreditCard, Banknote, ShoppingBag, Wallet, Smartphone, Tag, Check, X, Building2, Apple, Percent } from 'lucide-react-native';
import { getUserBalance, processPurchaseWithBalance } from '@/lib/balanceService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentCheckIn, type CheckInStatus } from '@/lib/dropzoneService';
import { logger } from '@/lib/logger';
import { getCustomerData } from '@/lib/customerCache';
import CustomAlert from '@/components/CustomAlert';
import { create as createPurchase } from '@/lib/purchaseService';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  active: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface BulkDiscountRule {
  id: string;
  productId: string;
  productName: string;
  minQuantity: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  active: boolean;
  autoApply: boolean;
}

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  const [cardName, setCardName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardCVC, setCardCVC] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);

  const handleExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');

    if (cleaned.length <= 2) {
      setCardExpiry(cleaned);
    } else if (cleaned.length <= 4) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    }
  };
  const [currency, setCurrency] = useState<string>('AED');
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckInStatus | null>(null);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  } | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string>('');
  const [bulkRules, setBulkRules] = useState<BulkDiscountRule[]>([]);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons?: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({
    visible: false,
    title: '',
  });

  useEffect(() => {
    loadCartAndBalance();
  }, [user]);

  const loadCartAndBalance = async () => {
    if (!user) {
      router.replace('/login');
      return;
    }

    try {
      setLoading(true);

      const checkIn = await getCurrentCheckIn(user.uid);
      setCurrentCheckIn(checkIn);

      if (!checkIn) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      const cartString = await AsyncStorage.getItem(`cart_${user.uid}`);
      if (cartString) {
        const cartData = JSON.parse(cartString);
        const productIds = Object.keys(cartData);

        if (productIds.length > 0) {
          const dropzoneProductsRef = collection(db, 'dropzones', checkIn.dropzoneId, 'shop_products');
          const productsSnapshot = await getDocs(dropzoneProductsRef);
          const items: CartItem[] = [];

          productsSnapshot.docs.forEach(doc => {
            const product = { id: doc.id, ...doc.data() } as Product;
            const quantity = cartData[product.id];
            if (quantity && quantity > 0) {
              items.push({ product, quantity });
            }
          });

          setCartItems(items);
        }
      }

      const balanceData = await getUserBalance(user.uid);
      if (balanceData) {
        setBalance(balanceData.balance);
        setCurrency(balanceData.currency);
      }

      // Fetch active bulk discount rules for this dropzone
      try {
        const rulesRef = collection(db, 'dropzones', checkIn.dropzoneId, 'bulk_discount_rules');
        const rulesSnap = await getDocs(query(rulesRef, where('active', '==', true)));
        const rules: BulkDiscountRule[] = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() } as BulkDiscountRule));
        setBulkRules(rules);
      } catch (err) {
        logger.error('Error loading bulk discount rules:', err);
        setBulkRules([]);
      }
    } catch (error) {
      logger.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const getCouponDiscount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = getSubtotal();
    if (appliedCoupon.type === 'percentage') {
      return subtotal * (appliedCoupon.discount / 100);
    }
    return Math.min(appliedCoupon.discount, subtotal);
  };

  // Returns the best matching bulk discount rule for a cart item (highest qualifying minQuantity)
  const getBulkRuleForItem = (item: CartItem): BulkDiscountRule | null => {
    const matching = bulkRules.filter(
      r => r.autoApply && r.productId === item.product.id && item.quantity >= r.minQuantity
    );
    if (matching.length === 0) return null;
    return matching.reduce((best, r) => r.minQuantity > best.minQuantity ? r : best);
  };

  // Returns the discount amount for a single cart item
  const getBulkDiscountForItem = (item: CartItem): number => {
    const rule = getBulkRuleForItem(item);
    if (!rule) return 0;
    const lineTotal = item.product.price * item.quantity;
    if (rule.discountType === 'percentage') {
      return lineTotal * rule.discountValue / 100;
    }
    return rule.discountValue * item.quantity;
  };

  // Total bulk discount across all cart items
  const getTotalBulkDiscount = () => {
    return cartItems.reduce((sum, item) => sum + getBulkDiscountForItem(item), 0);
  };

  const getTotalAmount = () => {
    return Math.max(0, getSubtotal() - getTotalBulkDiscount() - getCouponDiscount());
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getBalanceApplied = () => {
    return Math.min(balance, getTotalAmount());
  };

  const getRemainingAmount = () => {
    return Math.max(0, getTotalAmount() - balance);
  };

  const getPaymentMethodLabel = () => {
    const labels: Record<string, string> = {
      card: 'Card',
      apple_pay: 'Apple Pay',
      google_pay: 'Google Pay',
    };
    return labels[selectedPaymentMethod] || selectedPaymentMethod;
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId);
      return;
    }

    const updatedItems = cartItems.map(item =>
      item.product.id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedItems);

    const cartData: { [key: string]: number } = {};
    updatedItems.forEach(item => {
      cartData[item.product.id] = item.quantity;
    });
    AsyncStorage.setItem(`cart_${user!.uid}`, JSON.stringify(cartData));
  };

  const removeItem = (productId: string) => {
    const updatedItems = cartItems.filter(item => item.product.id !== productId);
    setCartItems(updatedItems);

    const cartData: { [key: string]: number } = {};
    updatedItems.forEach(item => {
      cartData[item.product.id] = item.quantity;
    });
    AsyncStorage.setItem(`cart_${user!.uid}`, JSON.stringify(cartData));
  };

  const clearCart = () => {
    setCartItems([]);
    AsyncStorage.removeItem(`cart_${user!.uid}`);
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    if (getRemainingAmount() <= 0) {
      setCouponError('No amount to pay — coupon cannot be applied');
      return;
    }

    if (!currentCheckIn) {
      setCouponError('No active check-in found');
      return;
    }

    if (!user) {
      setCouponError('Please sign in to use a coupon');
      return;
    }

    try {
      setCouponValidating(true);
      setCouponError('');

      const customerResult = await getCustomerData(user.uid);
      if (!customerResult) {
        setCouponError('Customer profile not found');
        return;
      }

      const customerId = customerResult.customerId;

      const couponsRef = collection(db, 'dropzones', currentCheckIn.dropzoneId, 'coupons');
      const q = query(couponsRef, where('code', '==', couponCode.trim().toUpperCase()));
      const couponCodesSnap = await getDocs(q);

      if (couponCodesSnap.empty) {
        setCouponError('Invalid coupon code');
        return;
      }

      const couponCodeDoc = couponCodesSnap.docs[0];
      const couponCodeData = couponCodeDoc.data();

      if (couponCodeData.status !== 'active') {
        setCouponError('This coupon is no longer active');
        return;
      }

      if (couponCodeData.redeemed) {
        setCouponError('This coupon has already been used');
        return;
      }

      if (couponCodeData.customerId && couponCodeData.customerId !== customerId) {
        setCouponError('This coupon is not assigned to you');
        return;
      }

      if (couponCodeData.expiresAt) {
        let expiryDate: Date;
        if (couponCodeData.expiresAt.toDate) {
          expiryDate = couponCodeData.expiresAt.toDate();
        } else if (couponCodeData.expiresAt.seconds) {
          expiryDate = new Date(couponCodeData.expiresAt.seconds * 1000);
        } else if (typeof couponCodeData.expiresAt === 'string') {
          expiryDate = new Date(couponCodeData.expiresAt);
        } else {
          expiryDate = new Date(couponCodeData.expiresAt);
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);

        if (expiryDate < now) {
          setCouponError('This coupon has expired');
          return;
        }
      }

      const couponAmount = couponCodeData.amount || 0;
      const currentTotal = getRemainingAmount();

      if (couponAmount > currentTotal) {
        setAlertConfig({
          visible: true,
          title: 'Coupon Value Exceeds Total',
          message: `The coupon amount (${currency} ${couponAmount.toFixed(2)}) is greater than your amount to pay (${currency} ${currentTotal.toFixed(2)}). Are you sure you want to redeem it?`,
          buttons: [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setCouponCode('');
              }
            },
            {
              text: 'Redeem',
              style: 'default',
              onPress: () => {
                setAppliedCoupon({
                  code: couponCodeData.code,
                  discount: couponAmount,
                  type: 'fixed',
                });
                setCouponCode('');
                setCouponError('');
              }
            }
          ]
        });
        return;
      }

      setAppliedCoupon({
        code: couponCodeData.code,
        discount: couponAmount,
        type: 'fixed',
      });

      setCouponCode('');
      setCouponError('');
    } catch (error) {
      logger.error('Error validating coupon:', error);
      setCouponError('Failed to validate coupon');
    } finally {
      setCouponValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const handleCheckout = async () => {
    if (!user) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Please sign in to complete purchase',
        buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }],
      });
      return;
    }

    if (cartItems.length === 0) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Your cart is empty',
        buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }],
      });
      return;
    }

    const totalAmount = getTotalAmount();
    const balanceApplied = getBalanceApplied();
    const remaining = getRemainingAmount();

    try {
      setProcessing(true);

      const customerResult = await getCustomerData(user.uid);

      if (!customerResult) {
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'Customer profile not found',
          buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }],
        });
        return;
      }

      const customerId = customerResult.customerId;
      const customerData = customerResult.data;

      if (!currentCheckIn) {
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'No active check-in found. Please check in to a dropzone first.',
          buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }],
        });
        return;
      }

      const dropzoneCustomersRef = collection(db, 'dropzones', currentCheckIn.dropzoneId, 'customers');
      const dropzoneCustomersQuery = query(dropzoneCustomersRef, where('customerId', '==', customerId));
      const dropzoneCustomersSnapshot = await getDocs(dropzoneCustomersQuery);

      if (dropzoneCustomersSnapshot.empty) {
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'Customer record not found for this dropzone.',
          buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }],
        });
        return;
      }

      const dropzoneCustomerDocId = dropzoneCustomersSnapshot.docs[0].id;

      let paymentResult;
      if (balanceApplied > 0) {
        paymentResult = await processPurchaseWithBalance(user.uid, totalAmount);
        if (!paymentResult) {
          setAlertConfig({
            visible: true,
            title: 'Error',
            message: 'Failed to process balance payment',
            buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }],
          });
          return;
        }
      }

      const subtotal = getSubtotal();
      const bulkDiscount = getTotalBulkDiscount();
      const couponDiscount = getCouponDiscount();

      const finalPaymentMethod = balanceApplied > 0 && remaining > 0
        ? `balance+${selectedPaymentMethod}`
        : (remaining > 0 ? selectedPaymentMethod : 'balance');

      const purchaseId = await createPurchase({
        accountId: user.uid,
        customerId,
        dropzoneId: currentCheckIn.dropzoneId,
        dropzoneName: currentCheckIn.dropzoneName || '',
        dropzoneCustomerDocId,
        items: cartItems.map(item => {
          const itemDiscount = getBulkDiscountForItem(item);
          const effectiveLineTotal = item.product.price * item.quantity - itemDiscount;
          const effectiveUnitPrice = effectiveLineTotal / item.quantity;
          return {
            name: item.product.name,
            quantity: item.quantity,
            price: Math.round(effectiveUnitPrice * 100) / 100,
            productId: item.product.id,
            category: item.product.category,
          };
        }),
        totalAmount,
        subtotal,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: couponDiscount + bulkDiscount,
        amountFromBalance: paymentResult?.amountFromBalance || 0,
        amountCharged: paymentResult?.amountCharged ?? totalAmount,
        paymentMethod: finalPaymentMethod,
        currency,
      });

      const refNumber = purchaseId.substring(0, 10).toUpperCase();

      clearCart();

      const now = new Date();
      const formattedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const label = getPaymentMethodLabel();
      let methodDisplay = '';
      if (balanceApplied > 0 && remaining > 0) {
        methodDisplay = `Balance + ${label}`;
      } else if (balanceApplied > 0) {
        methodDisplay = 'Account Balance';
      } else {
        methodDisplay = `${label} Payment`;
      }

      const successData = {
        refNumber: refNumber,
        date: formattedDate,
        methodDisplay,
        totalPaid: remaining.toFixed(2),
        balanceUsed: balanceApplied > 0 ? balanceApplied.toFixed(2) : null,
        remainingPaid: remaining > 0 ? remaining.toFixed(2) : null,
        remainingMethod: remaining > 0 ? label : null,
        items: cartItems.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })),
        currency: currency,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: couponDiscount > 0 ? couponDiscount.toFixed(2) : null,
        bulkDiscount: bulkDiscount > 0 ? bulkDiscount.toFixed(2) : null,
        subtotalBeforeDiscount: subtotal.toFixed(2),
      };

      router.replace({
        pathname: '/purchase-success',
        params: { purchaseData: JSON.stringify(successData) }
      });
    } catch (error: any) {
      logger.error('Checkout error:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: `Failed to complete purchase: ${error?.message || 'Unknown error'}`,
        buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }],
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9B7EDE" />
        </View>
      </View>
    );
  }

  const totalAmount = getTotalAmount();
  const balanceApplied = getBalanceApplied();
  const remaining = getRemainingAmount();
  const fullyCoveredByBalance = remaining === 0 && totalAmount > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart</Text>
        <View style={styles.placeholder} />
      </View>

      {!currentCheckIn ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={64} color="#CCC" />
          <Text style={styles.emptyText}>No Active Check-In</Text>
          <Text style={styles.emptySubtext}>Please check in to a dropzone to view your cart</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/(tabs)/')}
          >
            <Text style={styles.shopButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={64} color="#CCC" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>Add items from the shop to get started</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/shop')}
          >
            <Text style={styles.shopButtonText}>Go to Shop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items ({getTotalItems()})</Text>
              {cartItems.map((item) => (
                <View key={item.product.id} style={styles.cartItem}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.product.name}</Text>
                      <Text style={styles.itemUnitPrice}>{currency} {item.product.price.toFixed(2)} each</Text>
                    </View>
                    <View style={styles.itemControls}>
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Text style={styles.quantityButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeItem(item.product.id)}
                      >
                        <Trash2 size={18} color="#FF4444" />
                      </TouchableOpacity>
                      <View style={styles.itemPriceStack}>
                        {getBulkDiscountForItem(item) > 0 ? (
                          <>
                            <Text style={styles.itemOriginalPrice}>
                              {currency} {(item.product.price * item.quantity).toFixed(2)}
                            </Text>
                            <Text style={styles.itemDiscountedPrice}>
                              {currency} {(item.product.price * item.quantity - getBulkDiscountForItem(item)).toFixed(2)}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.itemTotalText}>
                            {currency} {(item.product.price * item.quantity).toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  {(() => {
                    const rule = getBulkRuleForItem(item);
                    const disc = getBulkDiscountForItem(item);
                    if (!rule || disc <= 0) return null;
                    const label = rule.discountType === 'percentage'
                      ? `${rule.discountValue}% bulk discount`
                      : `${currency} ${rule.discountValue.toFixed(2)} off per item`;
                    return (
                      <View style={styles.bulkBadge}>
                        <Percent size={12} color="#059669" strokeWidth={2.5} />
                        <Text style={styles.bulkBadgeText}>{label} — saves {currency} {disc.toFixed(2)}</Text>
                      </View>
                    );
                  })()}
                </View>
              ))}
            </View>

            <View style={styles.couponSection}>
              <Text style={styles.sectionTitle}>Coupon Code</Text>
              {!appliedCoupon ? (
                <>
                  <View style={styles.couponInputContainer}>
                    <View style={styles.couponInputWrapper}>
                      <Tag size={18} color="#999" />
                      <TextInput
                        style={styles.couponInput}
                        placeholder="Enter code"
                        value={couponCode}
                        onChangeText={(text) => {
                          setCouponCode(text.toUpperCase());
                          setCouponError('');
                        }}
                        autoCapitalize="characters"
                        editable={!couponValidating}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.applyButton, couponValidating && styles.applyButtonDisabled]}
                      onPress={validateCoupon}
                      disabled={couponValidating}
                    >
                      {couponValidating ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.applyButtonText}>Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {couponError ? (
                    <View style={styles.couponErrorContainer}>
                      <View style={styles.errorBadge}>
                        <Text style={styles.errorBadgeText}>i</Text>
                      </View>
                      <Text style={styles.couponErrorText}>{couponError}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={styles.appliedCouponContainer}>
                  <View style={styles.appliedCouponContent}>
                    <Check size={18} color="#4CAF50" />
                    <Text style={styles.appliedCouponText}>
                      {appliedCoupon.code} - {appliedCoupon.type === 'percentage'
                        ? `${appliedCoupon.discount}% off`
                        : `${currency} ${appliedCoupon.discount.toFixed(2)} off`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponButton}>
                    <X size={18} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.orderSummarySection}>
              <Text style={styles.orderSummaryTitle}>Order Summary</Text>

              <View style={styles.orderSummaryRow}>
                <Text style={styles.orderSummaryLabel}>Subtotal</Text>
                <Text style={styles.orderSummaryValue}>{currency} {getSubtotal().toFixed(2)}</Text>
              </View>

              {getTotalBulkDiscount() > 0 && (
                <View style={styles.orderSummaryRow}>
                  <View style={styles.couponDiscountLabel}>
                    <Percent size={15} color="#059669" strokeWidth={2.5} />
                    <Text style={styles.bulkDiscountSummaryText}>Bulk discount</Text>
                  </View>
                  <Text style={styles.bulkDiscountSummaryValue}>- {currency} {getTotalBulkDiscount().toFixed(2)}</Text>
                </View>
              )}

              {getCouponDiscount() > 0 && (
                <View style={styles.orderSummaryRow}>
                  <View style={styles.couponDiscountLabel}>
                    <Tag size={16} color="#FF9800" />
                    <Text style={styles.couponDiscountText}>Coupon discount</Text>
                  </View>
                  <Text style={styles.couponDiscountValue}>- {currency} {getCouponDiscount().toFixed(2)}</Text>
                </View>
              )}

              {balance > 0 && (
                <View style={styles.orderSummaryRow}>
                  <View style={styles.balanceLabelRow}>
                    <Wallet size={15} color={balanceApplied > 0 ? '#009688' : '#8A9BAC'} />
                    <Text style={[styles.balanceDeductLabel, balanceApplied === 0 && styles.balanceLabelInactive]}>
                      Available Balance
                    </Text>
                  </View>
                  <Text style={[styles.balanceDeductValue, balanceApplied === 0 && styles.balanceValueInactive]}>
                    {currency} {balance.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.orderSummaryDivider} />

              <View style={styles.orderSummaryTotalRow}>
                <Text style={styles.orderSummaryTotalLabel}>To Pay</Text>
                <Text style={styles.orderSummaryTotalValue}>{currency} {remaining.toFixed(2)}</Text>
              </View>

              {balanceApplied > 0 && remaining === 0 && (
                <Text style={styles.fullyCoveredNote}>Fully covered by your balance</Text>
              )}
            </View>

            {!fullyCoveredByBalance && (
              <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Payment Method</Text>

                <View style={styles.paymentMethodContainer}>
                  <TouchableOpacity
                    style={styles.paymentMethodHeader}
                    onPress={() => setSelectedPaymentMethod('card')}
                  >
                    <View style={styles.paymentMethodLeft}>
                      <CreditCard size={20} color="#9B7EDE" />
                      <Text style={styles.paymentMethodText}>Card</Text>
                    </View>
                    <View style={styles.paymentMethodRight}>
                      <TouchableOpacity
                        style={[
                          styles.payButton,
                          selectedPaymentMethod === 'apple_pay' && styles.payButtonActive
                        ]}
                        onPress={() => setSelectedPaymentMethod('apple_pay')}
                      >
                        <Apple size={16} color={selectedPaymentMethod === 'apple_pay' ? '#9B7EDE' : '#666'} />
                        <Text style={[
                          styles.payButtonText,
                          selectedPaymentMethod === 'apple_pay' && styles.payButtonTextActive
                        ]}>Pay</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.payButton,
                          selectedPaymentMethod === 'google_pay' && styles.payButtonActive
                        ]}
                        onPress={() => setSelectedPaymentMethod('google_pay')}
                      >
                        <Text style={[
                          styles.googleIcon,
                          selectedPaymentMethod === 'google_pay' && styles.googleIconActive
                        ]}>G</Text>
                        <Text style={[
                          styles.payButtonText,
                          selectedPaymentMethod === 'google_pay' && styles.payButtonTextActive
                        ]}>Pay</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>

                  {selectedPaymentMethod === 'card' && (
                    <View style={styles.cardFormExpanded}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Card Name</Text>
                        <TextInput
                          style={styles.cardInput}
                          value={cardName}
                          onChangeText={setCardName}
                          placeholderTextColor="#999"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Card Number</Text>
                        <View style={styles.cardNumberContainer}>
                          <TextInput
                            style={styles.cardInput}
                            placeholder="0000-0000-0000-0000"
                            value={cardNumber}
                            onChangeText={setCardNumber}
                            keyboardType="numeric"
                            placeholderTextColor="#999"
                            maxLength={19}
                          />
                          <View style={styles.cardLogos}>
                            <Text style={styles.cardLogoText}>💳</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardRowInputs}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>CVC</Text>
                          <TextInput
                            style={styles.cardInput}
                            placeholder="000"
                            value={cardCVC}
                            onChangeText={setCardCVC}
                            keyboardType="numeric"
                            placeholderTextColor="#999"
                            maxLength={3}
                          />
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>Expire Date</Text>
                          <TextInput
                            style={styles.cardInput}
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChangeText={handleExpiryChange}
                            keyboardType="numeric"
                            placeholderTextColor="#999"
                            maxLength={5}
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.checkoutButton, processing && styles.checkoutButtonDisabled]}
              onPress={handleCheckout}
              disabled={processing}
            >
              <Text style={styles.checkoutButtonText}>
                {processing ? 'Processing...' : `Checkout - ${currency} ${remaining.toFixed(2)}`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#9B7EDE',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 100,
    marginTop: 24,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  itemPrice: {
    fontSize: 13,
    color: '#666',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: 4,
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  itemTotalText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 85,
    textAlign: 'right',
  },
  itemUnitPrice: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  itemPriceStack: {
    alignItems: 'flex-end',
    minWidth: 85,
  },
  itemOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    textAlign: 'right',
  },
  itemDiscountedPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'right',
  },
  bulkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  bulkBadgeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  paymentSection: {
    marginBottom: 24,
  },
  paymentMethodContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  paymentMethodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  payButtonActive: {
    borderColor: '#9B7EDE',
    backgroundColor: '#F5F0FF',
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  payButtonTextActive: {
    color: '#9B7EDE',
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  googleIconActive: {
    color: '#9B7EDE',
  },
  cardFormExpanded: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  cardInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  cardNumberContainer: {
    position: 'relative',
  },
  cardLogos: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLogoText: {
    fontSize: 24,
  },
  cardRowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  couponSection: {
    marginBottom: 24,
  },
  orderSummarySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderSummaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  couponDiscountLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  couponDiscountText: {
    fontSize: 14,
    color: '#FF9800',
  },
  couponDiscountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9800',
  },
  bulkDiscountSummaryText: {
    fontSize: 14,
    color: '#059669',
  },
  bulkDiscountSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  orderSummaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  orderSummaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderSummaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  orderSummaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  couponInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  couponInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#9B7EDE',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  couponErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  errorBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  couponErrorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '400',
    flex: 1,
  },
  appliedCouponContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  appliedCouponContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  appliedCouponText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  removeCouponButton: {
    padding: 4,
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#4CAF50',
  },
  balanceDeductLabel: {
    fontSize: 14,
    color: '#009688',
    fontWeight: '500',
  },
  balanceLabelInactive: {
    color: '#8A9BAC',
  },
  balanceDeductValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#009688',
    textAlign: 'right',
  },
  balanceValueInactive: {
    color: '#8A9BAC',
    fontWeight: '500',
  },
  balanceAmountColumn: {
    alignItems: 'flex-end',
  },
  balanceAppliedNote: {
    fontSize: 12,
    color: '#009688',
    fontWeight: '500',
    marginTop: 2,
  },
  fullyCoveredNote: {
    fontSize: 12,
    color: '#009688',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  balanceNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  checkoutButton: {
    backgroundColor: '#9B7EDE',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
