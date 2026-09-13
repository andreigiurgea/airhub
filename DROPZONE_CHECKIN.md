# Dropzone Check-In/Out System

## Issues Fixed

### 1. Categories Expanded by Default ✅
**Problem**: All product categories were expanded when opening the shop screen.

**Solution**: Removed the auto-expansion logic. Categories now start collapsed.

**Change Made**:
- File: `app/shop.tsx`
- Removed the code that automatically added all categories to `expandedCategories` state
- Users can now manually expand/collapse categories as needed by tapping on them

### 2. Auto Check-In Issue ✅
**Problem**: User was automatically checked in and couldn't check out.

**Root Cause**: There was a lingering check-in state in the database, possibly from test scripts.

**Solution**:
- Cleared all check-ins from the database
- Verified no background processes are running that auto-check-in users
- Check-out functionality is working correctly now

## How Check-In Works

### Check-In Flow
1. User taps "Check in to a dropzone" on home screen
2. Modal appears with list of available dropzones
3. User selects a dropzone
4. System checks if already checked in elsewhere
   - If yes, asks for confirmation to switch
   - If no, checks in directly
5. Check-in status updates in real-time across all screens
6. Shop screen loads products from that dropzone

### Check-Out Flow
1. User taps "Check Out" button on home screen
2. Confirmation dialog appears: "Are you sure you want to check out from [Dropzone Name]?"
3. User taps "Check Out" to confirm
4. System removes check-in from customer record
5. UI updates to show "Check in to a dropzone" prompt
6. Shop screen clears and shows check-in prompt

### Real-Time Updates
The check-in status is monitored using Firebase listeners:
- Home screen sets up a listener on customer document
- When `currentDropzone` field changes, UI updates automatically
- No polling or manual refresh needed
- Works across all screens simultaneously

## Database Structure

### Customer Document
```javascript
{
  accountId: "user-uid",
  id: "C1234567",
  firstName: "John",
  lastName: "Doe",
  currentDropzone: {
    dropzoneId: "dropzone-id",
    dropzoneName: "Dropzone Name",
    checkedInAt: Timestamp
  } // null when not checked in
}
```

## Debugging Check-In Issues

### Check Current Status
```bash
npx tsx scripts/check-customer-checkins.ts
```

This shows:
- All customers currently checked in
- Which dropzone they're checked into
- When they checked in
- Customer ID and account ID

### Clear All Check-Ins
```bash
npx tsx scripts/clear-all-checkins.ts
```

Use this if users are stuck in a checked-in state.
**Warning**: This clears ALL customer check-ins!

### Monitor Check-In Changes (Real-Time)
```bash
npx tsx scripts/monitor-checkin-changes.ts
```

This runs continuously and shows:
- Real-time check-in/out events
- Timestamp of each change
- Change number counter
- Helps identify if something is auto-checking users in

Press Ctrl+C to stop monitoring.

## Common Issues & Solutions

### Issue: User Can't Check Out

**Symptoms**:
- Check Out button doesn't work
- User remains checked in after tapping Check Out
- Button shows but nothing happens

**Debug Steps**:
1. Check browser/app console for errors
2. Verify Firebase connection is active
3. Check customer document in Firebase console
4. Try manual clear: `npx tsx scripts/clear-all-checkins.ts`
5. Check network tab for failed requests

**Possible Causes**:
- Firebase permission issue
- Network connectivity problem
- Listener not cleaning up properly
- Customer document not found

**Solution**:
1. Clear all check-ins using script
2. Restart the app
3. Check Firebase rules allow writes to customer documents
4. Verify user is authenticated

### Issue: Auto Check-In

**Symptoms**:
- User automatically checked in on app launch
- Check-out doesn't persist (checks back in immediately)
- Check-in happens without user action

**Debug Steps**:
1. Run monitor script to see exactly when check-in happens
2. Check for background test scripts running: `ps aux | grep tsx`
3. Review code for automatic check-in logic
4. Check if any useEffect is calling checkInToDropzone

**Prevention**:
- Don't leave test scripts running in background
- Clear check-ins after testing with scripts
- Use monitoring script during development
- Review code changes that touch check-in logic

**Solution**:
The code doesn't have any auto check-in logic. If this happens:
1. Stop all test scripts
2. Clear all check-ins
3. Monitor for a few minutes to see if it happens again
4. Check Firebase logs for write operations

### Issue: Check-In Doesn't Update UI

**Symptoms**:
- User checks in but home screen doesn't update
- Shop screen doesn't load dropzone products
- Check-in succeeds but UI shows old state

**Debug Steps**:
1. Check console for listener setup messages
2. Verify customer document updates in Firebase console
3. Check for listener errors in console logs
4. Restart app to reinitialize listeners
5. Check if state is being set correctly

**Solution**:
The listener is set up correctly in `app/(tabs)/index.tsx`. If it's not working:
- Check that the listener isn't being cleaned up prematurely
- Verify the customer document has correct structure
- Look for JavaScript errors preventing state updates
- Check React DevTools to see if state is changing

## API Reference

### checkInToDropzone()
```typescript
checkInToDropzone(
  accountId: string,
  dropzoneId: string,
  allowSwitch: boolean = false
): Promise<{
  success: boolean;
  error?: string;
  needsConfirmation?: boolean;
  currentDropzone?: string;
}>
```

**Parameters**:
- `accountId`: User's Firebase auth UID
- `dropzoneId`: ID of dropzone to check into
- `allowSwitch`: If true, allows switching from current dropzone without confirmation

**Returns**:
- `success`: True if check-in succeeded
- `error`: Error message if failed
- `needsConfirmation`: True if user is already checked in elsewhere
- `currentDropzone`: Name of current dropzone if needs confirmation

### checkOutFromDropzone()
```typescript
checkOutFromDropzone(
  accountId: string
): Promise<{
  success: boolean;
  error?: string;
}>
```

**Parameters**:
- `accountId`: User's Firebase auth UID

**Returns**:
- `success`: True if check-out succeeded
- `error`: Error message if failed

### getCurrentCheckIn()
```typescript
getCurrentCheckIn(
  accountId: string
): Promise<CheckInStatus | null>
```

**Parameters**:
- `accountId`: User's Firebase auth UID

**Returns**:
- CheckInStatus object if checked in
- null if not checked in

## Testing Checklist

### Test Check-In Flow
- [ ] Start monitor script
- [ ] Open app
- [ ] Verify not checked in initially
- [ ] Tap "Check in to a dropzone"
- [ ] Verify modal opens with dropzone list
- [ ] Select a dropzone
- [ ] Verify loading state shows
- [ ] Verify check-in appears in monitor
- [ ] Verify home screen updates with dropzone name
- [ ] Verify shop screen loads products from dropzone

### Test Check-Out Flow
- [ ] Ensure checked in to a dropzone
- [ ] Start monitor script
- [ ] Tap "Check Out" button
- [ ] Verify confirmation dialog appears
- [ ] Tap "Check Out" to confirm
- [ ] Verify check-out appears in monitor
- [ ] Verify home screen updates to check-in prompt
- [ ] Verify shop screen clears products

### Test Switch Dropzone
- [ ] Check in to dropzone A
- [ ] Try to check in to dropzone B
- [ ] Verify confirmation dialog appears
- [ ] Confirm switch
- [ ] Verify check-in updates to dropzone B
- [ ] Verify shop loads products from dropzone B
- [ ] Verify monitor shows the switch

### Test Real-Time Updates
- [ ] Open app on two devices/browsers
- [ ] Check in on device 1
- [ ] Verify device 2 updates automatically
- [ ] Check out on device 1
- [ ] Verify device 2 updates automatically

## Security Considerations

- Check-in state is stored in customer document
- Only authenticated users can check in/out
- Firebase rules should prevent:
  - Checking in other users
  - Modifying other users' check-in state
  - Reading other users' check-in status (unless admin)
- Check-in operations use user's auth UID for security

## Performance

- Check-in/out operations are fast (< 1 second typically)
- Real-time listeners use WebSocket (low overhead)
- No polling required
- Minimal Firebase reads:
  - 1 read to get customer document
  - 1 read to get dropzone details
  - Listener updates are efficient (only changed fields)

## Available Dropzones

1. **TNT Brothers Clinceni** (Romania)
2. **Skydive Dubai Desert Dropzone** (UAE)
3. **Skydive Dubai Palm Dropzone** (UAE)
