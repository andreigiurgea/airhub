import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDdd_KkSJE9qA1Zbk7ueuZheBtCIqmb3po",
  authDomain: "skydive-boogie.firebaseapp.com",
  projectId: "skydive-boogie",
  storageBucket: "skydive-boogie.firebasestorage.app",
  messagingSenderId: "773256254342",
  appId: "1:773256254342:web:6e790d81a402a335f7d207"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAllLoadsDetailed() {
  console.log('🔍 Checking All Loads (Detailed)\n');

  const dropzoneId = 'tFhIQsIwN6Sju5VZZzHX'; // Palm Dropzone Dubai

  try {
    const loadsRef = collection(db, 'dropzones', dropzoneId, 'loads');
    const loadsSnap = await getDocs(loadsRef);

    console.log(`Total loads found: ${loadsSnap.size}\n`);

    loadsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Load #${data.loadNumber} (${doc.id})`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Aircraft: ${data.aircraft}`);
      console.log(`Status: ${data.status}`);
      console.log(`Time: ${data.time}`);
      console.log(`Max Slots: ${data.maxSlots}`);
      console.log(`Jumpers: ${(data.jumpers || []).length}`);

      if (data.jumpers && data.jumpers.length > 0) {
        console.log('\nJumpers on this load:');
        data.jumpers.forEach((jumper: any, index: number) => {
          console.log(`  [${index + 1}] ${jumper.name || `${jumper.firstName} ${jumper.lastName}`}`);
          console.log(`      customerId: ${jumper.customerId}`);
          console.log(`      id: ${jumper.id}`);
          console.log(`      useNickname: ${jumper.useNickname}`);
          console.log(`      nickname: ${jumper.nickname || 'none'}`);
        });
      } else {
        console.log('\nNo jumpers on this load');
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkAllLoadsDetailed();
