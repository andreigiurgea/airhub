import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

async function fixMissingClientDocs() {
  console.log('================================================================================');
  console.log('FIXING MISSING CLIENT DOCUMENTS');
  console.log('================================================================================\n');

  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';

  // Get all customers
  const customersRef = collection(db, 'customers');
  const customersSnapshot = await getDocs(customersRef);

  console.log('Checking all customers...\n');

  for (const customerDoc of customersSnapshot.docs) {
    const customerData = customerDoc.data();
    const customerId = customerData.id;

    // Check if this customer has a balance in this dropzone
    const balanceDocRef = doc(db, 'dropzones', dropzoneId, 'customers', customerId, 'credits', 'balance');
    const balanceDoc = await getDoc(balanceDocRef);

    if (balanceDoc.exists()) {
      console.log(`Found balance for customer: ${customerData.firstName} ${customerData.lastName} (${customerId})`);

      // Check if client document exists
      const customerDocRef = doc(db, 'dropzones', dropzoneId, 'customers', customerId);
      const customerDoc = await getDoc(customerDocRef);

      if (!customerDoc.exists()) {
        console.log('  ❌ Client document missing - CREATING...');

        // Create the missing client document
        await setDoc(customerDocRef, {
          customerId: customerId,
          accountId: customerData.accountId,
          email: customerData.email || '',
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          createdAt: serverTimestamp(),
          lastCheckIn: serverTimestamp(),
        });

        console.log('  ✅ Client document created');
      } else {
        console.log('  ✅ Client document exists');
      }
    }
  }

  console.log('\n================================================================================');
  console.log('DONE');
  console.log('================================================================================');
}

fixMissingClientDocs().catch(console.error);
