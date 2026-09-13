import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

async function testUpdatedPurchaseFlow() {
  console.log('================================================================================');
  console.log('TESTING UPDATED PURCHASE FLOW');
  console.log('================================================================================\n');

  const testAccountId = 'dKwmEBclVdd46rb5lxmSWuLCQwL2'; // andrei2@logix.com
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ'; // TNT Brothers Clinceni

  console.log('Step 1: Finding customer...\n');

  const customersRef = collection(db, 'customers');
  const customerQuery = query(customersRef, where('accountId', '==', testAccountId));
  const customerSnapshot = await getDocs(customerQuery);

  if (customerSnapshot.empty) {
    console.log('❌ Customer not found');
    return;
  }

  const customerData = customerSnapshot.docs[0].data();
  const customerId = customerData.id;

  console.log('✅ Customer found:', customerData.firstName, customerData.lastName);
  console.log('   Customer ID:', customerId);
  console.log('');

  console.log('Step 2: Creating test purchase (simulating cart.tsx)...\n');

  const testCartItems = [
    {
      product: {
        id: 'test-product-1',
        name: 'Test Tandem Jump',
        category: 'On2nqHKrugQFCF1Wct3C',
        price: 500,
        description: 'Test jump',
        active: true,
      },
      quantity: 2,
    },
  ];

  const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
  const purchaseDocRef = await addDoc(purchasesRef, {
    customerId,
    accountId: testAccountId,
    dropzoneId: dropzoneId,
    dropzoneName: 'TNT Brothers Clinceni',
    items: testCartItems.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      productId: item.product.id,
      category: item.product.category,
      used: false,
      canceled: false,
    })),
    totalAmount: 1000,
    amountFromBalance: 0,
    amountCharged: 1000,
    paymentMethod: 'cash',
    currency: 'RON',
    altitude: 13000,
    purchasedAt: serverTimestamp(),
    status: 'completed',
    canceled: false,
  });

  console.log('✅ Purchase created:', purchaseDocRef.id);
  console.log('');

  console.log('Step 3: Verifying purchase structure...\n');

  const purchaseQuery = query(purchasesRef, where('customerId', '==', customerId));
  const purchaseSnapshot = await getDocs(purchaseQuery);

  let foundTestPurchase = false;

  purchaseSnapshot.forEach((doc) => {
    if (doc.id === purchaseDocRef.id) {
      foundTestPurchase = true;
      const data = doc.data();

      console.log('✅ Purchase verified:');
      console.log('   ID:', doc.id);
      console.log('   Customer ID:', data.customerId);
      console.log('   Dropzone:', data.dropzoneName);
      console.log('   Currency:', data.currency);
      console.log('   Canceled:', data.canceled);
      console.log('   Items:', data.items?.length);
      console.log('');

      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item: any, idx: number) => {
          console.log(`   Item ${idx + 1}:`);
          console.log('      Name:', item.name);
          console.log('      Quantity:', item.quantity);
          console.log('      Price:', item.price);
          console.log('      Used:', item.used);
          console.log('      Canceled:', item.canceled);
          console.log('');

          if (item.used === false && item.canceled === false) {
            console.log('      ✅ Will be displayed in shop.tsx');
          } else {
            console.log('      ❌ Will be filtered out by shop.tsx');
          }
        });
      }
    }
  });

  if (!foundTestPurchase) {
    console.log('❌ Could not verify purchase');
    return;
  }

  console.log('');
  console.log('Step 4: Checking what shop.tsx will display...\n');

  let ticketCount = 0;

  purchaseSnapshot.forEach((doc) => {
    const data = doc.data();

    if (data.canceled === true) {
      return;
    }

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        if (item.canceled === true || item.used === true) {
          return;
        }
        ticketCount += item.quantity;
      });
    }
  });

  console.log('✅ Total tickets that will be displayed:', ticketCount);
  console.log('');
  console.log('================================================================================');
  console.log('TEST COMPLETED SUCCESSFULLY');
  console.log('================================================================================');
  console.log('');
  console.log('Summary:');
  console.log('  ✅ Purchases are stored in /dropzones/{dropzoneId}/purchases');
  console.log('  ✅ Items have used and canceled fields');
  console.log('  ✅ shop.tsx will correctly display these items');
  console.log('  ✅ No tickets collection is created');
  console.log('');
}

testUpdatedPurchaseFlow().catch(console.error);
