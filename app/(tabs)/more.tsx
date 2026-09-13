import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import {
  User,
  Ticket,
  Calendar,
  Users,
  ShoppingBag,
  Receipt,
  Wind,
  GraduationCap,
  ChevronRight,
  LogOut,
  BookOpen,
} from 'lucide-react-native';
import Header from '@/components/Header';
import { getCurrentCheckIn, checkOutFromDropzone, type CheckInStatus } from '@/lib/dropzoneService';

export default function MoreScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [checkIn, setCheckIn] = useState<CheckInStatus | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const currentCheckIn = await getCurrentCheckIn(user.uid);
      if (cancelled) return;
      setCheckIn(currentCheckIn);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const handleLogout = async () => {
    try {
      if (!user) return;

      const currentCheckIn = await getCurrentCheckIn(user.uid);

      if (currentCheckIn) {
        Alert.alert(
          'Check Out Required',
          `You are currently checked in at ${currentCheckIn.dropzoneName}. Logging out will also check you out from the dropzone.`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Logout & Check Out',
              style: 'destructive',
              onPress: async () => {
                await Promise.all([
                  checkOutFromDropzone(user.uid),
                  signOut()
                ]);
                router.replace('/(auth)/login');
              }
            }
          ]
        );
      } else {
        await signOut();
        router.replace('/(auth)/login');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to logout');
    }
  };

  const MenuItem = ({ icon: Icon, label, onPress, iconBg = '#E8F5E9', iconColor = '#4CAF50' }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Icon size={20} color={iconColor} />
        </View>
        <Text style={styles.menuItemText}>{label}</Text>
      </View>
      <ChevronRight size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Menu" showBack={false} showNotifications={true} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuGroup}>
          <MenuItem
            icon={User}
            label="Profile"
            onPress={() => router.push('/profile')}
            iconBg="#E3F2FD"
            iconColor="#2196F3"
          />
          <MenuItem
            icon={Ticket}
            label="Shop"
            onPress={() => router.push('/shop')}
            iconBg="#FFF3E0"
            iconColor="#FF9800"
          />
          <MenuItem
            icon={Calendar}
            label="Bookings"
            onPress={() => router.push('/bookings')}
            iconBg="#F3E5F5"
            iconColor="#9C27B0"
          />
          <MenuItem
            icon={Users}
            label="Groups"
            onPress={() => router.push('/(tabs)/groups')}
            iconBg="#E8F5E9"
            iconColor="#4CAF50"
          />
          <MenuItem
            icon={ShoppingBag}
            label="Equipment"
            onPress={() => router.push('/equipment')}
            iconBg="#FBE9E7"
            iconColor="#FF5722"
          />
          <MenuItem
            icon={Calendar}
            label="Camps and Events"
            onPress={() => router.push('/camps-events')}
            iconBg="#F3E5F5"
            iconColor="#E91E63"
          />
          <MenuItem
            icon={Receipt}
            label="Transaction History"
            onPress={() => router.push('/transaction-history')}
            iconBg="#E0F2F1"
            iconColor="#009688"
          />
          <MenuItem
            icon={BookOpen}
            label="Logbook"
            onPress={() => router.push('/logbook')}
            iconBg="#FFF8E1"
            iconColor="#F57C00"
          />
          <MenuItem
            icon={Wind}
            label="Marketplace"
            onPress={() => router.push('/marketplace')}
            iconBg="#E8F5E9"
            iconColor="#4CAF50"
          />
          <MenuItem
            icon={GraduationCap}
            label="Students"
            onPress={() => {}}
            iconBg="#FFF9C4"
            iconColor="#FBC02D"
          />
        </View>

        <View style={styles.logoutGroup}>
          <MenuItem
            icon={LogOut}
            label="Logout"
            onPress={handleLogout}
            iconBg="#FFEBEE"
            iconColor="#F44336"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  logoutGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
});
