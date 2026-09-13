import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { checkInToDropzone } from '@/lib/dropzoneService';
import { ShieldCheck, ChevronDown, ArrowLeft } from 'lucide-react-native';

export default function WaiverScreen() {
  const params = useLocalSearchParams<{
    dropzoneId: string;
    dropzoneName: string;
    waiverText: string;
    waiverVersion: string;
    allowSwitch: string;
  }>();

  const { user, acceptWaiver } = useAuth();
  const router = useRouter();

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const { dropzoneId, dropzoneName, waiverText, waiverVersion, allowSwitch } = params;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 24) {
      setHasScrolledToBottom(true);
    }
  }, []);

  const handleAgree = async () => {
    if (!hasScrolledToBottom || !user) return;
    setLoading(true);
    setError('');
    try {
      await acceptWaiver(dropzoneId, waiverVersion);
      const result = await checkInToDropzone(user.uid, dropzoneId, allowSwitch === 'true');
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Check-in failed after waiver acceptance');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    router.back();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Top safe area + header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleDecline} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={20} color="#1A1A1A" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ShieldCheck size={18} color="#1A1A1A" strokeWidth={2} />
          <Text style={styles.headerTitle}>Waiver</Text>
        </View>
        {/* spacer to balance the back button */}
        <View style={styles.backButtonSpacer} />
      </View>

      {dropzoneName ? (
        <View style={styles.dzBadge}>
          <Text style={styles.dzBadgeText}>Required by {dropzoneName}</Text>
        </View>
      ) : null}

      {/* Waiver text scroll area */}
      <View style={styles.scrollCard}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.waiverText}>{waiverText}</Text>
          <View style={styles.scrollEndSpacer} />
        </ScrollView>

        {!hasScrolledToBottom && (
          <View style={styles.scrollCue}>
            <ChevronDown size={15} color="#6B7280" strokeWidth={2} />
            <Text style={styles.scrollCueText}>Scroll to read the full waiver</Text>
          </View>
        )}
      </View>

      {/* Error */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Action buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.agreeButton,
            (!hasScrolledToBottom || loading) && styles.agreeButtonDisabled,
          ]}
          onPress={handleAgree}
          disabled={!hasScrolledToBottom || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.agreeButtonText}>
              {hasScrolledToBottom ? 'I Agree & Check In' : 'Read entire waiver to continue'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={handleDecline}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const HEADER_TOP = Platform.OS === 'ios' ? 56 : 40;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  header: {
    paddingTop: HEADER_TOP,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonSpacer: {
    width: 36,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dzBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  dzBadgeText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  scrollCard: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  waiverText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 26,
  },
  scrollEndSpacer: {
    height: 52,
  },
  scrollCue: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  scrollCueText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 10,
  },
  agreeButton: {
    backgroundColor: '#2D3E50',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2D3E50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  agreeButtonDisabled: {
    backgroundColor: '#B0BEC5',
    shadowOpacity: 0,
    elevation: 0,
  },
  agreeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  declineButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
  },
  declineButtonText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '500',
  },
});
