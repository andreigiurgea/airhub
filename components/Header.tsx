import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell } from 'lucide-react-native';
import { useNotifications } from '@/contexts/NotificationsContext';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
  rightAction?: React.ReactNode;
}

export default function Header({ title, showBack = false, onBack, showNotifications = true, rightAction }: HeaderProps) {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onBack ? onBack() : router.back()}
          >
            <ChevronLeft size={20} color="#1A1A1A" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.centerSection}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={[styles.rightSection, rightAction ? styles.rightSectionWide : undefined]}>
        {rightAction ? rightAction : showNotifications && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={20} color="#1A1A1A" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  leftSection: {
    width: 40,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    width: 40,
    alignItems: 'flex-end',
  },
  rightSectionWide: {
    width: 'auto',
    minWidth: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
