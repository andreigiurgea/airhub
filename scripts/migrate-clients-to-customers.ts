import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

async function migrateClientsToCustomers() {
  console.log('🚀 Starting migration: clients → customers\n');

  try {
    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    console.log(`Found ${dropzonesSnapshot.size} dropzones\n`);

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneName = dropzoneDoc.data().name || 'Unknown';
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Dropzone: ${dropzoneName}`);
      console.log(`ID: ${dropzoneDoc.id}`);
      console.log('='.repeat(80));

      const clientsRef = collection(db, 'dropzones', dropzoneDoc.id, 'clients');
      const clientsSnapshot = await getDocs(clientsRef);

      if (clientsSnapshot.empty) {
        console.log('  ✓ No clients found (nothing to migrate)');
        continue;
      }

      console.log(`  Found ${clientsSnapshot.size} clients to migrate\n`);

      let migratedCount = 0;
      let errorCount = 0;

      for (const clientDoc of clientsSnapshot.docs) {
        const clientData = clientDoc.data();
        const customerName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Unknown';

        try {
          const customersRef = collection(db, 'dropzones', dropzoneDoc.id, 'customers');
          const newCustomerRef = doc(customersRef, clientDoc.id);

          await setDoc(newCustomerRef, clientData);

          await deleteDoc(doc(db, 'dropzones', dropzoneDoc.id, 'clients', clientDoc.id));

          migratedCount++;
          console.log(`  ✓ Migrated: ${customerName} (${clientData.customerId})`);
        } catch (error) {
          errorCount++;
          console.error(`  ✗ Failed to migrate ${customerName}:`, error);
        }
      }

      console.log(`\n  Summary: ${migratedCount} migrated, ${errorCount} errors`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateClientsToCustomers().then(() => process.exit(0));
