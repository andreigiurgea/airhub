import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function checkAllTickets() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
  const customerId = 'C8668912';

  console.log('Checking purchases at: /dropzones/' + dropzoneId + '/purchases');
  console.log('Query: customerId ==', customerId, '\n');

  const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
  const purchasesQuery = query(purchasesRef, where('customerId', '==', customerId));
  const snapshot = await getDocs(purchasesQuery);

  console.log('Total purchases found:', snapshot.size, '\n');

  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log('Purchase ID:', doc.id);
    console.log('  Customer ID:', data.customerId);
    console.log('  Canceled:', data.canceled);
    console.log('  Items:', JSON.stringify(data.items, null, 2));
    console.log('---\n');
  });
}

checkAllTickets().catch(console.error);
