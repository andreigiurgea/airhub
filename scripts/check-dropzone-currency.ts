import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING DROPZONE CURRENCY SETTINGS');
    console.log('='.repeat(80) + '\n');

    const dropzonesRef = collection(db, 'dropzones');
    const snapshot = await getDocs(dropzonesRef);

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`📍 ${data.name || 'Unnamed'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Settings:`, data.settings);
      console.log(`   Currency: ${data.currency || data.settings?.currency || 'NOT SET'}`);
      console.log('');
    });

    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
