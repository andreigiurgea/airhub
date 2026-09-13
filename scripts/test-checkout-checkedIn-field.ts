import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';

async function testCheckoutCheckedInField() {
  console.log('🧪 Testing checkout checkedIn field update...\n');

  try {
    // Find a customer who is checked in
    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(customersRef);

    if (snapshot.empty) {
      console.log('❌ No customers found in database');
      return;
    }

    let testCustomer = null;
    let testDropzoneId = null;

    for (const customerDoc of snapshot.docs) {
      const customerData = customerDoc.data();
      if (customerData.currentDropzone?.dropzoneId) {
        testCustomer = { id: customerDoc.id, ...customerData };
        testDropzoneId = customerData.currentDropzone.dropzoneId;
        break;
      }
    }

    if (!testCustomer) {
      console.log('ℹ️  No customers are currently checked in');
      console.log('💡 Check in a customer first using the app, then run this test');
      return;
    }

    console.log('📋 Test Customer:');
    console.log(`   Name: ${testCustomer.firstName} ${testCustomer.lastName}`);
    console.log(`   Customer ID: ${testCustomer.id}`);
    console.log(`   Dropzone: ${testCustomer.currentDropzone.dropzoneName}`);
    console.log(`   Dropzone ID: ${testDropzoneId}\n`);

    // Check client record before checkout
    const customersRef = collection(db, 'dropzones', testDropzoneId, 'customers');
    const customerQuery = query(customersRef, where('customerId', '==', testCustomer.id));
    const customerSnapshot = await getDocs(customerQuery);

    if (customerSnapshot.empty) {
      console.log('⚠️  Client record not found in dropzone');
      return;
    }

    const customerDoc = customerSnapshot.docs[0];
    const customerData = customerDoc.data();

    console.log('📊 Client Record BEFORE checkout:');
    console.log(`   Document ID: ${customerDoc.id}`);
    console.log(`   checkedIn: ${customerData.checkedIn}`);
    console.log(`   firstName: ${customerData.firstName}`);
    console.log(`   lastName: ${customerData.lastName}`);
    console.log(`   lastCheckIn: ${customerData.lastCheckIn?.toDate()}\n`);

    if (customerData.checkedIn === false) {
      console.log('✅ checkedIn field is already false');
      console.log('💡 The customer may have already checked out');
      return;
    }

    console.log('✅ Test setup complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Go to the app');
    console.log('2. Click the "Check Out" button');
    console.log('3. Run this script again to verify checkedIn changed to false\n');

    console.log('Or to test programmatically, run:');
    console.log(`   npx tsx scripts/test-checkout.ts\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCheckoutCheckedInField();
