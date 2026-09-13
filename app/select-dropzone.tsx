import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, MapPin } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import {
  getAllDropzones,
  checkInToDropzone,
  type Dropzone,
} from '@/lib/dropzoneService';

export default function SelectDropzoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, checkWaiverForDropzone } = useAuth();

  const [dropzones, setDropzones] = useState<Dropzone[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  useEffect(() => {
    getAllDropzones().then((data) => {
      setDropzones(data);
      setLoading(false);
    });
  }, []);

  const handleCheckIn = async (dropzoneId: string, allowSwitch: boolean = false) => {
    if (!user || checkingInId) return;

    setCheckingInId(dropzoneId);

    const waiver = await checkWaiverForDropzone(dropzoneId);
    setCheckingInId(null);

    if (waiver.required && waiver.text && waiver.version) {
      const dz = dropzones.find((d) => d.id === dropzoneId);
      router.replace({
        pathname: '/waiver',
        params: {
          dropzoneId,
          dropzoneName: waiver.dropzoneName ?? dz?.name ?? dropzoneId,
          waiverText: waiver.text,
          waiverVersion: waiver.version,
          allowSwitch: allowSwitch ? 'true' : 'false',
        },
      });
      return;
    }

    setCheckingInId(dropzoneId);
    const result = await checkInToDropzone(user.uid, dropzoneId, allowSwitch);
    setCheckingInId(null);

    if (result.success) {
      router.back();
    } else if (result.needsConfirmation && result.currentDropzone) {
      Alert.alert(
        'Switch Dropzone',
        `You are currently checked in to ${result.currentDropzone}. Do you want to switch?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', onPress: () => handleCheckIn(dropzoneId, true) },
        ]
      );
    } else {
      Alert.alert('Check-in Failed', result.error || 'Unable to check in');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Select Dropzone" showBack={true} showNotifications={false} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {dropzones.map((dropzone, index) => {
              const isChecking = checkingInId === dropzone.id;
              const isLast = index === dropzones.length - 1;
              return (
                <View key={dropzone.id}>
                  <TouchableOpacity
                    style={[styles.item, isLast && styles.itemLast]}
                    onPress={() => handleCheckIn(dropzone.id)}
                    disabled={checkingInId !== null}
                    activeOpacity={0.65}
                  >
                    <View style={styles.itemIconWrap}>
                      <MapPin size={20} color="#555" strokeWidth={1.5} />
                    </View>
                    <Text style={styles.itemName} numberOfLines={1}>{dropzone.name}</Text>
                    <View style={styles.itemArrowWrap}>
                      {isChecking ? (
                        <ActivityIndicator size="small" color="#555" />
                      ) : (
                        <ArrowRight size={18} color="#555" strokeWidth={2} />
                      )}
                    </View>
                  </TouchableOpacity>
                  {!isLast && <View style={styles.separator} />}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  itemLast: {},
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 62,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    letterSpacing: -0.1,
  },
  itemArrowWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
