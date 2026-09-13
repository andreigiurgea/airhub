import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function listAllCustomers() {
  console.log('All Customers:\n');

  const customersRef = collection(db, 'customers');
  const snapshot = await getDocs(customersRef);

  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log('Customer:');
    console.log('  Firestore Doc ID:', doc.id);
    console.log('  Customer ID:', data.id);
    console.log('  Name:', data.firstName, data.lastName);
    console.log('  Account ID:', data.accountId);
    console.log('  Email:', data.email);
    if (data.currentDropzone) {
      console.log('  Checked in:', data.currentDropzone.dropzoneName);
    }
    console.log('');
  });
}

listAllCustomers().catch(console.error);
