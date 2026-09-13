import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

async function checkWeather() {
  try {
    console.log('Checking for Weather collection in Firebase...\n');

    const weatherRef = collection(db, 'weather');
    const snapshot = await getDocs(weatherRef);

    if (snapshot.empty) {
      console.log('No weather data found.');
    } else {
      console.log(`Found ${snapshot.size} weather documents:\n`);
      snapshot.forEach((doc) => {
        console.log(`Document ID: ${doc.id}`);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
        console.log('---\n');
      });
    }
  } catch (error) {
    console.error('Error checking weather:', error);
  }
}

checkWeather();
