import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CLEARING ALL CUSTOMER CHECK-INS');
    console.log('='.repeat(80) + '\n');

    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(customersRef);

    console.log(`Checking ${snapshot.size} customers...\n`);

    let clearedCount = 0;

    for (const customerDoc of snapshot.docs) {
      const data = customerDoc.data();

      if (data.currentDropzone) {
        const email = data.email || 'No email';
        const firstName = data.firstName || '';
        const lastName = data.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'No name';

        console.log(`Clearing check-in for: ${fullName} (${email})`);
        console.log(`  Was checked into: ${data.currentDropzone.dropzoneName}`);

        await updateDoc(doc(db, 'customers', customerDoc.id), {
          currentDropzone: null
        });

        clearedCount++;
        console.log(`  ✓ Cleared\n`);
      }
    }

    console.log('='.repeat(80));
    console.log(`Summary: Cleared ${clearedCount} check-ins`);
    console.log('='.repeat(80) + '\n');

    if (clearedCount === 0) {
      console.log('No customers were checked in.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
