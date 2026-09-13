import { db } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

async function checkBalancePath() {
  console.log('================================================================================');
  console.log('CHECKING BALANCE DOCUMENT PATH');
  console.log('================================================================================\n');

  const testUserId = 'dKwmEBclVdd46rb5lxmSWuLCQwL2';
  const customerId = 'C8668912';
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';

  // Get client ID
  const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
  const customersQuery = query(customersRef, where('customerId', '==', customerId));
  const customersSnapshot = await getDocs(customersQuery);

  if (customersSnapshot.empty) {
    console.log('❌ No client found');
    process.exit(1);
  }

  const customerId = customersSnapshot.docs[0].id;
  const customerData = customersSnapshot.docs[0].data();

  console.log('Client Information:');
  console.log(`  Client ID: ${customerId}`);
  console.log(`  Customer ID: ${customerData.customerId}\n`);

  // Check path 1: /dropzones/{dropzoneId}/clients/{customerId}/credits/balance
  console.log('Checking Path 1 (current code):');
  console.log(`  /dropzones/${dropzoneId}/clients/${customerId}/credits/balance`);
  const balancePath1 = doc(db, 'dropzones', dropzoneId, 'customers', customerId, 'credits', 'balance');
  const balanceDoc1 = await getDoc(balancePath1);

  if (balanceDoc1.exists()) {
    console.log('  ✅ EXISTS');
    console.log(`  Data:`, balanceDoc1.data());
  } else {
    console.log('  ❌ DOES NOT EXIST');
  }

  // Check path 2: /dropzones/{dropzoneId}/clients/{customerId}/balance
  console.log('\nChecking Path 2 (direct balance):');
  console.log(`  /dropzones/${dropzoneId}/clients/${customerId}/balance`);
  const balancePath2 = doc(db, 'dropzones', dropzoneId, 'customers', customerId, 'balance');
  const balanceDoc2 = await getDoc(balancePath2);

  if (balanceDoc2.exists()) {
    console.log('  ✅ EXISTS');
    console.log(`  Data:`, balanceDoc2.data());
  } else {
    console.log('  ❌ DOES NOT EXIST');
  }

  // Check if balance is a field in the client document itself
  console.log('\nChecking if balance is in client document:');
  if (customerData.balance !== undefined) {
    console.log('  ✅ EXISTS as field');
    console.log(`  Balance: ${customerData.balance}`);
    if (customerData.currency) {
      console.log(`  Currency: ${customerData.currency}`);
    }
  } else {
    console.log('  ❌ NOT in client document');
  }

  console.log('\n================================================================================\n');
  process.exit(0);
}

checkBalancePath().catch(console.error);
