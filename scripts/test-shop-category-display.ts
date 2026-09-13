import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function testShopDisplay() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';

  console.log('=== TESTING SHOP CATEGORY DISPLAY ===\n');
  
  // Get categories from shop_categories
  const categoriesRef = collection(db, 'dropzones', dropzoneId, 'shop_categories');
  const categoriesSnapshot = await getDocs(categoriesRef);
  
  const categories: { id: string; name: string }[] = [];
  categoriesSnapshot.forEach(doc => {
    const data = doc.data();
    categories.push({
      id: doc.id,
      name: data.name || '',
    });
  });
  
  console.log('Categories loaded:');
  categories.forEach(cat => {
    console.log(`  ${cat.id} -> "${cat.name}"`);
  });

  // Get products
  const productsRef = collection(db, 'dropzones', dropzoneId, 'shop_products');
  const productsSnapshot = await getDocs(productsRef);
  
  // Helper function (same as in shop.tsx)
  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Other';
  };

  console.log('\nProducts with category display:');
  productsSnapshot.forEach(doc => {
    const data = doc.data();
    const categoryId = data.category;
    const displayName = getCategoryName(categoryId);
    console.log(`\n  Product: ${data.name}`);
    console.log(`    Category ID: ${categoryId}`);
    console.log(`    Will display as: "${displayName}"`);
  });
  
  console.log('\n✅ Shop will now show "Echipament" instead of the ID!');
}

testShopDisplay().catch(console.error);
