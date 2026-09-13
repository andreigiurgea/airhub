import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
} from 'firebase/firestore';

async function verifyLicenseFormat() {
  console.log('🧪 Verifying license format in customer records...\n');

  try {
    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(customersRef);

    if (snapshot.empty) {
      console.log('❌ No customers found in database');
      return;
    }

    console.log(`📊 Found ${snapshot.size} customer(s)\n`);

    let customersWithLicenses = 0;
    let customersWithNewFormat = 0;
    let customersWithOldFormat = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.license) {
        customersWithLicenses++;

        console.log('─────────────────────────────────────');
        console.log(`📋 Customer: ${data.firstName} ${data.lastName}`);
        console.log(`   ID: ${data.id}`);
        console.log(`   License: ${data.license}`);

        // Check format: "USPA: A - 55168"
        const newFormatMatch = data.license.match(/^([^:]+):\s*([A-D])\s*-\s*(.+)$/);
        if (newFormatMatch) {
          customersWithNewFormat++;
          console.log(`   ✅ Format: NEW (includes level)`);
          console.log(`   Type: ${newFormatMatch[1].trim()}`);
          console.log(`   Level: ${newFormatMatch[2].trim()}`);
          console.log(`   Number: ${newFormatMatch[3].trim()}`);
        } else {
          customersWithOldFormat++;
          console.log(`   ⚠️  Format: OLD (missing level)`);

          // Try to parse old format
          const oldFormatMatch = data.license.split('-');
          if (oldFormatMatch.length > 1) {
            console.log(`   Type: ${oldFormatMatch[0].trim()}`);
            console.log(`   Number: ${oldFormatMatch.slice(1).join('-').trim()}`);
            console.log(`   💡 Suggestion: Update to new format with level`);
          }
        }

        if (data.stats?.licenses && data.stats.licenses.length > 0) {
          console.log(`   License Rating (stats): ${data.stats.licenses.join(', ')}`);
        }
      }
    });

    console.log('\n═════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═════════════════════════════════════');
    console.log(`Total customers: ${snapshot.size}`);
    console.log(`Customers with licenses: ${customersWithLicenses}`);
    console.log(`✅ New format (USPA: A - 55168): ${customersWithNewFormat}`);
    console.log(`⚠️  Old format (USPA-55168): ${customersWithOldFormat}`);
    console.log('═════════════════════════════════════\n');

    if (customersWithOldFormat > 0) {
      console.log('💡 Note: Old format licenses can still be read by the app,');
      console.log('   but they will be updated to the new format when edited.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyLicenseFormat();
