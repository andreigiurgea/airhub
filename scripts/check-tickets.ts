import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkTickets() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
  const customerDocId = 'AFsUwYUQ4oG1QqgxaVRe';

  console.log('Checking tickets for client:', customerDocId);
  console.log('Path: /dropzones/' + dropzoneId + '/clients/' + customerDocId + '/tickets\n');

  const ticketsRef = collection(db, 'dropzones', dropzoneId, 'customers', customerDocId, 'tickets');
  const snapshot = await getDocs(ticketsRef);

  console.log('Total tickets:', snapshot.size, '\n');

  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log('Ticket ID:', doc.id);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('---');
  });
}

checkTickets().catch(console.error);
