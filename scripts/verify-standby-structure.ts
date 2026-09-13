import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

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

async function verifyStandbyStructure() {
  console.log('🔍 Verifying Standby Structure\n');

  const dropzoneId = 'tFhIQsIwN6Sju5VZZzHX'; // Palm Dropzone Dubai

  try {
    // Step 1: Get all loads to see their IDs
    console.log('1️⃣ Fetching all loads...\n');
    const loadsRef = collection(db, 'dropzones', dropzoneId, 'loads');
    const loadsSnap = await getDocs(loadsRef);

    const loads: any[] = [];
    loadsSnap.forEach(doc => {
      const data = doc.data();
      loads.push({
        id: doc.id,
        loadNumber: data.loadNumber,
        aircraftName: data.aircraftName,
        departureTime: data.departureTime
      });
    });

    // Sort by load number
    loads.sort((a, b) => a.loadNumber - b.loadNumber);

    console.log('📦 Current Loads:');
    loads.forEach(load => {
      console.log(`   Load ${load.loadNumber} (${load.aircraftName})`);
      console.log(`     ID: ${load.id}`);
      console.log(`     Departure: ${load.departureTime}\n`);
    });

    // Step 2: Check standby state
    console.log('2️⃣ Checking standby state...\n');
    const standbyRef = doc(db, 'dropzones', dropzoneId, 'system', 'standby');
    const standbySnap = await getDoc(standbyRef);

    if (standbySnap.exists()) {
      const data = standbySnap.data();
      console.log('✅ Standby document exists:');
      console.log(`   isActive: ${data.isActive}`);
      console.log(`   activatedAt: ${data.activatedAt}`);

      if (data.loadOffsets) {
        console.log('\n   Load Offsets:');
        if (Array.isArray(data.loadOffsets)) {
          console.log('   📋 Structure: ARRAY (correct)');
          data.loadOffsets.forEach((offset: any, index: number) => {
            console.log(`\n   [${index}]`);
            console.log(`     loadId: ${offset.loadId}`);
            console.log(`     minutesUntilDeparture: ${offset.minutesUntilDeparture}`);

            // Find matching load
            const matchingLoad = loads.find(l => l.id === offset.loadId);
            if (matchingLoad) {
              console.log(`     ✅ Matches: Load ${matchingLoad.loadNumber} (${matchingLoad.aircraftName})`);
            } else {
              console.log(`     ⚠️ WARNING: No matching load found!`);
            }
          });
        } else {
          console.log('   📋 Structure: OBJECT');
          Object.entries(data.loadOffsets).forEach(([loadId, offset]: [string, any]) => {
            console.log(`\n     ${loadId}:`);
            console.log(`       minutesUntilDeparture: ${offset.minutesUntilDeparture}`);

            // Find matching load
            const matchingLoad = loads.find(l => l.id === loadId);
            if (matchingLoad) {
              console.log(`       ✅ Matches: Load ${matchingLoad.loadNumber} (${matchingLoad.aircraftName})`);
            } else {
              console.log(`       ⚠️ WARNING: No matching load found!`);
            }
          });
        }
      } else {
        console.log('\n   ⚠️ No loadOffsets found');
      }

      // Step 3: Verify logic
      console.log('\n\n3️⃣ Verification Summary:\n');

      if (data.isActive) {
        console.log('✅ Standby is ACTIVE');
        console.log('   Expected behavior:');
        console.log('   - Timer should be STOPPED');
        console.log('   - Times should be FROZEN at the values above');
        console.log('   - Changes to loads should NOT affect times');
      } else {
        console.log('⏸️ Standby is INACTIVE');
        console.log('   Expected behavior:');
        console.log('   - Timer should be RUNNING');
        console.log('   - Times should be calculated in real-time');
      }

    } else {
      console.log('❌ No standby document found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

verifyStandbyStructure();
