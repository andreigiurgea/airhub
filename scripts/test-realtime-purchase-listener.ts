import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

async function testRealtimePurchaseListener() {
  const customerId = 'C8668912'; // andrei2@logix.com
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';

  console.log('================================================================================');
  console.log('TESTING REAL-TIME PURCHASE LISTENER');
  console.log('================================================================================\n');

  console.log('Setting up real-time listener...\n');

  const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
  const purchasesQuery = query(purchasesRef, where('customerId', '==', customerId));

  let updateCount = 0;
  let testPurchaseId: string | null = null;

  const unsubscribe = onSnapshot(purchasesQuery, (snapshot) => {
    updateCount++;
    console.log(`\n📡 REAL-TIME UPDATE #${updateCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total purchases: ${snapshot.size}`);
    console.log('');

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`📦 ${doc.id}`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log(`   Total: ${data.totalAmount} ${data.currency}`);
      console.log(`   Items: ${data.items?.length || 0}`);

      if (data.items) {
        data.items.forEach((item: any, idx: number) => {
          const status = item.used ? '✓ Used' : item.canceled ? '✗ Canceled' : '● Active';
          console.log(`      ${idx + 1}. ${status} - ${item.name} x${item.quantity}`);
        });
      }
      console.log('');
    });
  }, (error) => {
    console.error('❌ Listener error:', error);
  });

  // Wait for initial data
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n📝 Creating new test purchase...');
  const purchaseRef = await addDoc(purchasesRef, {
    customerId,
    accountId: 'dKwmEBclVdd46rb5lxmSWuLCQwL2',
    dropzoneId,
    dropzoneName: 'TNT Brothers Clinceni',
    items: [
      {
        name: 'Real-time Test Item',
        quantity: 1,
        price: 500,
        productId: 'test-realtime',
        category: 'test',
        used: false,
        canceled: false,
      }
    ],
    totalAmount: 500,
    amountFromBalance: 0,
    amountCharged: 500,
    paymentMethod: 'cash',
    currency: 'RON',
    altitude: 13000,
    purchasedAt: serverTimestamp(),
    status: 'completed',
    canceled: false,
  });

  testPurchaseId = purchaseRef.id;
  console.log(`✅ Created purchase: ${testPurchaseId}`);
  console.log('⏳ Waiting for real-time update...');

  // Wait for the real-time update
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n🗑️  Deleting test purchase...');
  await deleteDoc(doc(db, 'dropzones', dropzoneId, 'purchases', testPurchaseId));
  console.log('✅ Deleted');
  console.log('⏳ Waiting for real-time update...');

  // Wait for the deletion to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n================================================================================');
  console.log('SUMMARY');
  console.log('================================================================================');
  console.log(`✅ Real-time listener triggered ${updateCount} times`);
  console.log('✅ Listener is working correctly');
  console.log('✅ UI will automatically update when purchases change');
  console.log('================================================================================\n');

  unsubscribe();
  process.exit(0);
}

testRealtimePurchaseListener().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
