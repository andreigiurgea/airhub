import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deactivateStandby() {
  console.log('🔄 Deactivating standby mode...\n');

  const dropzoneId = 'tFhIQsIwN6Sju5VZZzHX'; // Palm Dropzone Dubai
  const standbyRef = doc(db, 'dropzones', dropzoneId, 'system', 'standby');

  try {
    await updateDoc(standbyRef, {
      isActive: false
    });

    console.log('✅ Standby mode deactivated!');
    console.log('\n📱 Expected behavior in the app:');
    console.log('   - Timer should RESUME updating every second');
    console.log('   - Load times should show REAL-TIME countdown');
    console.log('   - Times will update dynamically based on actual departure time');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

deactivateStandby();
