import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING NEW BALANCE STRUCTURE');
    console.log('='.repeat(80) + '\n');

    const testAccountId = 'jK2YR1tiHccHhvtL0xIzaWldVqK2';
    const testCustomerId = 'C5836110';

    // Get customer info
    const customersRef = collection(db, 'customers');
    const customersSnapshot = await getDocs(customersRef);

    let customerDoc = null;
    for (const document of customersSnapshot.docs) {
      const data = document.data();
      if (data.accountId === testAccountId) {
        customerDoc = { id: document.id, data };
        break;
      }
    }

    if (!customerDoc) {
      console.log('❌ Customer not found');
      process.exit(1);
    }

    console.log(`Customer: ${customerDoc.data.firstName} ${customerDoc.data.lastName}`);
    console.log(`Customer ID: ${customerDoc.data.id}`);

    // Check if checked in
    if (!customerDoc.data.currentDropzone) {
      console.log('\n❌ Not checked in to any dropzone');
      process.exit(1);
    }

    const dropzoneId = customerDoc.data.currentDropzone.dropzoneId;
    const dropzoneName = customerDoc.data.currentDropzone.dropzoneName;
    console.log(`Checked into: ${dropzoneName}`);
    console.log(`Dropzone ID: ${dropzoneId}\n`);

    // Check old location (root credits)
    console.log('Checking OLD location: /credits');
    const oldCreditsRef = collection(db, 'credits');
    const oldCreditsSnapshot = await getDocs(oldCreditsRef);
    console.log(`  Found ${oldCreditsSnapshot.size} records\n`);

    // Check new location (dropzone/clients/credits)
    console.log(`Checking NEW location: /dropzones/${dropzoneId}/clients`);
    const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const customersSnapshot = await getDocs(customersRef);
    console.log(`  Found ${customersSnapshot.size} clients\n`);

    // Look for our customer in clients
    let customerDoc = null;
    for (const client of customersSnapshot.docs) {
      const customerData = client.data();
      console.log(`  Client ID: ${client.id}, Customer ID: ${customerData.customerId || 'N/A'}`);

      if (customerData.customerId === customerDoc.data.id) {
        customerDoc = { id: client.id, data: customerData };
        console.log(`    ✅ Found matching client!`);
      }
    }

    if (customerDoc) {
      console.log(`\n  Checking credits for client ${customerDoc.id}...`);

      // Check if there's a credits subcollection
      const creditsRef = collection(db, 'dropzones', dropzoneId, 'customers', customerDoc.id, 'credits');
      const creditsSnapshot = await getDocs(creditsRef);
      console.log(`    Credits subcollection: ${creditsSnapshot.size} records`);

      // Check if there's a balance document
      const balanceDocRef = doc(db, 'dropzones', dropzoneId, 'customers', customerDoc.id, 'credits', 'balance');
      const balanceDoc = await getDoc(balanceDocRef);

      if (balanceDoc.exists()) {
        const balanceData = balanceDoc.data();
        console.log(`    ✅ Balance document found!`);
        console.log(`       Balance: ${balanceData.balance} ${balanceData.currency || 'AED'}`);
      } else {
        console.log(`    ❌ No balance document at /credits/balance`);
      }

      // Also check for any other documents in credits
      creditsSnapshot.forEach((doc) => {
        console.log(`    Credit doc: ${doc.id}`);
        console.log(`      Data:`, doc.data());
      });
    } else {
      console.log('\n  ❌ No matching client found in dropzone');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
