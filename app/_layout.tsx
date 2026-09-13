import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { startLogbookMonitoring, stopLogbookMonitoring } from '@/lib/logbookService';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    startLogbookMonitoring();

    return () => {
      stopLogbookMonitoring();
    };
  }, []);

  return (
    <AuthProvider>
      <NotificationsProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" />
          <Stack.Screen name="waiver" options={{ headerShown: false }} />
          <Stack.Screen name="logbook-entry" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="+not-found" />
        </Stack>

        <StatusBar style="auto" />
      </NotificationsProvider>
    </AuthProvider>
  );
}
