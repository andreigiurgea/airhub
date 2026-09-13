import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

async function migrateToClients() {
  try {
    console.log('Starting migration from customers to clients collection...');

    const customersSnapshot = await getDocs(collection(db, 'customers'));
    console.log(`Found ${customersSnapshot.size} customers to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const customerDoc of customersSnapshot.docs) {
      const data = customerDoc.data();
      const docId = customerDoc.id;

      console.log(`\nProcessing customer: ${docId}`);
      console.log(`Current data:`, data);

      const customerData: any = {
        id: data.id || `C${String(migrated + 1).padStart(4, '0')}`,
        email: data.email || '',
        fullName: data.fullName || '',
        phone: data.phone || '',
        totalJumps: data.totalJumps || 0,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (data.dateOfBirth) customerData.dateOfBirth = data.dateOfBirth;
      if (data.weight) customerData.weight = typeof data.weight === 'number' ? data.weight : parseFloat(data.weight);
      if (data.country) customerData.country = data.country;
      if (data.licenseType) customerData.licenseType = data.licenseType;
      if (data.licenseRating) customerData.licenseType = `${data.licenseType || 'USPA'} - ${data.licenseRating}`;
      if (data.emergencyContact) customerData.emergencyContactName = data.emergencyContact;
      if (data.emergencyContactName) customerData.emergencyContactName = data.emergencyContactName;
      if (data.emergencyContactPhone) customerData.emergencyContactPhone = data.emergencyContactPhone;
      if (data.notes) customerData.notes = data.notes;
      if (data.dropzoneId) customerData.dropzoneId = data.dropzoneId;
      if (data.accountId) customerData.accountId = data.accountId;

      if (data.createdAt) {
        customerData.createdAt = data.createdAt;
      } else {
        customerData.createdAt = serverTimestamp();
      }

      await setDoc(doc(db, 'customers', docId), customerData);
      console.log(`✓ Migrated to clients/${docId} with ID: ${customerData.id}`);
      migrated++;
    }

    console.log(`\n✓ Migration complete!`);
    console.log(`  - Migrated: ${migrated} customers`);
    console.log(`  - Skipped: ${skipped} customers`);
    console.log(`\nAll customer data has been copied to the 'customers' collection.`);
    console.log(`You can now safely delete the 'customers' collection from Firebase Console if needed.`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrateToClients()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
