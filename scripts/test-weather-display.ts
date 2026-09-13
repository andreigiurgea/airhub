import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

async function testWeatherDisplay() {
  try {
    console.log('Testing Weather Display Data...\n');

    const weatherRef = doc(db, 'weather', 'current');
    const docSnap = await getDoc(weatherRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Weather Data from Firebase:');
      console.log('============================');
      console.log(`Wind Speed: ${data.windSpeed}km/h`);
      console.log(`Calculated Gusts: ${Math.round(data.windSpeed * 1.5)}km/h`);
      console.log(`Direction: ${data.windDirection}`);
      console.log(`Temperature: ${data.temperature}°F`);
      console.log(`Conditions: ${data.conditions}`);
      console.log(`Visibility: ${data.visibility}km`);
      console.log(`Jump Run: ${data.jumpRun}`);
      console.log('\n');
      console.log('This is what should appear in the Wind Today card!');
    } else {
      console.log('No weather document found!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testWeatherDisplay();
