# Dropzone User Profiles Feature

This document describes the dropzone user profiles feature, which stores checked-in user information in Firebase for each dropzone.

## Overview

When a user checks into a dropzone, their profile information is automatically stored in the dropzone's Firebase database. This allows dropzone staff to see who is currently on-site and access important user information like licenses, emergency contacts, etc.

## Data Structure

### Firebase Path
```
dropzones/{dropzoneId}/checked_in_users/{customerId}
```

### Stored Profile Data

Each checked-in user document contains:

- **customerId** (string): Unique customer identifier
- **accountId** (string): Firebase auth user ID
- **email** (string): User's email address
- **firstName** (string): User's first name
- **lastName** (string): User's last name
- **nickname** (string, optional): User's preferred nickname
- **phone** (string, optional): User's phone number
- **licenseType** (string, optional): License type (e.g., USPA, BPA)
- **licenseRating** (string, optional): License rating (e.g., A, B, C, D)
- **licenseNumber** (string, optional): License number
- **checkedInAt** (timestamp): When the user checked in
- **checkedOut** (boolean, optional): Whether the user has checked out
- **checkedOutAt** (timestamp, optional): When the user checked out

## Implementation

### Check-In Flow

1. User checks into a dropzone via the app
2. System updates the customer's `currentDropzone` field
3. System creates/updates a document in `dropzones/{dropzoneId}/checked_in_users/{customerId}`
4. User profile is now visible to the dropzone

### Check-Out Flow

1. User checks out from a dropzone
2. System marks the user's profile as checked out (`checkedOut: true`)
3. System records the check-out timestamp
4. User profile is removed from active users list but remains in history

### Switching Dropzones

1. If user tries to check into a new dropzone while already checked in
2. System prompts for confirmation
3. If confirmed, user is marked as checked out from previous dropzone
4. User is then checked into the new dropzone

## API Functions

### `checkInToDropzone(accountId, dropzoneId, allowSwitch)`

Checks a user into a dropzone and stores their profile.

```typescript
const result = await checkInToDropzone(
  user.uid,
  'dropzone123',
  false // allowSwitch
);

if (result.success) {
  console.log('Checked in successfully');
} else if (result.needsConfirmation) {
  console.log('Already checked into:', result.currentDropzone);
} else {
  console.error('Error:', result.error);
}
```

### `checkOutFromDropzone(accountId)`

Checks a user out and marks their profile as checked out.

```typescript
const result = await checkOutFromDropzone(user.uid);

if (result.success) {
  console.log('Checked out successfully');
} else {
  console.error('Error:', result.error);
}
```

### `getCheckedInUsers(dropzoneId)`

Retrieves all currently checked-in users for a dropzone.

```typescript
const users = await getCheckedInUsers('dropzone123');

users.forEach(user => {
  console.log(`${user.firstName} ${user.lastName} - ${user.email}`);
  if (user.licenseType) {
    console.log(`License: ${user.licenseType} ${user.licenseRating}`);
  }
});
```

## Testing

### Test Check-In and Profile Storage

Run the test script to verify the functionality:

```bash
npx tsx scripts/test-checkin-profiles.ts
```

This script will:
1. Check in a test user
2. Verify the profile is stored in the dropzone
3. Check out the user
4. Verify the profile is marked as checked out

### View All Dropzone Check-Ins

To see all checked-in users across all dropzones:

```bash
npx tsx scripts/view-dropzone-checkins.ts
```

## Security Considerations

1. **Profile Data Privacy**: Only essential information is stored
2. **Access Control**: Dropzone staff should authenticate before accessing user profiles
3. **Data Retention**: Checked-out users remain in history for record-keeping
4. **Field Validation**: Optional fields are only stored if they exist (no undefined values)

## Future Enhancements

Potential improvements to consider:

1. **Real-time Updates**: Add listeners to show live check-in/check-out events
2. **Check-In History**: Track historical check-ins for analytics
3. **Emergency Information**: Store emergency contact details
4. **Waivers**: Link to signed waivers and documents
5. **Photo Storage**: Store profile photos for visual identification
6. **Expiry Alerts**: Alert staff about expired licenses
7. **Capacity Management**: Track total checked-in users vs dropzone capacity
8. **Auto Check-Out**: Automatically check out users after 24 hours

## Integration with App Features

### Shop/Tickets
- Users can only purchase tickets from their checked-in dropzone
- Ticket display filters by current dropzone

### Logbook
- Jump records can be linked to check-in sessions
- Automatic dropzone tagging based on current check-in

### Load Management
- Manifest can pull from checked-in users
- Quick access to license information during load organization
