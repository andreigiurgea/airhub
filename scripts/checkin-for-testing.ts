import { checkInToDropzone } from '../lib/dropzoneService';

const accountId = 'jK2YR1tiHccHhvtL0xIzaWldVqK2';
const dropzoneId = 'yfjBsZLLIcOJYGYBnnEi'; // Skydive Dubai Palm Dropzone

(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING IN FOR TESTING');
  console.log('='.repeat(80) + '\n');

  const result = await checkInToDropzone(accountId, dropzoneId, true);

  if (result.success) {
    console.log('✅ Successfully checked in to Skydive Dubai Palm Dropzone');
    console.log('\nYou can now test the check-out button in the app.');
    console.log('Watch the browser console for detailed logs!');
  } else {
    console.log('❌ Check-in failed:', result.error);
  }

  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
})();
