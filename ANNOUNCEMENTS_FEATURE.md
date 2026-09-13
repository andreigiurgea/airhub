# Announcements Feature

## Overview

The home screen now displays **all announcements** from Firebase Firestore in real-time under a dedicated "Announcements" section. When a new announcement is added to the Firebase database, it immediately appears on the home screen without requiring a page refresh.

## How It Works

### Data Structure

Announcements are stored in the `announcements` collection in Firebase Firestore with the following structure:

```typescript
interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Timestamp;
  author?: string; // Optional field for future use
}
```

### Priority Levels

Each announcement card displays a colored badge and left border based on priority:

- **Low** (blue):
  - Background: `#EFF6FF`
  - Border & Badge: Blue tones
  - Use for: General information, non-urgent updates

- **Medium** (yellow):
  - Background: `#FFF9E6`
  - Border & Badge: Amber/yellow tones
  - Use for: Important information that users should be aware of

- **High** (red):
  - Background: `#FEE2E2`
  - Border & Badge: Red tones
  - Use for: Urgent alerts, safety warnings, critical information

### Real-Time Updates

The feature uses Firebase's `onSnapshot` listener to automatically update all announcements when:
- A new announcement is added
- An existing announcement is updated
- An announcement is deleted

The list is automatically sorted by creation date (newest first).

### Visual Design

**Section Header:**
- Megaphone icon
- "Announcements" title in bold

**Each Announcement Card:**
- Color-coded left border (4px wide)
- Priority badge in the top-right
- Title in bold
- Timestamp showing when the announcement was created
- Message text with proper line height for readability
- Card background matching priority level
- Subtle shadow for depth

**Responsive Layout:**
- Cards stack vertically with consistent spacing
- Section only displays when announcements exist (no empty state shown)

## Adding Announcements

### Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `skydive-boogie`
3. Navigate to **Firestore Database**
4. Select the `announcements` collection (create if it doesn't exist)
5. Click **"Add document"**
6. Add the following fields:
   - `title` (string): "Weather Alert"
   - `message` (string): "High winds expected this afternoon."
   - `priority` (string): "high", "medium", or "low"
   - `createdAt` (timestamp): Use Firebase's server timestamp

### Example Data

**High Priority - Weather Alert:**
```json
{
  "title": "Weather Alert",
  "message": "High winds expected this afternoon. Jumping may be suspended after 3 PM.",
  "priority": "high",
  "createdAt": "2024-02-20T14:30:00Z"
}
```

**Medium Priority - Course Announcement:**
```json
{
  "title": "New Course Available",
  "message": "Advanced Freefly course starts next Monday. Sign up at the front desk!",
  "priority": "medium",
  "createdAt": "2024-02-20T14:25:00Z"
}
```

**Low Priority - General Info:**
```json
{
  "title": "Dropzone Hours Extended",
  "message": "We are now open until 8 PM on weekends throughout the summer season.",
  "priority": "low",
  "createdAt": "2024-02-20T14:20:00Z"
}
```

## Implementation Details

### Location
- File: `app/(tabs)/index.tsx`
- Lines: 94-110 (real-time listener setup)
- Lines: 252-303 (UI rendering)
- Lines: 559-651 (styles)

### Dependencies
- `firebase/firestore` for database operations
- `lucide-react-native` for the Megaphone icon
- Real-time listener automatically cleans up on component unmount

### Query Logic
The app fetches all announcements sorted by newest first:
```typescript
const q = query(announcementsRef, orderBy('createdAt', 'desc'));
```

This ensures announcements are always displayed in chronological order with the most recent at the top.

### State Management
```typescript
const [announcements, setAnnouncements] = useState<Announcement[]>([]);
```

The state automatically updates whenever Firebase detects changes in the `announcements` collection.

## Best Practices

1. **Keep messages concise** - Users should be able to quickly scan announcements
2. **Use priority appropriately** - Reserve "high" for truly urgent matters
3. **Include timestamps** - The system automatically displays when each announcement was created
4. **Regular cleanup** - Remove outdated announcements from Firebase to keep the list relevant
5. **Test real-time updates** - Add a new announcement in Firebase Console and watch it appear instantly in the app
