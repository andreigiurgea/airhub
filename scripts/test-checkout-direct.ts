import { checkOutFromDropzone, getCurrentCheckIn } from '../lib/dropzoneService';

const accountId = 'jK2YR1tiHccHhvtL0xIzaWldVqK2';

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CHECK-OUT DIRECTLY');
  console.log('='.repeat(80) + '\n');

  console.log('1. Checking current status...');
  const beforeStatus = await getCurrentCheckIn(accountId);

  if (beforeStatus) {
    console.log(`✓ Currently checked into: ${beforeStatus.dropzoneName}`);
    console.log(`  Dropzone ID: ${beforeStatus.dropzoneId}`);
  } else {
    console.log('✗ Not currently checked in');
    process.exit(0);
  }

  console.log('\n2. Attempting check-out...');
  const result = await checkOutFromDropzone(accountId);

  console.log('\n3. Check-out result:');
  console.log(`  Success: ${result.success}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }

  console.log('\n4. Verifying check-out...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const afterStatus = await getCurrentCheckIn(accountId);

  if (afterStatus) {
    console.log(`✗ FAILED - Still checked into: ${afterStatus.dropzoneName}`);
    console.log('  Check-out did not work!');
  } else {
    console.log('✓ SUCCESS - Check-out completed successfully');
  }

  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
})();
