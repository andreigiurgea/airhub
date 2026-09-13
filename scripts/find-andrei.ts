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

async function findAndrei() {
  console.log('🔍 Searching for customers with "andrei" in name...\n');

  try {
    const customersRef = collection(db, 'customers');
    const customersSnap = await getDocs(customersRef);

    const matches: any[] = [];

    customersSnap.forEach(doc => {
      const data = doc.data();
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.toLowerCase();
      const nickname = (data.nickname || '').toLowerCase();

      if (fullName.includes('andrei') || nickname.includes('andrei')) {
        matches.push({
          docId: doc.id,
          ...data
        });
      }
    });

    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} customer(s):\n`);
      matches.forEach((customer, index) => {
        console.log(`[${index + 1}] ${customer.firstName} ${customer.lastName}`);
        console.log(`    customerId: ${customer.customerId}`);
        console.log(`    nickname: ${customer.nickname || 'none'}`);
        console.log(`    useNickname: ${customer.useNickname || false}`);
        console.log(`    accountId: ${customer.accountId}`);
        console.log('');
      });
    } else {
      console.log('❌ No customers found with "andrei" in name');
    }

    // Now check loads for any jumper with "andrei"
    console.log('\n🔍 Checking loads for jumpers with "andrei"...\n');
    const dropzoneId = 'tFhIQsIwN6Sju5VZZzHX';
    const loadsRef = collection(db, 'dropzones', dropzoneId, 'loads');
    const loadsSnap = await getDocs(loadsRef);

    loadsSnap.forEach(doc => {
      const data = doc.data();
      const jumpers = data.jumpers || [];

      jumpers.forEach((jumper: any) => {
        const jumperName = `${jumper.firstName || ''} ${jumper.lastName || ''} ${jumper.name || ''}`.toLowerCase();
        if (jumperName.includes('andrei')) {
          console.log(`Found in Load #${data.loadNumber} (${doc.id}):`);
          console.log(`   Name: ${jumper.name || `${jumper.firstName} ${jumper.lastName}`}`);
          console.log(`   customerId: ${jumper.customerId}`);
          console.log(`   id: ${jumper.id}`);
          console.log(`   Full data:`, JSON.stringify(jumper, null, 2));
          console.log('');
        }
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

findAndrei();
