# Dropzone-Specific Loads Implementation

## Issue
Loads list was empty because the app was reading from the global `/loads` collection instead of the dropzone-specific path `/dropzones/{dropzoneId}/loads/`.

## Changes Made

### 1. Home Screen (`app/(tabs)/index.tsx`)

**Before:**
```typescript
const loadsRef = collection(db, 'loads');
const q = query(loadsRef, where('status', '==', 'upcoming'));
```

**After:**
```typescript
useEffect(() => {
  if (!currentCheckIn?.dropzoneId) {
    setNextLoad(null);
    return;
  }

  // Fetch loads from dropzone-specific path
  const loadsRef = collection(db, 'dropzones', currentCheckIn.dropzoneId, 'loads');
  const q = query(loadsRef, where('status', '==', 'upcoming'));

  // ... rest of the code
}, [currentCheckIn]);
```

**Key Changes:**
- Added check for `currentCheckIn?.dropzoneId`
- Changed path from `collection(db, 'loads')` to `collection(db, 'dropzones', currentCheckIn.dropzoneId, 'loads')`
- Updated dependency array from `[]` to `[currentCheckIn]` to reload when check-in changes
- Clears next load when not checked in

### 2. Loads Tab (`app/(tabs)/loads.tsx`)

**Before:**
```typescript
const loadsRef = collection(db, 'loads');
const q = query(loadsRef, where('status', '==', 'upcoming'));
```

**After:**
```typescript
useEffect(() => {
  if (!currentCheckIn?.dropzoneId) {
    setLoads([]);
    setLoading(false);
    return;
  }

  // Fetch loads from dropzone-specific path
  const loadsRef = collection(db, 'dropzones', currentCheckIn.dropzoneId, 'loads');
  const q = query(loadsRef, where('status', '==', 'upcoming'));

  // ... rest of the code
}, [currentCheckIn]);
```

**Additional Changes:**
- Added `currentCheckIn` state variable
- Updated `fetchCustomerData` to also fetch check-in status
- Updated `handleJoinLoad` to use dropzone-specific path:
  ```typescript
  const loadRef = doc(db, 'dropzones', currentCheckIn.dropzoneId, 'loads', loadId);
  ```
- Updated `handleLeaveLoad` to use dropzone-specific path:
  ```typescript
  const loadRef = doc(db, 'dropzones', currentCheckIn.dropzoneId, 'loads', loadId);
  ```

## Data Flow

### Old Flow (Global Loads)
```
App → /loads (global collection)
     → No dropzone context
     → Empty list (no global loads)
```

### New Flow (Dropzone-Specific Loads)
```
User checks in to dropzone
     ↓
currentCheckIn.dropzoneId set
     ↓
App → /dropzones/{dropzoneId}/loads
     ↓
Loads specific to that dropzone displayed
     ↓
Join/Leave operations target dropzone-specific loads
```

## Benefits

1. **Dropzone Isolation**: Each dropzone has its own load manifest
2. **Data Organization**: Loads are properly scoped to their dropzones
3. **Real-time Updates**: Changes to loads automatically reflect in the UI
4. **Multi-Dropzone Support**: Users switching between dropzones see correct loads
5. **Better Performance**: Queries are scoped to specific dropzones instead of scanning all loads

## Testing

### Manual Test Steps

1. **Check into a dropzone** with loads:
   ```
   - Open app
   - Check in to dropzone (e.g., TNT Brothers Clinceni)
   - Verify loads appear on home screen "Next Load" card
   - Navigate to Loads tab
   - Verify all upcoming loads are displayed
   ```

2. **Test load operations**:
   ```
   - Tap on a load to view details
   - Join a load
   - Verify your name appears in the manifest
   - Leave the load
   - Verify your name is removed
   ```

3. **Test dropzone switching**:
   ```
   - Check out from current dropzone
   - Check into different dropzone
   - Verify loads update to show new dropzone's loads
   - Verify empty state shows if no loads exist
   ```

4. **Test not checked in state**:
   ```
   - Sign in without checking into dropzone
   - Verify home screen shows no next load
   - Verify Loads tab shows empty state
   ```

## Database Structure

Loads are now stored at:
```
/dropzones
  /{dropzoneId}
    /loads
      /{loadId}
        - aircraft: string
        - loadNumber: number
        - time: string
        - maxSlots: number
        - status: "upcoming" | "boarding" | "airborne" | "landed"
        - jumpers: array
          - id: string
          - name: string
          - firstName: string
          - lastName: string
          - nickname: string
          - useNickname: boolean
        - loadMasters: array (optional)
```

## Files Modified

1. ✅ `app/(tabs)/index.tsx` - Home screen next load display
2. ✅ `app/(tabs)/loads.tsx` - Full loads list and manifest operations

## Related Features

- Check-in/Check-out system (`lib/dropzoneService.ts`)
- Load details screen (`app/load-info.tsx`)
- Real-time load updates via Firestore snapshots

## Future Enhancements

1. Add load history view per dropzone
2. Implement load statistics and analytics
3. Add notifications for load calls
4. Support for multiple aircraft per dropzone
5. Load master dashboard for managing loads
