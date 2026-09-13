import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

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

async function examineLoads() {
  try {
    console.log('Fetching loads from Firebase...\n');

    const loadsRef = collection(db, 'loads');
    const q = query(loadsRef, limit(3));
    const querySnapshot = await getDocs(q);

    console.log(`Found ${querySnapshot.size} loads\n`);
    console.log('='.repeat(80));

    querySnapshot.forEach((doc) => {
      console.log(`\nLoad ID: ${doc.id}`);
      console.log('-'.repeat(80));
      const data = doc.data();
      console.log(JSON.stringify(data, null, 2));
      console.log('='.repeat(80));
    });

    if (querySnapshot.size > 0) {
      const firstDoc = querySnapshot.docs[0];
      const data = firstDoc.data();
      console.log('\n\nFIELD ANALYSIS:');
      console.log('='.repeat(80));
      Object.keys(data).forEach(key => {
        const value = data[key];
        const type = Array.isArray(value) ? 'Array' : typeof value;
        const preview = Array.isArray(value)
          ? `Array(${value.length}) - ${JSON.stringify(value[0] || 'empty')}`
          : typeof value === 'object' && value !== null
          ? `Object - ${JSON.stringify(value).substring(0, 100)}...`
          : String(value);
        console.log(`${key}: ${type} = ${preview}`);
      });
    }

  } catch (error) {
    console.error('Error examining loads:', error);
  }

  process.exit(0);
}

examineLoads();
