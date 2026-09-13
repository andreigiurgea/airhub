# Checkout CheckedIn Field Behavior

## Overview

When a user checks out from a dropzone, the `checkedIn` field in the client document is correctly set to `false`.

## Implementation

### Checkout Function

Located in `lib/dropzoneService.ts` (lines 184-225):

```typescript
export async function checkOutFromDropzone(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get customer document
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('accountId', '==', accountId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, error: 'Customer not found' };
    }

    const customerDoc = snapshot.docs[0];
    const customerData = customerDoc.data();

    // Update checkedIn field in client document
    if (customerData.currentDropzone?.dropzoneId) {
      const clientsRef = collection(db, 'dropzones', customerData.currentDropzone.dropzoneId, 'clients');
      const clientQuery = query(clientsRef, where('customerId', '==', customerData.id));
      const clientSnapshot = await getDocs(clientQuery);

      if (!clientSnapshot.empty) {
        const clientDocRef = doc(db, 'dropzones', customerData.currentDropzone.dropzoneId, 'clients', clientSnapshot.docs[0].id);
        await updateDoc(clientDocRef, {
          checkedIn: false,  // ← Sets to false
        });
        console.log(`✅ Updated client checkedIn field to false`);
      }
    }

    // Remove check-in info from customer
    await updateDoc(doc(db, 'customers', customerDoc.id), {
      currentDropzone: null,
    });

    return { success: true };
  } catch (error) {
    console.error('Error checking out:', error);
    return { success: false, error: 'Failed to check out' };
  }
}
```

### Checkout UI

Located in `app/(tabs)/index.tsx` (lines 130-153):

```typescript
const handleCheckOut = async () => {
  if (!user) {
    console.log('❌ Check-out failed: No user');
    return;
  }

  console.log('🔔 Check-out button pressed');
  console.log('📍 Current check-in:', currentCheckIn);
  console.log('🔄 Calling checkOutFromDropzone...');

  const result = await checkOutFromDropzone(user.uid);

  console.log('📊 Check-out result:', result);

  if (result.success) {
    console.log('✅ Check-out successful, updating UI...');
    setCurrentCheckIn(null);
    await loadCheckInStatus();
    console.log('✅ UI updated');
  } else {
    console.log('❌ Check-out failed:', result.error);
    Alert.alert('Check-out Failed', result.error || 'Unable to check out');
  }
};
```

## Database Changes on Checkout

When a user checks out, the following changes occur:

### 1. Customer Document
**Path:** `customers/{customerId}`

**Before Checkout:**
```json
{
  "id": "C1234567",
  "accountId": "abc123",
  "firstName": "John",
  "lastName": "Doe",
  "currentDropzone": {
    "dropzoneId": "ukxVHHJn9VwN0T7crcRd",
    "dropzoneName": "Skydive Dubai Desert Dropzone",
    "checkedInAt": "2026-02-27T10:00:00Z"
  }
}
```

**After Checkout:**
```json
{
  "id": "C1234567",
  "accountId": "abc123",
  "firstName": "John",
  "lastName": "Doe",
  "currentDropzone": null  // ← Cleared
}
```

### 2. Client Document
**Path:** `dropzones/{dropzoneId}/clients/{clientId}`

**Before Checkout:**
```json
{
  "customerId": "C1234567",
  "accountId": "abc123",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "checkedIn": true,  // ← Currently checked in
  "lastCheckIn": "2026-02-27T10:00:00Z"
}
```

**After Checkout:**
```json
{
  "customerId": "C1234567",
  "accountId": "abc123",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "checkedIn": false,  // ← Changed to false
  "lastCheckIn": "2026-02-27T10:00:00Z"
}
```

## Testing

### Automated Test

Run the test script to verify checkout behavior:

```bash
npx tsx scripts/test-checkout-sets-false.ts
```

**Test Steps:**
1. Creates a test customer
2. Checks in to a dropzone
3. Verifies `checkedIn = true` in client document
4. Checks out from the dropzone
5. Verifies `checkedIn = false` in client document
6. Verifies `currentDropzone = null` in customer document

**Expected Output:**
```
✅ ALL TESTS PASSED
The checkout function correctly sets:
  • checkedIn = false in client document
  • currentDropzone = null in customer document
```

### Manual Testing

1. **Check In:**
   - Open the app
   - Tap the check-in button
   - Select a dropzone
   - Confirm check-in
   - Verify in Firebase: `checkedIn = true` in client document

2. **Check Out:**
   - Tap the check-out button
   - Confirm checkout
   - Verify in Firebase:
     - `checkedIn = false` in client document
     - `currentDropzone = null` in customer document

## Benefits

✅ **Accurate Status**: Client documents reflect real-time check-in status
✅ **Clean Data**: Checkout properly cleans up check-in state
✅ **Query Efficiency**: Can query checked-in users with `where('checkedIn', '==', true)`
✅ **Prevents Confusion**: No stale check-in data after checkout

## Related Functions

### Check In
When checking in, the opposite happens:
- `checkedIn` is set to `true` in client document
- `currentDropzone` is set with dropzone info in customer document

### Get Checked-In Users
Located in `lib/dropzoneService.ts` (lines 247-273):

```typescript
export async function getCheckedInUsers(
  dropzoneId: string
): Promise<CheckedInUserProfile[]> {
  try {
    const clientsRef = collection(db, 'dropzones', dropzoneId, 'clients');
    const q = query(clientsRef, where('checkedIn', '==', true));  // ← Filters by checkedIn
    const snapshot = await getDocs(q);

    const users: CheckedInUserProfile[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        customerId: data.customerId,
        accountId: data.accountId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        checkedInAt: data.lastCheckIn,
      });
    });

    return users;
  } catch (error) {
    console.error('Error getting checked-in users:', error);
    return [];
  }
}
```

This function relies on the `checkedIn` field being accurate to fetch currently checked-in users.

## Summary

The checkout functionality is working correctly. When a user checks out:

1. The `checkedIn` field in the client document is set to `false`
2. The `currentDropzone` field in the customer document is set to `null`
3. The UI updates to reflect the checkout status

This ensures accurate tracking of which users are currently checked in at each dropzone.
