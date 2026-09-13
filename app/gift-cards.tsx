import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { ArrowLeft, Gift, Copy, MapPin, Calendar, Clock } from 'lucide-react-native';
import { getCustomerData } from '@/lib/customerCache';
import { logger } from '@/lib/logger';
import { getCurrentCheckIn, type CheckInStatus } from '@/lib/dropzoneService';
import * as Clipboard from 'expo-clipboard';
import CustomAlert from '@/components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';

interface CouponCode {
  id: string;
  code: string;
  amount: number;
  customerId: string;
  used: boolean;
  dropzoneId: string;
  dropzoneName?: string;
  expiresAt?: any;
  message?: string;
  createdAt: any;
  status?: string;
  redeemed?: boolean;
  productName?: string;
}

export default function CouponCodesScreen() {
  const [couponCodes, setCouponCodes] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckInStatus | null>(null);
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
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const loadCheckInAndSetupListener = async () => {
      try {
        const checkIn = await getCurrentCheckIn(user.uid);
        setCurrentCheckIn(checkIn);

        if (!checkIn) {
          setLoading(false);
          return;
        }

        const customerResult = await getCustomerData(user.uid);

        if (!customerResult) {
          logger.log('No customer found for coupon codes');
          setLoading(false);
          return;
        }

        const customerId = customerResult.customerId;
        const dropzoneId = checkIn.dropzoneId;
        const dropzoneName = checkIn.dropzoneName;

        logger.log('✅ Setting up real-time coupon codes listener');

        const couponsRef = collection(db, 'dropzones', dropzoneId, 'coupons');
        const couponsQuery = query(couponsRef, where('customerId', '==', customerId));

        const unsubscribe = onSnapshot(couponsQuery, (snapshot) => {
          const codes: CouponCode[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();

            // Get product name from includedProducts array
            let productName = data.productName;

            if (!productName && data.includedProducts && Array.isArray(data.includedProducts) && data.includedProducts.length > 0) {
              productName = data.includedProducts[0].productName || data.includedProducts[0].name;
              logger.log('📦 Found product in includedProducts array:', productName);
            }

            codes.push({
              id: doc.id,
              code: data.code || doc.id,
              amount: data.amount || 0,
              customerId: data.customerId || '',
              used: data.used || false,
              dropzoneId: dropzoneId,
              dropzoneName: dropzoneName,
              expiresAt: data.expiresAt,
              message: data.message,
              createdAt: data.createdAt,
              status: data.status || 'active',
              redeemed: data.redeemed || false,
              productName: productName,
            });
          });

          logger.log('📡 Coupon codes updated:', codes.length);
          setCouponCodes(codes);
          setLoading(false);
        }, (error) => {
          logger.error('❌ Coupon codes listener error:', error);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        logger.error('Error setting up coupon codes listener:', error);
        setLoading(false);
      }
    };

    const unsubscribePromise = loadCheckInAndSetupListener();

    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, [user]);

  const copyToClipboard = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setAlertConfig({
        visible: true,
        title: 'Copied!',
        message: 'Coupon code copied to clipboard',
        buttons: [
          {
            text: 'OK',
            onPress: () => {},
            style: 'default',
          },
        ],
      });
    } catch (error) {
      logger.error('Error copying to clipboard:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to copy code',
        buttons: [
          {
            text: 'OK',
            onPress: () => {},
            style: 'default',
          },
        ],
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return null;

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return null;
    }
  };

  const renderCouponCode = (code: CouponCode) => {
    const expiryDate = formatDate(code.expiresAt);
    const status = code.status || (code.redeemed ? 'redeemed' : 'active');
    const isActive = status === 'active';
    const isRedeemed = status === 'redeemed';
    const isCanceled = status === 'canceled';

    const getCardStyle = () => {
      if (isRedeemed) return styles.couponCodeRedeemed;
      if (isCanceled) return styles.couponCodeCanceled;
      return null;
    };

    const isProductCoupon = code.productName && code.productName.trim() !== '';
    const displayAmount = code.amount > 0 ? `AED ${code.amount.toFixed(0)}` : 'Free';
    const badgeText = isProductCoupon ? 'Product' : displayAmount;
    const mainText = isProductCoupon ? displayAmount : displayAmount;
    const descriptionText = isProductCoupon
      ? code.productName
      : 'discount on your next purchase';

    return (
      <LinearGradient
        key={code.id}
        colors={
          isRedeemed ? ['#A0A0A0', '#808080'] :
          isCanceled ? ['#B85555', '#903030'] :
          ['#9B7EDE', '#7B5EC8']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.couponCode, getCardStyle()]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardBrandSection}>
            <Gift size={16} color="#FFFFFF" />
            <Text style={styles.cardBrand}>Coupon</Text>
          </View>
          <View style={styles.amountBadge}>
            <Text style={styles.amountText}>
              {badgeText}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.discountPercent}>
            {mainText}
          </Text>
          <Text style={styles.discountDescription}>
            {descriptionText}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <MapPin size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.footerLabel}>{code.dropzoneName || 'N/A'}</Text>
          </View>
          <View style={styles.footerItem}>
            <Clock size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.footerLabel}>{expiryDate || 'No expiry'}</Text>
          </View>
        </View>

        {isActive && (
          <TouchableOpacity
            style={styles.copyCodeButton}
            onPress={() => copyToClipboard(code.code)}
          >
            <Text style={styles.copyCodeText}>Copy Code</Text>
            <Copy size={16} color="#9B7EDE" />
          </TouchableOpacity>
        )}

        {!isActive && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {isRedeemed ? 'REDEEMED' : 'CANCELED'}
            </Text>
          </View>
        )}
      </LinearGradient>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coupons</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9B7EDE" />
          </View>
        ) : !currentCheckIn ? (
          <View style={styles.emptyContainer}>
            <Gift size={48} color="#999" />
            <Text style={styles.emptyTitle}>Check in to a Dropzone</Text>
            <Text style={styles.emptySubtext}>
              You need to check in to a dropzone to view your coupons
            </Text>
            <TouchableOpacity
              style={styles.checkInButton}
              onPress={() => router.push('/(tabs)/')}
            >
              <Text style={styles.checkInButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        ) : couponCodes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Gift size={48} color="#999" />
            <Text style={styles.emptyTitle}>No Coupons</Text>
            <Text style={styles.emptySubtext}>
              You don't have any coupons yet
            </Text>
          </View>
        ) : (
          <View style={styles.couponCodesGrid}>
            {couponCodes.map(renderCouponCode)}
          </View>
        )}
      </ScrollView>

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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  checkInButton: {
    backgroundColor: '#9B7EDE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  couponCodesGrid: {
    gap: 16,
  },
  couponCode: {
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  couponCodeRedeemed: {
    opacity: 0.7,
  },
  couponCodeCanceled: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardBrandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  amountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardBody: {
    marginBottom: 32,
  },
  discountPercent: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 60,
    marginBottom: 8,
  },
  productNameText: {
    fontSize: 32,
    lineHeight: 38,
  },
  discountDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 24,
    marginBottom: 20,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.85,
  },
  copyCodeButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  copyCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5FBF',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
