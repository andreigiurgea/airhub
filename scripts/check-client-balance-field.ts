import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function checkClientBalanceField() {
  console.log('================================================================================');
  console.log('CHECKING CLIENT DOCUMENT STRUCTURE');
  console.log('================================================================================\n');

  const customerId = 'C8668912';
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';

  const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
  const customersQuery = query(customersRef, where('customerId', '==', customerId));
  const customersSnapshot = await getDocs(customersQuery);

  if (customersSnapshot.empty) {
    console.log('❌ No client found');
    process.exit(1);
  }

  const customerDoc = customersSnapshot.docs[0];
  const customerData = customerDoc.data();

  console.log('Client Document:');
  console.log(`  Path: /dropzones/${dropzoneId}/clients/${customerDoc.id}`);
  console.log(`  Document ID: ${customerDoc.id}\n`);

  console.log('All fields in client document:');
  Object.keys(customerData).sort().forEach(key => {
    const value = customerData[key];
    if (typeof value === 'object' && value !== null) {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  });

  console.log('\n');

  if (customerData.balance !== undefined) {
    console.log('✅ BALANCE FOUND IN CLIENT DOCUMENT');
    console.log(`   Balance: ${customerData.balance}`);
    console.log(`   Currency: ${customerData.currency || 'Not specified'}`);
  } else {
    console.log('❌ No balance field found in client document');
  }

  console.log('\n================================================================================\n');
  process.exit(0);
}

checkClientBalanceField().catch(console.error);
