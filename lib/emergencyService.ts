import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { logger } from './logger';
import * as Location from 'expo-location';

export type EmergencyType = 'need_help' | 'all_good' | 'need_ride' | 'call_emergency';

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface EmergencyNotificationPayload {
  type: 'emergency';
  emergencyType: EmergencyType;
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
  message: string;
  location: EmergencyLocation | null;
  mapsLink: string | null;
  createdAt: any;
  read: boolean;
}

function buildMapsLink(location: EmergencyLocation): string {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

function getMessageForType(type: EmergencyType, customerName: string): string {
  switch (type) {
    case 'need_help':
      return `EMERGENCY: ${customerName} needs immediate help after landing away from the dropzone.`;
    case 'all_good':
      return `${customerName} is all good and walking back to the dropzone.`;
    case 'need_ride':
      return `${customerName} needs a ride back to the dropzone.`;
    case 'call_emergency':
      return `${customerName} has called emergency services (911).`;
  }
}

export async function sendDropzoneNotification(
  dropzoneId: string,
  type: EmergencyType,
  customerId: string,
  customerName: string,
  email: string,
  location: EmergencyLocation | null,
  phone: string = ''
): Promise<void> {
  const message = getMessageForType(type, customerName);
  const mapsLink = location ? buildMapsLink(location) : null;

  const payload: EmergencyNotificationPayload = {
    type: 'emergency',
    emergencyType: type,
    customerId,
    customerName,
    email,
    phone,
    message,
    location,
    mapsLink,
    createdAt: serverTimestamp(),
    read: false,
  };

  const notificationsRef = collection(db, 'dropzones', dropzoneId, 'notifications');
  await addDoc(notificationsRef, payload);

  logger.log(`Emergency notification sent to dropzone ${dropzoneId}:`, type);
}

export async function getCurrentLocation(): Promise<EmergencyLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      logger.error('Location permission denied');
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? undefined,
    };
  } catch (error) {
    logger.error('Geolocation error:', error);
    return null;
  }
}
