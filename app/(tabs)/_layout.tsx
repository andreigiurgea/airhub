import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Plane, Map, House, TriangleAlert as AlertTriangle, Grid2x2 as Grid } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';

export default function TabLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('accountId', '==', user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const customerData = querySnapshot.docs[0].data();
          const isComplete = customerData.profileComplete === true &&
                           customerData.firstName &&
                           customerData.lastName;

          setProfileComplete(isComplete);

          if (!isComplete) {
            router.replace('/(auth)/profile-setup');
          }
        } else {
          router.replace('/(auth)/profile-setup');
        }
      } catch (error) {
        logger.error('Error checking profile:', error);
      } finally {
        setChecking(false);
      }
    };

    checkProfileCompletion();
  }, [user]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#D4E8F0' }}>
        <ActivityIndicator size="large" color="#7C5FDC" />
      </View>
    );
  }

  if (!profileComplete) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9B7EDE',
        tabBarInactiveTintColor: '#777777',
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 64,
          paddingVertical: 8,
          borderTopWidth: 0,
          borderRadius: 38,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 14,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarItemStyle: {
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[
              styles.tabIconWrapper,
              { backgroundColor: focused ? '#9B7EDE' : 'transparent' },
            ]}>
              <House size={22} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="dropzones"
        options={{
          title: '',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[
              styles.tabIconWrapper,
              { backgroundColor: focused ? '#9B7EDE' : 'transparent' },
            ]}>
              <Map size={22} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="loads"
        options={{
          title: '',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[
              styles.tabIconWrapper,
              { backgroundColor: focused ? '#9B7EDE' : 'transparent' },
            ]}>
              <Plane size={22} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: '',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[
              styles.tabIconWrapper,
              { backgroundColor: focused ? '#9B7EDE' : 'transparent' },
            ]}>
              <AlertTriangle size={22} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: '',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[
              styles.tabIconWrapper,
              { backgroundColor: focused ? '#9B7EDE' : 'transparent' },
            ]}>
              <Grid size={22} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    borderRadius: 18,
    padding: 6,
  },
});
