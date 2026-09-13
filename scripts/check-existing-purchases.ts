import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkExistingPurchases() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
  const customerDocId = 'AFsUwYUQ4oG1QqgxaVRe';

  console.log('Checking purchases for client:', customerDocId);
  console.log('Path: /dropzones/' + dropzoneId + '/clients/' + customerDocId + '/purchases\n');

  const purchasesRef = collection(db, 'dropzones', dropzoneId, 'customers', customerDocId, 'purchases');
  const snapshot = await getDocs(purchasesRef);

  console.log('Total purchases:', snapshot.size, '\n');

  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log('Purchase ID:', doc.id);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('---');
  });
}

checkExistingPurchases().catch(console.error);
