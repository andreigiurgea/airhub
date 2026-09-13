# License Format Update

## Overview

The license field format has been updated to include the license level (A, B, C, or D) in addition to the type and number.

## New Format

**Before:**
```
USPA-55168
```

**After:**
```
USPA: A - 55168
```

### Format Structure

```
{LicenseType}: {Level} - {LicenseNumber}
```

**Examples:**
- `USPA: A - 55168`
- `USPA: B - 12345`
- `USPA: C - 98765`
- `USPA: D - 54321`
- `Other: Custom - 11111`

## Implementation Details

### Database Field

The license is stored in the `customers` collection:

```typescript
{
  id: "C1234567",
  firstName: "John",
  lastName: "Doe",
  license: "USPA: A - 55168",  // ← Updated format
  licenseExpiry: "30/06/2026",
  stats: {
    licenses: ["A"]  // Also stored here for quick access
  }
}
```

### Profile Setup (New Users)

When a new user sets up their profile:

```typescript
// app/(auth)/profile-setup.tsx line 106
license: licenseNumber ? `${licenseType}: ${licenseRating} - ${licenseNumber}` : ''
```

This saves the license as: `USPA: A - 55168`

### Profile Edit (Existing Users)

When an existing user edits their profile:

```typescript
// app/profile.tsx line 140
license: licenseNumber ? `${licenseType}: ${licenseRating} - ${licenseNumber}` : ''
```

### Parsing (Loading Licenses)

The app can read both old and new formats:

```typescript
// app/profile.tsx lines 63-82
if (data.license) {
  // Parse new format: "USPA: A - 55168"
  const licenseMatch = data.license.match(/^([^:]+):\s*([A-D])\s*-\s*(.+)$/);
  if (licenseMatch) {
    setLicenseType(licenseMatch[1].trim());      // "USPA"
    setLicenseRating(licenseMatch[2].trim());    // "A"
    setLicenseNumber(licenseMatch[3].trim());    // "55168"
  } else {
    // Fallback to old format "USPA-55168"
    const licenseParts = data.license.split('-');
    if (licenseParts.length > 1) {
      setLicenseType(licenseParts[0].trim());
      setLicenseNumber(licenseParts.slice(1).join('-').trim());
    }
  }
}
```

## Backward Compatibility

The app supports both formats:

✅ **New Format:** `USPA: A - 55168` - Fully parsed with type, level, and number
✅ **Old Format:** `USPA-55168` - Parsed for type and number, level from `stats.licenses`

When users edit their profile, old format licenses are automatically converted to the new format.

## Migration

### Automatic Migration

No manual migration is required. When users edit their profile:

1. The old format is parsed correctly
2. The license level is loaded from `stats.licenses` if not in the license string
3. On save, the new format is written to the database

### Manual Verification

To verify license formats in your database:

```bash
npx tsx scripts/verify-license-format.ts
```

This script will show:
- All customers with licenses
- Which format each license uses (old or new)
- Parsed components (type, level, number)

## UI Components

The profile screens display the license information in a structured way:

### License Type Selection
- USPA (default)
- Other (custom)

### License Rating/Level (for USPA)
- A (lowest)
- B
- C
- D (highest)

### License Number
- Free text input for the license number

### Expiration Date
- Date input in DD/MM/YYYY format

## Benefits

✅ **Complete Information**: License now includes type, level, and number
✅ **Structured Data**: Easy to parse and display
✅ **Backward Compatible**: Old format still works
✅ **Automatic Migration**: Updates on profile edit
✅ **Clear Display**: Shows all license details at a glance

## Examples

### USPA License with Level A
```
License Type: USPA
License Level: A
License Number: 55168
Stored As: "USPA: A - 55168"
```

### USPA License with Level D
```
License Type: USPA
License Level: D
License Number: 98765
Stored As: "USPA: D - 98765"
```

### Other License Type
```
License Type: Other
License Level: Professional
License Number: ABC123
Stored As: "Other: Professional - ABC123"
```

## Files Modified

1. **app/(auth)/profile-setup.tsx**
   - Line 106: Updated license format to include level
   - New format: `${licenseType}: ${licenseRating} - ${licenseNumber}`

2. **app/profile.tsx**
   - Lines 63-82: Added parsing for new format with fallback to old format
   - Line 140: Updated license save format to include level

3. **scripts/verify-license-format.ts** (new)
   - Script to verify license formats in the database

## Testing

### Test New User Registration

1. Open the app in signup flow
2. Complete profile setup with license info:
   - Select "USPA" as license type
   - Select "C" as license rating
   - Enter "55168" as license number
3. Save profile
4. Verify in Firebase: license should be `USPA: C - 55168`

### Test Existing User Profile Edit

1. Login with existing user
2. Go to profile screen
3. Edit license information
4. Save profile
5. Verify updated format includes level

### Test Old Format Compatibility

1. Manually set a license to old format in Firebase: `USPA-55168`
2. Open profile in the app
3. Verify it loads correctly
4. Edit and save profile
5. Verify it's now saved in new format: `USPA: A - 55168`

## Summary

The license field now stores the complete license information in a structured format: `USPA: A - 55168`. This provides better data organization while maintaining backward compatibility with existing licenses.
