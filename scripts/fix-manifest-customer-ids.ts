import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

async function fixManifestCustomerIds() {
  console.log('Fixing manifest customer IDs...\n');

  try {
    const dropzonesSnapshot = await getDocs(collection(db, 'dropzones'));

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneName = dropzoneDoc.data().name;
      console.log(`\nProcessing dropzone: ${dropzoneName}`);

      // Get all clients for this dropzone
      const customersRef = collection(db, 'dropzones', dropzoneDoc.id, 'customers');
      const customersSnapshot = await getDocs(customersRef);

      const clientMap = new Map<string, string>();
      customersSnapshot.forEach((customerDoc) => {
        const customerId = customerDoc.data().customerId;
        if (customerId) {
          clientMap.set(customerDoc.id, customerId);
        }
      });

      console.log(`  Found ${clientMap.size} clients with customer IDs`);

      // Get all loads
      const loadsRef = collection(db, 'dropzones', dropzoneDoc.id, 'loads');
      const loadsSnapshot = await getDocs(loadsRef);

      console.log(`  Found ${loadsSnapshot.size} loads`);

      for (const loadDoc of loadsSnapshot.docs) {
        const loadData = loadDoc.data();

        if (!loadData.jumpers || !Array.isArray(loadData.jumpers) || loadData.jumpers.length === 0) {
          continue;
        }

        let needsUpdate = false;
        const updatedJumpers = loadData.jumpers.map((jumper: any) => {
          // If jumper already has customerId, skip
          if (jumper.customerId) {
            return jumper;
          }

          // Try to find customerId from client map
          const customerId = clientMap.get(jumper.id);

          if (customerId) {
            console.log(`    Load ${loadData.loadNumber}: Adding customerId ${customerId} for jumper ${jumper.name} (${jumper.id})`);
            needsUpdate = true;
            return {
              ...jumper,
              customerId
            };
          }

          return jumper;
        });

        if (needsUpdate) {
          const loadRef = doc(db, 'dropzones', dropzoneDoc.id, 'loads', loadDoc.id);
          await updateDoc(loadRef, {
            jumpers: updatedJumpers
          });
          console.log(`    ✓ Updated Load ${loadData.loadNumber}`);
        }
      }
    }

    console.log('\n✓ Migration complete!');

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

fixManifestCustomerIds();
