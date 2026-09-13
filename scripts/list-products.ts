import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

(async () => {
  const productsRef = collection(db, 'products');
  const snapshot = await getDocs(productsRef);

  console.log(`Total products: ${snapshot.size}\n`);

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Name: ${data.name}`);
    console.log(`Type: ${data.type}`);
    console.log(`Category: ${data.category}`);
    console.log(`Price: ${data.price} ${data.currency}`);
    console.log(`Icon: ${data.icon}`);
    console.log('---');
  });

  process.exit(0);
})();
