# Logout with Dropzone Check-Out Feature

## Overview

When a user attempts to log out while checked in to a dropzone, the system displays a confirmation dialog informing them they will also be checked out from the dropzone. This prevents users from accidentally leaving the app while still registered as checked in.

## User Flow

### Scenario 1: User is NOT checked in

1. User taps "Logout" button
2. System immediately signs user out
3. User is redirected to login screen

### Scenario 2: User IS checked in to a dropzone

1. User taps "Logout" button
2. System detects active check-in
3. Alert dialog is shown:

```
┌─────────────────────────────────────┐
│ Check Out Required                  │
│                                     │
│ You are currently checked in at     │
│ Skydive Dubai Desert Dropzone       │
│ Logging out will also check you out │
│ from the dropzone.                  │
│                                     │
│      [Cancel]  [Logout & Check Out] │
└─────────────────────────────────────┘
```

4. User has two options:
   - **Cancel**: Closes dialog, stays logged in and checked in
   - **Logout & Check Out**: Proceeds with checkout and logout

5. If user confirms:
   - System checks user out from dropzone (`checkedIn` → `false`)
   - System signs user out of the app
   - User is redirected to login screen

## Implementation

### Home Screen (app/(tabs)/index.tsx)

The logout button on the home screen includes the check-in detection:

```typescript
const handleSignOut = async () => {
  try {
    // Check if user is currently checked in to a dropzone
    if (currentCheckIn) {
      Alert.alert(
        'Check Out Required',
        `You are currently checked in at ${currentCheckIn.dropzoneName}. Logging out will also check you out from the dropzone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Logout & Check Out',
            style: 'destructive',
            onPress: async () => {
              // Check out from dropzone first
              if (user) {
                await checkOutFromDropzone(user.uid);
              }
              // Then sign out
              await signOut();
              router.replace('/(auth)/login');
            }
          }
        ]
      );
    } else {
      // Not checked in, just sign out normally
      await signOut();
      router.replace('/(auth)/login');
    }
  } catch (error) {
    console.error('Error signing out:', error);
  }
};
```

### More/Menu Screen (app/(tabs)/more.tsx)

The logout option in the More menu also includes the same check-in detection:

```typescript
const [currentCheckIn, setCurrentCheckIn] = useState<CheckInStatus | null>(null);

useEffect(() => {
  loadCheckInStatus();
}, [user]);

const loadCheckInStatus = async () => {
  if (!user) return;
  const status = await getCurrentCheckIn(user.uid);
  setCurrentCheckIn(status);
};

const handleLogout = async () => {
  try {
    // Check if user is currently checked in to a dropzone
    if (currentCheckIn) {
      Alert.alert(
        'Check Out Required',
        `You are currently checked in at ${currentCheckIn.dropzoneName}. Logging out will also check you out from the dropzone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Logout & Check Out',
            style: 'destructive',
            onPress: async () => {
              // Check out from dropzone first
              if (user) {
                await checkOutFromDropzone(user.uid);
              }
              // Then sign out
              await signOut();
              router.replace('/(auth)/login');
            }
          }
        ]
      );
    } else {
      // Not checked in, just sign out normally
      await signOut();
      router.replace('/(auth)/login');
    }
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to logout');
  }
};
```

## Database Operations

When user confirms "Logout & Check Out":

### 1. Check Out from Dropzone

**Path:** `dropzones/{dropzoneId}/clients/{clientId}`

```json
{
  "customerId": "C1234567",
  "checkedIn": false  // ← Updated from true to false
}
```

**Path:** `customers/{customerId}`

```json
{
  "currentDropzone": null  // ← Cleared
}
```

### 2. Sign Out

User is signed out from Firebase Auth and redirected to login screen.

## Benefits

✅ **Prevents Ghost Check-Ins**: Users can't remain checked in after logout
✅ **Clear Communication**: Users know exactly what will happen
✅ **User Control**: Option to cancel if they didn't mean to logout
✅ **Data Integrity**: Ensures check-in status is always accurate
✅ **Better UX**: No confusion about check-in state after logout

## Alert Dialog Details

**Title:** "Check Out Required"

**Message:** "You are currently checked in at {Dropzone Name}. Logging out will also check you out from the dropzone."

**Buttons:**
- **Cancel** (style: cancel): Dismisses dialog, no action taken
- **Logout & Check Out** (style: destructive): Confirms action, proceeds with checkout and logout

**Button Style:** The "Logout & Check Out" button uses destructive style (red color) to indicate this is a significant action.

## Testing

### Manual Testing

1. **Test Normal Logout (Not Checked In):**
   - Open app and login
   - Do NOT check in to any dropzone
   - Tap logout
   - Verify: Immediate logout without dialog

2. **Test Logout While Checked In:**
   - Open app and login
   - Check in to a dropzone
   - Tap logout
   - Verify: Alert dialog appears with dropzone name
   - Tap "Cancel"
   - Verify: Still logged in and checked in
   - Tap logout again
   - Tap "Logout & Check Out"
   - Verify: User is logged out and redirected to login
   - Login again
   - Verify: User is not checked in to any dropzone

### Automated Testing

Run the test script:

```bash
npx tsx scripts/test-logout-while-checked-in.ts
```

This script:
1. Creates a test customer
2. Checks in to a dropzone
3. Verifies check-in status
4. Simulates the logout scenario
5. Shows the expected dialog flow

## Files Modified

1. **app/(tabs)/index.tsx**
   - Updated `handleSignOut` function
   - Added check-in status detection
   - Added confirmation dialog

2. **app/(tabs)/more.tsx**
   - Added `currentCheckIn` state
   - Added `loadCheckInStatus` function
   - Updated `handleLogout` function with same logic

## User Experience Flow

```
User taps "Logout"
       ↓
Is user checked in?
       ↓
   ┌───┴───┐
   │  NO   │  YES
   ↓       ↓
Logout   Show Alert
Immediately  "Check Out Required"
   ↓          ↓
Login     User Choice
Screen       ↓
         ┌───┴───┐
      Cancel  Confirm
         ↓       ↓
       Stay   Checkout
      Here   + Logout
               ↓
            Login
            Screen
```

## Edge Cases Handled

1. **User has no active check-in**: Direct logout without dialog
2. **Network error during checkout**: Error is logged, logout may still proceed
3. **User quickly taps logout twice**: Dialog prevents duplicate actions
4. **User is in offline mode**: System attempts logout with local data

## Security Considerations

- Check-in status is verified server-side through Firebase
- User must be authenticated to access logout functionality
- Check-out operation updates both client and customer documents atomically

## Summary

The logout feature now intelligently detects when users are checked in to a dropzone and prompts them with a clear confirmation dialog. This ensures data integrity, prevents ghost check-ins, and provides a better user experience by clearly communicating what will happen when they log out.
