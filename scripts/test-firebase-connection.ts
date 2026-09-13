import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

console.log('\n' + '='.repeat(80));
console.log('FIREBASE CONNECTION TEST');
console.log('='.repeat(80) + '\n');

console.log('📍 Firebase Config:');
console.log('  Project ID: skydive-boogie');
console.log('  Database: Firestore\n');

(async () => {
  try {
    console.log('🔄 Attempting to fetch products from Firebase...\n');

    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);

    if (snapshot.empty) {
      console.log('⚠️  No products found in the database\n');
    } else {
      console.log(`✅ SUCCESS! Connected to Firebase`);
      console.log(`✅ Found ${snapshot.size} products in the database\n`);

      console.log('📦 Products List:\n');
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.name}`);
        console.log(`   Category: ${data.category}`);
        console.log(`   Type: ${data.type}`);
        console.log(`   Price: ${data.price} ${data.currency}`);
        console.log(`   Firebase ID: ${doc.id}\n`);
      });

      console.log('='.repeat(80));
      console.log('✅ All products successfully retrieved from Firebase!');
      console.log('='.repeat(80) + '\n');
    }
  } catch (error) {
    console.error('\n❌ ERROR connecting to Firebase:');
    console.error(error);
    console.log('\n' + '='.repeat(80) + '\n');
  }

  process.exit(0);
})();
