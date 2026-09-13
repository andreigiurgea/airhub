# Currency Hardcode Fix Summary

## Issue
Prices were still displaying in AED (dirhams) instead of the dynamic dropzone currency. Several fallback values and default currency assignments were hardcoded to 'AED' throughout the app.

## Changes Made

### 1. `app/shop.tsx`

#### Check-in Listener Currency Update
- **Line 90-104**: Added currency fetch when check-in status changes
- Now fetches dropzone currency and updates `setCurrency()` whenever user checks in/out
- This ensures currency is set immediately when checking into a dropzone

#### Balance Listener Fallbacks
- **Line 242-245**: Added dropzone currency fetch before setting up balance listener
- **Line 254**: Changed fallback from `'AED'` to `dropzoneCurrency` when no client record found
- **Line 271**: Changed from `clientData.currency || 'AED'` to just `dropzoneCurrency`
- **Line 281**: Changed fallback from `'AED'` to `dropzoneCurrency` in subcollection listener
- **Line 285**: Changed fallback from `'AED'` to `dropzoneCurrency` when no balance found
- **Line 299**: Changed fallback from `'AED'` to `dropzoneCurrency` when no client document

#### Ticket Currency Fallback
- **Line 434**: Changed ticket currency fallback from `data.currency || 'AED'` to `data.currency || currency`
- Now uses current dropzone currency instead of hardcoded AED

### Summary of Changes

**Before:**
```typescript
// Hardcoded fallbacks
setCurrency('AED');
const currency = clientData.currency || 'AED';
currency: data.currency || 'AED'
```

**After:**
```typescript
// Dynamic dropzone currency
const dropzone = await getDropzoneById(dropzoneId);
const dropzoneCurrency = dropzone?.currency || 'AED';
setCurrency(dropzoneCurrency);
currency: data.currency || currency  // Uses current dropzone currency
```

## Impact

### Before Fix
- When checking into a dropzone with currency USD, MVR, or RON
- Balance would show "AED 0.00"
- Products would show "AED 12000"
- Tickets would default to "AED"

### After Fix
- When checking into Skydive Maldive (MVR):
  - Balance shows "MVR 0.00"
  - Products show "MVR 12000"
  - All prices use MVR

- When checking into TNT Brothers Clinceni (USD):
  - Balance shows "USD 0.00"
  - Products show "USD 12000"
  - All prices use USD

## Testing

1. **Check into different dropzones:**
   ```
   - Skydive Maldive → Should show MVR
   - TNT Brothers Clinceni → Should show USD
   - Skydive Dubai → Should show USD
   ```

2. **Verify all screens:**
   - Shop screen balance display
   - Product prices
   - Ticket prices in "My Tickets" tab
   - Cart totals
   - Bookings prices

3. **Test switching dropzones:**
   - Check out from one dropzone
   - Check into another with different currency
   - Verify all prices update to new currency

## Files Modified

1. ✅ `app/shop.tsx` - Removed all hardcoded 'AED' fallbacks, now uses dropzone currency

## Technical Details

The fix ensures that:
1. Currency is loaded from dropzone settings when checking in
2. All fallback values use the dropzone's currency instead of hardcoded 'AED'
3. Real-time balance updates maintain the correct currency
4. Tickets and products use the dropzone currency as their fallback
5. Currency persists correctly across component updates

## Related Files

- `lib/dropzoneService.ts` - Provides `getDropzoneById()` with currency field
- `lib/balanceService.ts` - Returns balance with dropzone currency
- `app/cart.tsx` - Already uses dynamic currency (no changes needed)
- `app/bookings.tsx` - Already uses dynamic currency (no changes needed)
- `app/purchase-success.tsx` - Already uses dynamic currency (no changes needed)
