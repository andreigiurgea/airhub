import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function checkManifestIssue() {
  console.log('🔍 Checking Manifest Issue for thisisandrei\n');

  const dropzoneId = 'tFhIQsIwN6Sju5VZZzHX'; // Palm Dropzone Dubai

  try {
    // Step 1: Find the customer
    console.log('1️⃣ Finding customer "thisisandrei"...\n');
    const customersRef = collection(db, 'customers');
    const customerQuery = query(customersRef, where('nickname', '==', 'thisisandrei'));
    const customerSnap = await getDocs(customerQuery);

    let customerId: string | null = null;
    let customerData: any = null;
    let accountId: string | null = null;

    if (!customerSnap.empty) {
      customerData = customerSnap.docs[0].data();
      customerId = customerData.customerId;
      accountId = customerData.accountId;
      console.log('✅ Found customer:');
      console.log(`   customerId: ${customerId}`);
      console.log(`   firstName: ${customerData.firstName}`);
      console.log(`   lastName: ${customerData.lastName}`);
      console.log(`   nickname: ${customerData.nickname}`);
      console.log(`   useNickname: ${customerData.useNickname}`);
      console.log(`   accountId: ${accountId}`);
    } else {
      console.log('❌ Customer not found');
      process.exit(0);
    }

    // Step 2: Check loads
    console.log('\n2️⃣ Checking all loads...\n');
    const loadsRef = collection(db, 'dropzones', dropzoneId, 'loads');
    const loadsQuery = query(loadsRef, where('status', '==', 'upcoming'));
    const loadsSnap = await getDocs(loadsQuery);

    const manifestedLoads: any[] = [];

    loadsSnap.forEach(doc => {
      const data = doc.data();
      const jumpers = data.jumpers || [];

      // Check if thisisandrei is in this load
      const isManifested = jumpers.some((j: any) =>
        j.customerId === customerId || j.id === customerId
      );

      if (isManifested) {
        const jumper = jumpers.find((j: any) =>
          j.customerId === customerId || j.id === customerId
        );
        manifestedLoads.push({
          loadId: doc.id,
          loadNumber: data.loadNumber,
          jumper: jumper
        });
      }

      console.log(`Load #${data.loadNumber} (${doc.id}):`);
      console.log(`   Total jumpers: ${jumpers.length}`);
      console.log(`   Is manifested: ${isManifested ? '✅ YES' : '❌ NO'}`);

      if (isManifested) {
        const jumper = jumpers.find((j: any) =>
          j.customerId === customerId || j.id === customerId
        );
        console.log(`   Jumper data:`, JSON.stringify(jumper, null, 2));
      }
      console.log('');
    });

    // Step 3: Summary
    console.log('\n3️⃣ Summary:\n');
    if (manifestedLoads.length > 0) {
      console.log(`✅ User is manifested on ${manifestedLoads.length} load(s):`);
      manifestedLoads.forEach(load => {
        console.log(`   - Load #${load.loadNumber} (${load.loadId})`);
        console.log(`     Stored as:`, JSON.stringify(load.jumper, null, 2));
      });

      console.log('\n🔍 Checking for ID matching issues:');
      console.log(`   Customer customerId: ${customerId}`);
      manifestedLoads.forEach(load => {
        console.log(`   Load #${load.loadNumber}:`);
        console.log(`     jumper.customerId: ${load.jumper.customerId}`);
        console.log(`     jumper.id: ${load.jumper.id}`);
        console.log(`     Match by customerId: ${load.jumper.customerId === customerId ? '✅' : '❌'}`);
        console.log(`     Match by id: ${load.jumper.id === customerId ? '✅' : '❌'}`);
      });
    } else {
      console.log('❌ User is NOT manifested on any loads');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkManifestIssue();
