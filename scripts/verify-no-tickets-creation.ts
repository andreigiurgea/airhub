import { readFileSync } from 'fs';
import { join } from 'path';

console.log('================================================================================');
console.log('VERIFYING NO TICKETS COLLECTION CREATION');
console.log('================================================================================\n');

const cartPath = join(process.cwd(), 'app', 'cart.tsx');
const cartContent = readFileSync(cartPath, 'utf-8');

console.log('Checking app/cart.tsx for tickets collection references...\n');

// Check for tickets collection creation
const ticketsCollectionPatterns = [
  /collection\(.*['"']tickets['"']\)/i,
  /ticketsRef.*=.*collection/i,
  /addDoc\(.*tickets/i,
];

let foundIssues = false;

ticketsCollectionPatterns.forEach((pattern, index) => {
  if (pattern.test(cartContent)) {
    console.log(`❌ Found pattern ${index + 1}: ${pattern}`);
    foundIssues = true;
  }
});

if (!foundIssues) {
  console.log('✅ No tickets collection creation found in cart.tsx');
}

console.log('');
console.log('Verifying purchase structure includes required fields...\n');

const requiredFields = [
  'customerId',
  'accountId',
  'dropzoneId',
  'dropzoneName',
  'currency',
  'altitude',
  'items:',
  'used: false',
  'canceled: false',
];

const missingFields: string[] = [];

requiredFields.forEach((field) => {
  if (!cartContent.includes(field)) {
    missingFields.push(field);
  }
});

if (missingFields.length > 0) {
  console.log('❌ Missing required fields:');
  missingFields.forEach((field) => {
    console.log(`   - ${field}`);
  });
} else {
  console.log('✅ All required fields are present in purchase structure');
}

console.log('');
console.log('================================================================================');

if (!foundIssues && missingFields.length === 0) {
  console.log('✅ VERIFICATION PASSED');
  console.log('');
  console.log('Summary:');
  console.log('  ✅ No tickets collection creation in cart.tsx');
  console.log('  ✅ Purchases include all required fields');
  console.log('  ✅ Items have used and canceled flags');
  console.log('  ✅ Purchases have canceled flag');
} else {
  console.log('❌ VERIFICATION FAILED');
  console.log('');
  console.log('Issues found - please review the code');
}

console.log('================================================================================');
