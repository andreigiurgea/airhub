import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('LISTING ALL DROPZONES');
    console.log('='.repeat(80) + '\n');

    const dropzonesRef = collection(db, 'dropzones');
    const snapshot = await getDocs(dropzonesRef);

    if (snapshot.empty) {
      console.log('❌ No dropzones found in the database\n');
    } else {
      console.log(`✓ Found ${snapshot.size} dropzone(s):\n`);

      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📍 ${data.name || 'Unnamed Dropzone'}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Location: ${data.location || '[Not specified]'}`);
        console.log(`   City: ${data.city || '[Not specified]'}`);
        console.log(`   Country: ${data.country || '[Not specified]'}`);
        console.log(`   Fields:`, Object.keys(data).join(', '));
        console.log('');
      });
    }

    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
