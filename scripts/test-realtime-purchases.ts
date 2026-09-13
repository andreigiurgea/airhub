import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

async function testRealtimePurchases() {
  console.log('=== TESTING REAL-TIME PURCHASES LISTENERS ===\n');

  // Test with a sample user
  const testAccountId = 'user123'; // Replace with actual test user ID

  try {
    // Get customer
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('accountId', '==', testAccountId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ No customer found. Using first customer instead...');
      const allCustomers = await getDocs(customersRef);
      if (allCustomers.empty) {
        console.log('❌ No customers in database');
        return;
      }

      const firstCustomer = allCustomers.docs[0];
      const customerId = firstCustomer.data().id;

      console.log(`✅ Using customer: ${customerId}\n`);

      // Get all dropzones
      const dropzonesRef = collection(db, 'dropzones');
      const dropzonesSnapshot = await getDocs(dropzonesRef);

      console.log(`Found ${dropzonesSnapshot.size} dropzones\n`);

      const listeners: (() => void)[] = [];

      dropzonesSnapshot.forEach((dropzoneDoc) => {
        const dropzoneId = dropzoneDoc.id;
        const dropzoneName = dropzoneDoc.data().name;

        const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
        const purchasesQuery = query(purchasesRef, where('customerId', '==', customerId));

        console.log(`✅ Setting up listener for: ${dropzoneName}`);

        const unsubscribe = onSnapshot(purchasesQuery, (snapshot) => {
          console.log(`\n📡 REAL-TIME UPDATE from ${dropzoneName}:`);
          console.log(`   Total purchases: ${snapshot.size}`);

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.items && Array.isArray(data.items)) {
              const activeItems = data.items.filter((item: any) =>
                item.canceled !== true && item.used !== true
              );
              console.log(`   - Purchase ${doc.id}: ${activeItems.length} active items`);
              activeItems.forEach((item: any) => {
                console.log(`     • ${item.name} x${item.quantity || 1} @ ${item.price || 0} ${data.currency || 'AED'}`);
              });
            }
          });
        }, (error) => {
          console.error(`❌ Error listening to ${dropzoneName}:`, error);
        });

        listeners.push(unsubscribe);
      });

      console.log('\n✅ All listeners are now active!');
      console.log('Listening for 30 seconds...');
      console.log('(Any changes to purchases will appear here automatically)\n');

      // Keep the listeners active for 30 seconds
      await new Promise(resolve => setTimeout(resolve, 30000));

      console.log('\n🧹 Cleaning up listeners...');
      listeners.forEach(unsub => unsub());
      console.log('✅ Test complete!');

    } else {
      console.log('✅ Found customer');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testRealtimePurchases().catch(console.error);
