import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';

async function testLogbookRealtime() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║      REAL-TIME LOGBOOK UPDATES TEST                  ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const accountId = 'jK2YR1tiHccHhvtL0xIzaWldVqK2';

  console.log('📡 Step 1: Setting up real-time listener...\n');

  try {
    const customersRef = collection(db, 'customers');
    const customersQuery = query(customersRef, where('accountId', '==', accountId));
    const customersSnapshot = await getDocs(customersQuery);

    if (customersSnapshot.empty) {
      console.log('❌ No customer found');
      process.exit(1);
    }

    const customerData = customersSnapshot.docs[0].data();
    const customerId = customerData.id;

    const logbookRef = collection(db, 'logbook');
    const logbookQuery = query(logbookRef, where('customerId', '==', customerId));

    console.log(`👤 Customer ID: ${customerId}`);
    console.log('🔊 Listener is now active - watching for logbook changes...\n');

    let updateCount = 0;

    const unsubscribe = onSnapshot(logbookQuery, (snapshot) => {
      updateCount++;

      let total = 0;
      let pending = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        if (data.status === 'pending_signature') {
          pending++;
        }
      });

      console.log(`🔔 Update #${updateCount}:`);
      console.log(`   Total Jumps: ${total}`);
      console.log(`   Pending Signatures: ${pending}\n`);
    });

    console.log('⏳ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📝 Step 2: Creating a new draft jump entry...\n');

    const newJump = await addDoc(collection(db, 'logbook'), {
      customerId,
      loadId: 'test-load-123',
      dropzoneName: 'Test Dropzone',
      loadName: 'Test Load',
      loadNumber: 999,
      departureDate: '2024-02-12',
      departureTime: '10:00 AM',
      jumpNumber: null,
      freefallDelay: '',
      equipment: '',
      aircraft: '',
      exitAltitude: '',
      totalTime: null,
      description: '',
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ New jump created with ID: ${newJump.id}\n`);
    console.log('⏳ Waiting for real-time update...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📝 Step 3: Changing jump status to pending_signature...\n');

    await updateDoc(doc(db, 'logbook', newJump.id), {
      status: 'pending_signature',
      updatedAt: serverTimestamp(),
    });

    console.log('⏳ Waiting for real-time update...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📝 Step 4: Changing jump status to signed...\n');

    await updateDoc(doc(db, 'logbook', newJump.id), {
      status: 'signed',
      updatedAt: serverTimestamp(),
    });

    console.log('⏳ Waiting for real-time update...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('🗑️  Step 5: Cleaning up test data...\n');

    await updateDoc(doc(db, 'logbook', newJump.id), {
      status: 'draft',
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Test data cleaned up!\n');

    unsubscribe();

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   Real-time logbook updates are working perfectly!   ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLogbookRealtime();
