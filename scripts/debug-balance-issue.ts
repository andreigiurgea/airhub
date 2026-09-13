import { db } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

async function debugBalanceIssue() {
  console.log('================================================================================');
  console.log('DEBUGGING BALANCE ISSUE');
  console.log('================================================================================\n');

  const accountId = 'pEuNu8xNuXQZuNUMcIswI72v5Ow1';

  // 1. Get customer info
  const customersRef = collection(db, 'customers');
  const customerQuery = query(customersRef, where('accountId', '==', accountId));
  const customerSnapshot = await getDocs(customerQuery);

  if (customerSnapshot.empty) {
    console.log('❌ No customer found');
    return;
  }

  const customerData = customerSnapshot.docs[0].data();
  console.log('Customer Info:');
  console.log('  Name:', customerData.firstName, customerData.lastName);
  console.log('  Customer ID:', customerData.id);
  console.log('  Account ID:', customerData.accountId);

  // 2. Get current check-in
  const checkIn = customerData.currentDropzone;
  if (!checkIn) {
    console.log('\n❌ Not checked in to any dropzone');
    return;
  }

  console.log('\nCheck-in Info:');
  console.log('  Dropzone:', checkIn.dropzoneName);
  console.log('  Dropzone ID:', checkIn.dropzoneId);

  // 3. Search for client record in the dropzone
  const customersRef = collection(db, 'dropzones', checkIn.dropzoneId, 'customers');
  const customersQuery = query(customersRef, where('customerId', '==', customerData.id));
  const customersSnapshot = await getDocs(customersQuery);

  console.log('\nSearching for client record:');
  console.log('  Path: /dropzones/' + checkIn.dropzoneId + '/clients');
  console.log('  Query: customerId ==', customerData.id);
  console.log('  Results found:', customersSnapshot.size);

  if (customersSnapshot.empty) {
    console.log('  ❌ No matching client record found!');

    // Let's check ALL clients in this dropzone
    console.log('\n--- Checking ALL clients in this dropzone ---');
    const allClientsSnapshot = await getDocs(customersRef);
    console.log('Total clients in dropzone:', allClientsSnapshot.size);

    allClientsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('\nClient Document ID:', doc.id);
      console.log('  customerId:', data.customerId);
      console.log('  firstName:', data.firstName);
      console.log('  lastName:', data.lastName);
      console.log('  email:', data.email);
    });
  } else {
    const customerDoc = customersSnapshot.docs[0];
    const customerData = customerDoc.data();

    console.log('\n✅ Found matching client:');
    console.log('  Client Document ID:', customerDoc.id);
    console.log('  customerId:', customerData.customerId);
    console.log('  firstName:', customerData.firstName);
    console.log('  lastName:', customerData.lastName);

    // 4. Check balance document
    const balancePath = `dropzones/${checkIn.dropzoneId}/clients/${customerDoc.id}/credits/balance`;
    console.log('\nChecking balance at:', balancePath);

    const balanceDocRef = doc(db, 'dropzones', checkIn.dropzoneId, 'customers', customerDoc.id, 'credits', 'balance');
    const balanceDoc = await getDoc(balanceDocRef);

    if (balanceDoc.exists()) {
      const balanceData = balanceDoc.data();
      console.log('✅ Balance document found:');
      console.log('  balance:', balanceData.balance);
      console.log('  currency:', balanceData.currency);
      console.log('  customerId:', balanceData.customerId);
      console.log('  dropzoneId:', balanceData.dropzoneId);
    } else {
      console.log('❌ Balance document not found');
    }
  }

  console.log('\n================================================================================');
}

debugBalanceIssue().catch(console.error);
