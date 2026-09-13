import { db } from '../lib/firebase';
import { collection, getDocs, query, where, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING NEW BALANCE SYSTEM');
    console.log('='.repeat(80) + '\n');

    const testAccountId = 'jK2YR1tiHccHhvtL0xIzaWldVqK2';

    // Get customer
    console.log('1. Finding customer...');
    const customersRef = collection(db, 'customers');
    const customerQuery = query(customersRef, where('accountId', '==', testAccountId));
    const customerSnapshot = await getDocs(customerQuery);

    if (customerSnapshot.empty) {
      console.log('❌ Customer not found');
      process.exit(1);
    }

    const customerDoc = customerSnapshot.docs[0];
    const customerData = customerDoc.data();
    const customerId = customerData.id;

    console.log(`✅ Found: ${customerData.firstName} ${customerData.lastName}`);
    console.log(`   Customer ID: ${customerId}`);

    // Check if checked in
    if (!customerData.currentDropzone) {
      console.log('\n❌ Not checked in to any dropzone');
      console.log('Please check in first before testing balance');
      process.exit(1);
    }

    const dropzoneId = customerData.currentDropzone.dropzoneId;
    const dropzoneName = customerData.currentDropzone.dropzoneName;

    console.log(`   Checked into: ${dropzoneName}`);
    console.log(`   Dropzone ID: ${dropzoneId}`);

    // Find or create client record
    console.log('\n2. Finding or creating client record...');
    const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const customersQuery = query(customersRef, where('customerId', '==', customerId));
    const customersSnapshot = await getDocs(customersQuery);

    let customerId: string;

    if (customersSnapshot.empty) {
      const newClientRef = doc(collection(db, 'dropzones', dropzoneId, 'customers'));
      customerId = newClientRef.id;

      await setDoc(newClientRef, {
        customerId,
        accountId: testAccountId,
        email: customerData.email || '',
        firstName: customerData.firstName || '',
        lastName: customerData.lastName || '',
        phone: customerData.phone || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Created new client: ${customerId}`);
    } else {
      customerId = customersSnapshot.docs[0].id;
      console.log(`✅ Found existing client: ${customerId}`);
    }

    // Check current balance
    console.log('\n3. Checking current balance...');
    const balanceDocRef = doc(db, 'dropzones', dropzoneId, 'customers', customerId, 'credits', 'balance');
    const balanceDoc = await getDoc(balanceDocRef);

    let currentBalance = 0;
    if (balanceDoc.exists()) {
      currentBalance = balanceDoc.data().balance || 0;
      console.log(`✅ Current balance: ${currentBalance} AED`);
    } else {
      console.log('ℹ️  No balance document found, will create with initial balance');
    }

    // Set a test balance
    console.log('\n4. Setting test balance to 250 AED...');
    await setDoc(balanceDocRef, {
      balance: 250,
      currency: 'AED',
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log('✅ Balance set successfully');

    // Verify the balance
    console.log('\n5. Verifying balance...');
    const verifyDoc = await getDoc(balanceDocRef);
    if (verifyDoc.exists()) {
      const verifyData = verifyDoc.data();
      console.log(`✅ Verified balance: ${verifyData.balance} ${verifyData.currency}`);
    } else {
      console.log('❌ Failed to verify balance');
    }

    console.log('\n' + '='.repeat(80));
    console.log('Path to balance document:');
    console.log(`/dropzones/${dropzoneId}/clients/${customerId}/credits/balance`);
    console.log('='.repeat(80));

    console.log('\n✅ TEST COMPLETED SUCCESSFULLY');
    console.log('The balance should now be visible in the shop!');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
