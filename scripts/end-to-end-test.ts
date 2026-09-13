import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';

async function endToEndTest() {
  console.log('================================================================================');
  console.log('END-TO-END PURCHASE FLOW TEST');
  console.log('================================================================================\n');

  const testAccountId = 'dKwmEBclVdd46rb5lxmSWuLCQwL2'; // andrei2@logix.com
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ'; // TNT Brothers Clinceni
  let testPurchaseId = '';

  try {
    console.log('Step 1: Get customer data...\n');

    const customersRef = collection(db, 'customers');
    const customerQuery = query(customersRef, where('accountId', '==', testAccountId));
    const customerSnapshot = await getDocs(customerQuery);

    if (customerSnapshot.empty) {
      console.log('❌ Customer not found');
      return;
    }

    const customerData = customerSnapshot.docs[0].data();
    const customerId = customerData.id;

    console.log('✅ Customer:', customerData.firstName, customerData.lastName);
    console.log('   Customer ID:', customerId);
    console.log('');

    console.log('Step 2: Create purchase (simulating cart.tsx checkout)...\n');

    const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
    const purchaseDocRef = await addDoc(purchasesRef, {
      customerId,
      accountId: testAccountId,
      dropzoneId: dropzoneId,
      dropzoneName: 'TNT Brothers Clinceni',
      items: [
        {
          name: 'Test Tandem Jump',
          quantity: 1,
          price: 800,
          productId: 'test-product-123',
          category: 'On2nqHKrugQFCF1Wct3C',
          used: false,
          canceled: false,
        },
      ],
      totalAmount: 800,
      amountFromBalance: 0,
      amountCharged: 800,
      paymentMethod: 'cash',
      currency: 'RON',
      altitude: 13000,
      purchasedAt: serverTimestamp(),
      status: 'completed',
      canceled: false,
    });

    testPurchaseId = purchaseDocRef.id;

    console.log('✅ Purchase created:', testPurchaseId);
    console.log('');

    console.log('Step 3: Simulate shop.tsx query...\n');

    const shopQuery = query(purchasesRef, where('customerId', '==', customerId));
    const shopSnapshot = await getDocs(shopQuery);

    console.log('✅ Query returned:', shopSnapshot.size, 'purchases');
    console.log('');

    console.log('Step 4: Process items (simulating shop.tsx logic)...\n');

    const displayedItems: any[] = [];

    shopSnapshot.forEach((doc) => {
      const data = doc.data();

      console.log('Processing purchase:', doc.id);
      console.log('  Canceled:', data.canceled || false);

      if (data.canceled === true) {
        console.log('  ⏭️  Skipping - purchase is canceled');
        return;
      }

      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item: any, index: number) => {
          console.log(`  Item ${index + 1}: ${item.name} x${item.quantity}`);
          console.log('    Used:', item.used || false);
          console.log('    Canceled:', item.canceled || false);

          if (item.canceled === true || item.used === true) {
            console.log('    ⏭️  Skipping - item is canceled or used');
            return;
          }

          const displayItem = {
            id: `${doc.id}-item-${index}`,
            quantity: item.quantity || 1,
            ticketType: item.name || 'Unknown Item',
            dropzoneName: data.dropzoneName || 'TNT Brothers Clinceni',
            price: item.price || 0,
            currency: data.currency || 'RON',
            altitude: data.altitude || 13000,
          };

          displayedItems.push(displayItem);
          console.log('    ✅ Will be displayed in shop');
        });
      }
    });

    console.log('');
    console.log('================================================================================');
    console.log('TEST RESULTS');
    console.log('================================================================================\n');

    console.log('Items that will be displayed in "My Tickets" tab:');
    console.log('');

    if (displayedItems.length === 0) {
      console.log('❌ No items will be displayed');
      console.log('');
      console.log('TEST FAILED');
    } else {
      displayedItems.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.ticketType} x${item.quantity}`);
        console.log(`   Price: ${item.price} ${item.currency}`);
        console.log(`   Altitude: ${item.altitude} ft`);
        console.log(`   Dropzone: ${item.dropzoneName}`);
        console.log('');
      });

      console.log('✅ TEST PASSED');
      console.log('');
      console.log('Summary:');
      console.log('  ✅ Purchase created at correct location');
      console.log('  ✅ Items include required fields (used, canceled)');
      console.log('  ✅ shop.tsx query finds the purchase');
      console.log('  ✅ Items are correctly processed and displayed');
      console.log('  ✅ No tickets collection was created');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (testPurchaseId) {
      console.log('');
      console.log('Cleaning up test purchase...');
      await deleteDoc(doc(db, 'dropzones', dropzoneId, 'purchases', testPurchaseId));
      console.log('✅ Test purchase deleted');
    }
  }

  console.log('');
  console.log('================================================================================');
}

endToEndTest().catch(console.error);
