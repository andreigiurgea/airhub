import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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

async function testStandbyFrozenTimes() {
  console.log('🧪 Testing Standby Frozen Times\n');

  const dropzoneId = 'tFhIQsIwN6Sju5VZZzHX'; // Palm Dropzone Dubai
  const standbyRef = doc(db, 'dropzones', dropzoneId, 'system', 'standby');

  try {
    // Step 1: Check current standby state
    console.log('1️⃣ Checking current standby state...');
    const standbySnap = await getDoc(standbyRef);

    if (standbySnap.exists()) {
      const data = standbySnap.data();
      console.log('\n✅ Current standby state:');
      console.log('   isActive:', data.isActive);
      console.log('   activatedAt:', data.activatedAt);

      if (data.loadOffsets) {
        console.log('\n   Load Offsets:');
        Object.entries(data.loadOffsets).forEach(([loadId, offset]: [string, any]) => {
          console.log(`     Load ${loadId}:`);
          console.log(`       minutesUntilDeparture: ${offset.minutesUntilDeparture}`);
        });
      }
    } else {
      console.log('❌ No standby document found');
    }

    // Step 2: Activate standby mode with frozen times
    console.log('\n\n2️⃣ Activating standby mode...');
    await setDoc(standbyRef, {
      isActive: true,
      activatedAt: new Date().toISOString(),
      loadOffsets: [
        {
          loadId: 'rOctQO4ivVM54Wh8T0In',
          minutesUntilDeparture: 10
        },
        {
          loadId: 'nwhF6FwY4sM9kFttNmuH',
          minutesUntilDeparture: 15
        },
        {
          loadId: 'QvkLY3EOk51qFIO1r0zC',
          minutesUntilDeparture: 20
        }
      ]
    });
    console.log('✅ Standby mode activated with frozen times!');

    // Step 3: Verify the state
    console.log('\n3️⃣ Verifying standby state...');
    const verifySnap = await getDoc(standbyRef);
    if (verifySnap.exists()) {
      const data = verifySnap.data();
      console.log('\n✅ Verified standby state:');
      console.log('   isActive:', data.isActive);
      console.log('   activatedAt:', data.activatedAt);

      if (data.loadOffsets) {
        console.log('\n   Load Offsets (FROZEN TIMES):');
        Object.entries(data.loadOffsets).forEach(([loadId, offset]: [string, any]) => {
          console.log(`     Load ${loadId}: ${offset.minutesUntilDeparture} min (FROZEN)`);
        });
      }
    }

    console.log('\n\n✅ Test complete!');
    console.log('\n📱 Expected behavior in the app:');
    console.log('   - Timer should STOP updating');
    console.log('   - Load times should show EXACTLY as above');
    console.log('   - Adding/removing jumpers should NOT affect times');
    console.log('   - Times remain frozen until isActive is set to false');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

testStandbyFrozenTimes();
