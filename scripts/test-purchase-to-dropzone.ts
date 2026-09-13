import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING PURCHASE CREATION IN DROPZONE SUBCOLLECTION');
    console.log('='.repeat(80) + '\n');

    // Test data
    const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
    const dropzoneName = 'TNT Brothers Clinceni';
    const customerId = 'C1968950';
    const accountId = 'PHLois8b6FP3ZZFlszeZiDDjvij1';

    console.log('Creating test purchase...');
    const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
    const purchaseDoc = await addDoc(purchasesRef, {
      customerId,
      accountId,
      dropzoneId,
      dropzoneName,
      items: [
        {
          name: 'Test Product',
          quantity: 2,
          price: 50,
          productId: 'test-product-id',
          category: 'Test Category',
        },
      ],
      totalAmount: 100,
      amountFromBalance: 0,
      amountCharged: 100,
      paymentMethod: 'cash',
      currency: 'AED',
      altitude: 13000,
      purchasedAt: serverTimestamp(),
      status: 'completed',
    });

    console.log(`✅ Purchase created with ID: ${purchaseDoc.id}\n`);

    // Verify by reading back
    console.log('Verifying purchase...');
    const verifyQuery = query(purchasesRef, where('customerId', '==', customerId));
    const verifySnapshot = await getDocs(verifyQuery);

    console.log(`Found ${verifySnapshot.size} purchases for customer ${customerId}`);
    verifySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\nPurchase ${doc.id}:`);
      console.log(`  Dropzone: ${data.dropzoneName}`);
      console.log(`  Total: ${data.totalAmount} ${data.currency}`);
      console.log(`  Items: ${data.items?.length || 0}`);
      console.log(`  Status: ${data.status}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
