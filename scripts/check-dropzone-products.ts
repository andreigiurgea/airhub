import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function checkProducts() {
  const dropzoneId = 'MOjfNjZHUExnLztWXAWZ';
  const productId = 'r3NuCrh9IL4NPJ2YRPPN';
  const categoryId = 'kiuBJnhnbSgf9IhL53Ur';

  console.log('Checking product:', productId);
  console.log('Category:', categoryId, '\n');

  // Get product
  const productRef = doc(db, 'dropzones', dropzoneId, 'products', productId);
  const productDoc = await getDoc(productRef);

  if (productDoc.exists()) {
    console.log('Product found:');
    console.log(JSON.stringify(productDoc.data(), null, 2));
  } else {
    console.log('Product not found');
  }

  console.log('\n--- Category Info ---');
  
  // Get category
  const categoryRef = doc(db, 'dropzones', dropzoneId, 'categories', categoryId);
  const categoryDoc = await getDoc(categoryRef);

  if (categoryDoc.exists()) {
    console.log('Category found:');
    console.log(JSON.stringify(categoryDoc.data(), null, 2));
  } else {
    console.log('Category not found');
  }
}

checkProducts().catch(console.error);
