import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

async function demoCompleteRealtimeFlow() {
  const customerId = 'C8668912'; // andrei2@logix.com
  const accountId = 'dKwmEBclVdd46rb5lxmSWuLCQwL2';
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';

  console.log('================================================================================');
  console.log('COMPLETE REAL-TIME FLOW DEMONSTRATION');
  console.log('================================================================================\n');
  console.log('This demonstrates the complete purchase flow:');
  console.log('1. Cart checkout creates purchase in Firebase');
  console.log('2. Real-time listener immediately detects the change');
  console.log('3. Shop UI updates automatically');
  console.log('4. Items can be marked as used/canceled');
  console.log('5. UI updates again in real-time\n');

  const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
  const purchasesQuery = query(purchasesRef, where('customerId', '==', customerId));

  let updateCount = 0;
  let testPurchaseId: string | null = null;

  console.log('📡 Setting up real-time listener (like shop.tsx)...\n');

  const unsubscribe = onSnapshot(purchasesQuery, (snapshot) => {
    updateCount++;
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📡 REAL-TIME UPDATE #${updateCount} - Shop UI would update now!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const allTickets: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.canceled === true) {
        return;
      }

      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item: any, index: number) => {
          if (item.canceled === true || item.used === true) {
            return;
          }

          allTickets.push({
            id: `${doc.id}-item-${index}`,
            quantity: item.quantity || 1,
            ticketType: item.name || 'Unknown Item',
            dropzoneName: data.dropzoneName,
            price: item.price || 0,
            currency: data.currency || 'AED',
            altitude: data.altitude || 13000,
          });
        });
      }
    });

    console.log(`\n🎫 Tickets that would display in "My Tickets" tab: ${allTickets.length}`);
    allTickets.forEach((ticket, idx) => {
      console.log(`   ${idx + 1}. ${ticket.ticketType} x${ticket.quantity} - ${ticket.price} ${ticket.currency}`);
      console.log(`      Dropzone: ${ticket.dropzoneName}`);
      console.log(`      Altitude: ${ticket.altitude}ft`);
    });

    if (allTickets.length === 0) {
      console.log('   (No active tickets)');
    }
  }, (error) => {
    console.error('❌ Listener error:', error);
  });

  // Wait for initial snapshot
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log('\n\n🛒 STEP 1: User adds items to cart and clicks checkout');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log('Cart contains:');
  console.log('  - Product: Tandem Jump');
  console.log('  - Quantity: 2');
  console.log('  - Price: 750 RON each');
  console.log('  - Total: 1500 RON');
  console.log('\n💳 Processing checkout...\n');

  // Simulate cart.tsx checkout flow
  const purchaseDocRef = await addDoc(purchasesRef, {
    customerId,
    accountId,
    dropzoneId,
    dropzoneName: 'TNT Brothers Clinceni',
    items: [
      {
        name: 'Tandem Jump',
        quantity: 2,
        price: 750,
        productId: 'tandem-001',
        category: 'jumps',
        used: false,
        canceled: false,
      }
    ],
    totalAmount: 1500,
    amountFromBalance: 0,
    amountCharged: 1500,
    paymentMethod: 'card',
    currency: 'RON',
    altitude: 13000,
    purchasedAt: serverTimestamp(),
    status: 'completed',
    canceled: false,
  });

  testPurchaseId = purchaseDocRef.id;
  const refNumber = testPurchaseId.substring(0, 10).toUpperCase();

  await updateDoc(purchaseDocRef, {
    refNumber: refNumber,
  });

  console.log(`✅ Purchase created successfully!`);
  console.log(`   Purchase ID: ${testPurchaseId}`);
  console.log(`   Ref Number: ${refNumber}`);
  console.log('\n⏳ Waiting for real-time update to propagate...');

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n\n🎯 STEP 2: Staff marks one item as "used" (customer completed jump)');
  console.log('────────────────────────────────────────────────────────────────────────────────');

  const purchaseDocUpdate = doc(db, 'dropzones', dropzoneId, 'purchases', testPurchaseId);
  await updateDoc(purchaseDocUpdate, {
    'items.0.used': true,
  });

  console.log('✅ Marked first item as used');
  console.log('⏳ Waiting for real-time update...');

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n\n🗑️  STEP 3: Cleaning up test purchase');
  console.log('────────────────────────────────────────────────────────────────────────────────');

  await updateDoc(purchaseDocUpdate, {
    canceled: true,
  });

  console.log('✅ Purchase canceled');
  console.log('⏳ Waiting for final update...');

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n\n================================================================================');
  console.log('DEMONSTRATION COMPLETE');
  console.log('================================================================================');
  console.log(`✅ Real-time listener triggered ${updateCount} times`);
  console.log('✅ Each time, the UI would update immediately');
  console.log('✅ No page refresh needed');
  console.log('✅ Users see changes instantly');
  console.log('\nKey Points:');
  console.log('  • Purchases stored in: /dropzones/{dropzoneId}/purchases');
  console.log('  • No "tickets" collection created');
  console.log('  • Items have "used" and "canceled" flags');
  console.log('  • Real-time updates via Firebase onSnapshot()');
  console.log('  • Shop.tsx consolidates and displays tickets automatically');
  console.log('================================================================================\n');

  unsubscribe();
  process.exit(0);
}

demoCompleteRealtimeFlow().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
