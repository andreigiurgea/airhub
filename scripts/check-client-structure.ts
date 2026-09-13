import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function checkClientStructure() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
  const customerDocId = 'C1968950';

  console.log('Checking client document structure:\n');
  console.log('Path: /dropzones/' + dropzoneId + '/clients/' + customerDocId);

  const customerDocRef = doc(db, 'dropzones', dropzoneId, 'customers', customerDocId);
  const customerDoc = await getDoc(customerDocRef);

  if (customerDoc.exists()) {
    const data = customerDoc.data();
    console.log('\n✅ Client document exists:');
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('\n❌ Client document does NOT exist');

    // List all clients in the dropzone
    console.log('\n--- All clients in this dropzone ---');
    const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const snapshot = await getDocs(customersRef);

    console.log('Total clients:', snapshot.size);
    snapshot.forEach((doc) => {
      console.log('\nClient Doc ID:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
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

checkClientStructure().catch(console.error);
