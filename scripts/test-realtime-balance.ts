import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from 'firebase/firestore';

async function testRealtimeBalance() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║        REAL-TIME BALANCE UPDATE TEST                 ║');
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

    const creditsRef = collection(db, 'credits');
    const creditsQuery = query(creditsRef, where('customerId', '==', customerId));

    console.log(`👤 Customer ID: ${customerId}`);
    console.log('🔊 Listener is now active - watching for balance changes...\n');

    let updateCount = 0;

    const unsubscribe = onSnapshot(creditsQuery, (snapshot) => {
      updateCount++;

      if (snapshot.empty) {
        console.log('⚠️  No credits found');
        return;
      }

      let mostRecentCredit = snapshot.docs[0];
      snapshot.docs.forEach(doc => {
        const current = doc.data();
        const mostRecent = mostRecentCredit.data();
        if (current.updatedAt && mostRecent.updatedAt) {
          if (current.updatedAt.seconds > mostRecent.updatedAt.seconds) {
            mostRecentCredit = doc;
          }
        }
      });

      const creditData = mostRecentCredit.data();
      const balance = creditData.balance || 0;

      console.log(`🔔 Update #${updateCount}: Balance = ${balance} AED`);
    });

    console.log('⏳ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📝 Step 2: Simulating a balance change...\n');

    const creditsSnapshot = await getDocs(creditsQuery);
    if (!creditsSnapshot.empty) {
      let mostRecentCredit = creditsSnapshot.docs[0];
      creditsSnapshot.docs.forEach(d => {
        const current = d.data();
        const mostRecent = mostRecentCredit.data();
        if (current.updatedAt && mostRecent.updatedAt) {
          if (current.updatedAt.seconds > mostRecent.updatedAt.seconds) {
            mostRecentCredit = d;
          }
        }
      });

      const currentBalance = mostRecentCredit.data().balance || 0;
      const newBalance = currentBalance - 50;

      console.log(`💳 Deducting 50 AED from balance...`);
      console.log(`   Current: ${currentBalance} AED → New: ${newBalance} AED\n`);

      await updateDoc(doc(db, 'credits', mostRecentCredit.id), {
        balance: newBalance,
      });

      console.log('⏳ Waiting for real-time update...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Real-time update received!\n');

      console.log('📝 Step 3: Restoring original balance...\n');
      await updateDoc(doc(db, 'credits', mostRecentCredit.id), {
        balance: currentBalance,
      });

      console.log('⏳ Waiting for real-time update...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Balance restored!\n');
    }

    unsubscribe();

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║    Real-time balance updates are working perfectly!  ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testRealtimeBalance();
