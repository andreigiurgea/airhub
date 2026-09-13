import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const productNamesFromScreenshot = [
  'ceva si mai si',
  'Ceva',
  'Photo Package',
  'Jumpsuit Rental',
  'Goggles Rental',
  'Complete Rig Rental',
  'Wingsuit Camp',
  'Freefly Camp',
  'Belly Camp',
  'Tracking Camp'
];

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('SEARCHING FOR SPECIFIC PRODUCTS FROM SCREENSHOT');
    console.log('='.repeat(80) + '\n');

    console.log('Looking for these products:');
    productNamesFromScreenshot.forEach(name => console.log(`  - ${name}`));
    console.log('');

    // Search in products collection
    const productsRef = collection(db, 'products');
    const allProducts = await getDocs(productsRef);

    console.log(`\nFound ${allProducts.size} products in 'products' collection:`);
    allProducts.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name} (${data.price} ${data.currency})`);

      // Check if it matches any from screenshot
      if (productNamesFromScreenshot.some(n => n.toLowerCase() === data.name?.toLowerCase())) {
        console.log(`    ✓ MATCH from screenshot!`);
      }
    });

    // Try searching by price
    console.log('\n\nSearching by prices from screenshot:\n');
    const pricesFromScreenshot = [2, 1, 149, 39, 19, 199, 799, 699, 599];

    for (const price of pricesFromScreenshot) {
      const q = query(productsRef, where('price', '==', price));
      const snapshot = await getDocs(q);

      if (snapshot.size > 0) {
        console.log(`  Found product with price ${price}:`);
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`    - ${data.name} (${data.category})`);
        });
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
