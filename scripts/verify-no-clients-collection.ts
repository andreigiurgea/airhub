import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function verifyNoClientsCollections() {
  console.log('Verifying that "clients" collections no longer exist...\n');

  try {
    const dropzonesSnapshot = await getDocs(collection(db, 'dropzones'));

    let foundClientsCollections = false;

    for (const dropzoneDoc of dropzonesSnapshot.docs) {
      const dropzoneName = dropzoneDoc.data().name;
      console.log(`Checking: ${dropzoneName}`);

      const clientsRef = collection(db, 'dropzones', dropzoneDoc.id, 'clients');
      const clientsSnapshot = await getDocs(clientsRef);

      if (!clientsSnapshot.empty) {
        foundClientsCollections = true;
        console.log(`  ❌ Found ${clientsSnapshot.size} documents in "clients" collection!`);
      } else {
        console.log(`  ✅ No "clients" collection found`);
      }
    }

    console.log('\n' + '='.repeat(80));
    if (foundClientsCollections) {
      console.log('❌ Migration incomplete: Some "clients" collections still exist!');
    } else {
      console.log('✅ Migration verified: All "clients" collections have been removed');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

verifyNoClientsCollections();
