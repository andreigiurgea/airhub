import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkSpecificClient() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
  const customerDocId = 'AFsUwYUQ4oG1QqgxaVRe';

  console.log('Checking client document:\n');
  console.log('Path: /dropzones/' + dropzoneId + '/clients/' + customerDocId);

  const customerDocRef = doc(db, 'dropzones', dropzoneId, 'customers', customerDocId);
  const customerDoc = await getDoc(customerDocRef);

  if (customerDoc.exists()) {
    const data = customerDoc.data();
    console.log('\n✅ Client document exists:');
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('\n❌ Client document does NOT exist');
  }

  // Check balance document
  console.log('\n--- Checking balance document ---');
  const balanceDocRef = doc(db, 'dropzones', dropzoneId, 'customers', customerDocId, 'credits', 'balance');
  const balanceDoc = await getDoc(balanceDocRef);

  if (balanceDoc.exists()) {
    console.log('✅ Balance document exists:');
    console.log(JSON.stringify(balanceDoc.data(), null, 2));
  } else {
    console.log('❌ Balance document does NOT exist');
  }
}

checkSpecificClient().catch(console.error);
