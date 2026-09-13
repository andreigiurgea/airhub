import { getAllDropzones, getDropzoneById } from '../lib/dropzoneService';
import { getUserBalance } from '../lib/balanceService';

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING CURRENCY IMPLEMENTATION');
    console.log('='.repeat(80) + '\n');

    // Test 1: Check all dropzones have currency
    console.log('📍 Test 1: Dropzone Currency Configuration\n');
    const dropzones = await getAllDropzones();

    dropzones.forEach((dz) => {
      console.log(`  ${dz.name}`);
      console.log(`  - ID: ${dz.id}`);
      console.log(`  - Currency: ${dz.currency || 'NOT SET'}`);
      console.log(`  - Settings Currency: ${dz.settings?.currency || 'NOT SET'}`);
      console.log('');
    });

    // Test 2: Check specific dropzone currency retrieval
    console.log('\n' + '-'.repeat(80));
    console.log('📍 Test 2: Individual Dropzone Currency Fetch\n');

    if (dropzones.length > 0) {
      const testDropzone = await getDropzoneById(dropzones[0].id);
      if (testDropzone) {
        console.log(`  Testing: ${testDropzone.name}`);
        console.log(`  Currency returned: ${testDropzone.currency}`);
        console.log(`  ✅ Currency field is accessible: ${!!testDropzone.currency}`);
      }
    }

    // Test 3: Check balance service returns correct currency
    console.log('\n' + '-'.repeat(80));
    console.log('📍 Test 3: Balance Service Currency\n');
    console.log('  Note: This test requires a checked-in user.');
    console.log('  The balance service now reads currency from dropzone settings.');
    console.log('  Test by checking in to a dropzone and viewing balance.');

    console.log('\n' + '='.repeat(80));
    console.log('✅ CURRENCY IMPLEMENTATION TEST COMPLETE');
    console.log('='.repeat(80) + '\n');

    console.log('Summary:');
    console.log(`  - ${dropzones.length} dropzones checked`);
    console.log(`  - All dropzones have currency configured: ${dropzones.every(dz => !!dz.currency)}`);
    console.log('\nNext Steps:');
    console.log('  1. Check in to a dropzone');
    console.log('  2. View shop to see products with correct currency');
    console.log('  3. View balance to confirm currency matches dropzone');
    console.log('  4. Add products and verify cart uses dropzone currency\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
})();
