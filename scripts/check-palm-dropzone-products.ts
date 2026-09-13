import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING SKYDIVE DUBAI PALM DROPZONE PRODUCTS');
    console.log('='.repeat(80) + '\n');

    // First, find the Palm Dropzone
    const dropzonesRef = collection(db, 'dropzones');
    const dropzonesSnapshot = await getDocs(dropzonesRef);

    let palmDropzoneId = '';
    let palmDropzoneName = '';

    console.log('Available Dropzones:');
    dropzonesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.name} (ID: ${doc.id})`);
      if (data.name.toLowerCase().includes('palm')) {
        palmDropzoneId = doc.id;
        palmDropzoneName = data.name;
      }
    });

    if (!palmDropzoneId) {
      console.log('\n❌ Could not find Palm Dropzone');
      process.exit(1);
    }

    console.log(`\n✓ Found: ${palmDropzoneName} (${palmDropzoneId})\n`);

    // Check the shop_products subcollection
    console.log('='.repeat(80));
    console.log('CHECKING SHOP_PRODUCTS SUBCOLLECTION');
    console.log('='.repeat(80) + '\n');

    const productsRef = collection(db, 'dropzones', palmDropzoneId, 'shop_products');
    const productsSnapshot = await getDocs(productsRef);

    console.log(`Found ${productsSnapshot.size} products in shop_products subcollection\n`);

    if (productsSnapshot.empty) {
      console.log('⚠️  No products found in shop_products subcollection\n');
    } else {
      productsSnapshot.forEach((doc) => {
        const product = doc.data();
        console.log(`Product: ${product.name}`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  Category: ${product.category || 'No category'}`);
        console.log(`  Price: ${product.price} ${product.currency || 'AED'}`);
        console.log(`  Description: ${product.description || 'No description'}`);
        console.log(`  Stock: ${product.stock !== undefined ? product.stock : 'Unlimited'}`);
        console.log('');
      });
    }

    // Check if there's a products collection at the dropzone level
    console.log('='.repeat(80));
    console.log('CHECKING PRODUCTS COLLECTION (ALTERNATIVE LOCATION)');
    console.log('='.repeat(80) + '\n');

    const altProductsRef = collection(db, 'dropzones', palmDropzoneId, 'products');
    const altProductsSnapshot = await getDocs(altProductsRef);

    console.log(`Found ${altProductsSnapshot.size} products in products subcollection\n`);

    if (!altProductsSnapshot.empty) {
      altProductsSnapshot.forEach((doc) => {
        const product = doc.data();
        console.log(`Product: ${product.name}`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  Category: ${product.category || 'No category'}`);
        console.log(`  Price: ${product.price} ${product.currency || 'AED'}`);
        console.log('');
      });
    }

    // Check for categories
    console.log('='.repeat(80));
    console.log('CHECKING CATEGORIES');
    console.log('='.repeat(80) + '\n');

    const categoriesRef = collection(db, 'dropzones', palmDropzoneId, 'categories');
    const categoriesSnapshot = await getDocs(categoriesRef);

    console.log(`Found ${categoriesSnapshot.size} categories\n`);

    if (!categoriesSnapshot.empty) {
      categoriesSnapshot.forEach((doc) => {
        const category = doc.data();
        console.log(`Category: ${category.name || doc.id}`);
        console.log(`  ID: ${doc.id}`);
        console.log('');
      });
    }

    // Check global products
    console.log('='.repeat(80));
    console.log('CHECKING GLOBAL PRODUCTS COLLECTION');
    console.log('='.repeat(80) + '\n');

    const globalProductsRef = collection(db, 'products');
    const globalProductsSnapshot = await getDocs(globalProductsRef);

    console.log(`Found ${globalProductsSnapshot.size} products in global collection\n`);

    if (!globalProductsSnapshot.empty) {
      const productsByDropzone: { [key: string]: any[] } = {};

      globalProductsSnapshot.forEach((doc) => {
        const product = doc.data();
        const dropzoneName = product.dropzoneName || 'Unknown';

        if (!productsByDropzone[dropzoneName]) {
          productsByDropzone[dropzoneName] = [];
        }

        productsByDropzone[dropzoneName].push({
          id: doc.id,
          name: product.name,
          category: product.category,
          price: product.price,
          currency: product.currency,
        });
      });

      Object.keys(productsByDropzone).forEach((dzName) => {
        console.log(`\n${dzName}:`);
        productsByDropzone[dzName].forEach((product) => {
          console.log(`  - ${product.name} (${product.category}) - ${product.price} ${product.currency}`);
        });
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`shop_products: ${productsSnapshot.size} items`);
    console.log(`products: ${altProductsSnapshot.size} items`);
    console.log(`categories: ${categoriesSnapshot.size} items`);
    console.log(`global products: ${globalProductsSnapshot.size} items`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
})();
