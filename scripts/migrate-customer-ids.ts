import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDdd_KkSJE9qA1Zbk7ueuZheBtCIqmb3po",
  authDomain: "skydive-boogie.firebaseapp.com",
  projectId: "skydive-boogie",
  storageBucket: "skydive-boogie.firebasestorage.app",
  messagingSenderId: "773256254342",
  appId: "1:773256254342:web:6e790d81a402a335f7d207"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateCustomerIds() {
  try {
    console.log('Starting customer ID migration...');

    // Get all customers
    const customersSnapshot = await getDocs(collection(db, 'customers'));
    console.log(`Found ${customersSnapshot.size} customers`);

    let nextIdNumber = 1;
    const updates: Promise<void>[] = [];

    customersSnapshot.forEach((customerDoc) => {
      const data = customerDoc.data();

      // Check if customer already has a proper 'id' field in format C####
      if (!data.id || !data.id.match(/^C\d{4}$/)) {
        const newId = `C${String(nextIdNumber).padStart(4, '0')}`;
        console.log(`Updating ${customerDoc.id} -> ${newId}`);

        updates.push(
          updateDoc(doc(db, 'customers', customerDoc.id), {
            id: newId
          })
        );

        nextIdNumber++;
      } else {
        console.log(`Skipping ${customerDoc.id} - already has valid ID: ${data.id}`);
        // Track the highest existing ID number
        const idNumber = parseInt(data.id.substring(1));
        if (idNumber >= nextIdNumber) {
          nextIdNumber = idNumber + 1;
        }
      }
    });

    // Apply all updates
    await Promise.all(updates);

    console.log(`Migration complete! Updated ${updates.length} customers.`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateCustomerIds()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
