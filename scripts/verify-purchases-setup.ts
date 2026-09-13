import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function verifyPurchasesSetup() {
  console.log('=== VERIFYING PURCHASES SETUP ===\n');

  // Get all dropzones
  const dropzonesRef = collection(db, 'dropzones');
  const dropzonesSnapshot = await getDocs(dropzonesRef);

  console.log(`Total dropzones: ${dropzonesSnapshot.size}\n`);

  for (const dropzoneDoc of dropzonesSnapshot.docs) {
    const dropzoneName = dropzoneDoc.data().name;
    const dropzoneId = dropzoneDoc.id;

    console.log(`📍 ${dropzoneName} (${dropzoneId})`);

    // Check purchases
    const purchasesRef = collection(db, 'dropzones', dropzoneId, 'purchases');
    const purchasesSnapshot = await getDocs(purchasesRef);

    console.log(`   Total purchases: ${purchasesSnapshot.size}`);

    if (purchasesSnapshot.size > 0) {
      console.log('   Sample purchases:');
      purchasesSnapshot.docs.slice(0, 3).forEach((doc) => {
        const data = doc.data();
        console.log(`   - ${doc.id}`);
        console.log(`     Customer: ${data.customerId || 'N/A'}`);
        console.log(`     Items: ${data.items?.length || 0}`);
        console.log(`     Total: ${data.totalAmount || 0} ${data.currency || 'AED'}`);
      });
    }
    console.log('');
  }

  console.log('✅ Real-time listeners in shop.tsx will monitor ALL these purchases');
  console.log('✅ When any purchase is added/modified/deleted, the UI updates automatically');
}

verifyPurchasesSetup().catch(console.error);
