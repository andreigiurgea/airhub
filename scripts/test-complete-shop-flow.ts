import { db } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING COMPLETE SHOP FLOW');
    console.log('='.repeat(80) + '\n');

    const testAccountId = 'PHLois8b6FP3ZZFlszeZiDDjvij1';
    const testCustomerId = 'C1968950';

    // Step 1: Get customer info
    console.log('1. Checking customer...');
    const customersRef = collection(db, 'customers');
    const customerQuery = query(customersRef, where('accountId', '==', testAccountId));
    const customerSnapshot = await getDocs(customerQuery);

    if (customerSnapshot.empty) {
      console.log('❌ Customer not found');
      process.exit(1);
    }

    const customerData = customerSnapshot.docs[0].data();
    console.log(`   ✅ Found customer: ${customerData.firstName} ${customerData.lastName}`);
    console.log(`   Customer ID: ${customerData.id}`);

    // Step 2: Check current check-in
    console.log('\n2. Checking current check-in...');
    if (customerData.currentDropzone) {
      console.log(`   ✅ Checked into: ${customerData.currentDropzone.dropzoneName}`);
      console.log(`   Dropzone ID: ${customerData.currentDropzone.dropzoneId}`);
    } else {
      console.log('   ℹ️  Not currently checked in');
    }

    // Step 3: Check available products at dropzone
    if (customerData.currentDropzone) {
      console.log('\n3. Checking available products...');
      const dropzoneId = customerData.currentDropzone.dropzoneId;
      const productsRef = collection(db, 'dropzones', dropzoneId, 'shop_products');
      const productsSnapshot = await getDocs(productsRef);

      console.log(`   Found ${productsSnapshot.size} products`);
      productsSnapshot.forEach((doc) => {
        const product = doc.data();
        console.log(`   - ${product.name}: ${product.price} AED`);
      });
    }

    // Step 4: Check balance
    console.log('\n4. Checking customer balance...');
    const creditsRef = collection(db, 'credits');
    const creditsQuery = query(creditsRef, where('customerId', '==', customerData.id));
    const creditsSnapshot = await getDocs(creditsQuery);

    if (!creditsSnapshot.empty) {
      let mostRecentCredit = creditsSnapshot.docs[0];
      creditsSnapshot.docs.forEach(doc => {
        const current = doc.data();
        const mostRecent = mostRecentCredit.data();
        if (current.updatedAt && mostRecent.updatedAt) {
          if (current.updatedAt.seconds > mostRecent.updatedAt.seconds) {
            mostRecentCredit = doc;
          }
        }
      });
      const balance = mostRecentCredit.data().balance || 0;
      console.log(`   ✅ Balance: ${balance} AED`);
    } else {
      console.log(`   ℹ️  No balance records found`);
    }

    // Step 5: Check all purchases across all dropzones
    console.log('\n5. Checking purchases across all dropzones...');
    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    let totalPurchases = 0;
    let totalTickets = 0;

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneName = dropzoneDoc.data().name;
      const dropzoneId = dropzoneDoc.id;

      const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
      const purchasesQuery = query(purchasesRef, where('customerId', '==', customerData.id));
      const purchasesSnapshot = await getDocs(purchasesQuery);

      if (purchasesSnapshot.size > 0) {
        console.log(`\n   Dropzone: ${dropzoneName}`);
        console.log(`   Found ${purchasesSnapshot.size} purchases`);

        purchasesSnapshot.forEach((doc) => {
          const purchase = doc.data();
          totalPurchases++;

          console.log(`\n   Purchase ${doc.id.substring(0, 8)}...:`);
          console.log(`     Total: ${purchase.totalAmount || 'N/A'} ${purchase.currency || 'AED'}`);
          console.log(`     Payment: ${purchase.paymentMethod || 'N/A'}`);
          console.log(`     Status: ${purchase.status || 'N/A'}`);

          if (purchase.items && Array.isArray(purchase.items)) {
            console.log(`     Items:`);
            purchase.items.forEach((item: any) => {
              console.log(`       - ${item.name} x${item.quantity} @ ${item.price} ${purchase.currency || 'AED'}`);
              totalTickets += item.quantity;
            });
          }
        });
      }
    }

    console.log(`\n   Summary:`);
    console.log(`   Total Purchases: ${totalPurchases}`);
    console.log(`   Total Ticket Items: ${totalTickets}`);

    console.log('\n' + '='.repeat(80));
    console.log('SHOP FLOW TEST COMPLETED');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
