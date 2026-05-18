# Folder Systems Architecture

This document explains the two different folder sharing systems in the application.

## 🔄 Two Different Systems

### 1. **Shared Folders** (`folderSharing.ts`)
**One-time copy, view-only**

- **What it does**: Creates a copy of a folder for another user
- **Folder ID**: Each user gets a DIFFERENT folder ID
- **Editing**: Only the original owner can modify their copy
- **Sync**: No real-time sync - it's a snapshot at the time of sharing
- **Use case**: "Here's a copy of my favorite movies list for you to reference"

**File**: `lib/firebase/folderSharing.ts`

**Key Functions**:
- `shareFolderWithUsers()` - Share a copy of your folder
- Regular add/remove item functions work independently for each user

---

### 2. **Collaborative Folders** (`collaborativeFolders.ts`)
**Real-time sync, everyone can edit**

- **What it does**: Multiple users work on the SAME folder together
- **Folder ID**: All users share the IDENTICAL folder ID
- **Editing**: All collaborators can add/remove items
- **Sync**: Real-time - changes appear immediately for everyone
- **Use case**: "Let's build a movie night list together"

**File**: `lib/firebase/collaborativeFolders.ts`

**Key Functions**:
- `sendCollaborativeFolderInvites()` - Send invitations to collaborate
- `acceptCollaborativeInvite()` - Accept invitation and create synced folder
- `addItemToCollaborativeFolder()` - Add item and sync to ALL users
- `removeItemFromCollaborativeFolder()` - Remove item and sync to ALL users
- `getCollaborativeFolders()` - Get all collaborative folders

---

## 📊 Comparison Table

| Feature | Shared Folders | Collaborative Folders |
|---------|---------------|----------------------|
| **File** | `folderSharing.ts` | `collaborativeFolders.ts` |
| **Folder ID** | Different for each user | Same for all users |
| **Edit Permission** | Owner only | All collaborators |
| **Real-time Sync** | ❌ No | ✅ Yes |
| **Invitation Required** | Optional | Required |
| **Use Case** | Share recommendations | Work together |
| **Metadata Flag** | `isShared: true` | `isCollaborative: true` |

---

## 🏗️ Data Structure

### Shared Folder Object
```typescript
{
  id: "custom_1234567890",      // DIFFERENT for each user
  name: "My Movies",
  items: [...],
  isShared: true,
  sharedWith: ["userId1", "userId2"],
  // No real-time sync
}
```

### Collaborative Folder Object
```typescript
{
  id: "custom_1234567890",      // SAME for all users
  name: "Our Movie Night",
  items: [...],
  isCollaborative: true,        // ✅ Required
  ownerId: "ownerUserId",
  ownerName: "Owner Name",
  collaborators: ["userId1", "userId2"],  // All collaborators
  sharedFrom: {
    userId: "ownerUserId",
    userName: "Owner Name",
    originalFolderId: "custom_1234567890"
  }
}
```

---

## 🎯 When to Use Each System

### Use **Shared Folders** when:
- ✅ You want to give someone a copy of your collection
- ✅ You don't want them to modify your original
- ✅ You want to share with many people without coordination
- ✅ It's a one-time recommendation

### Use **Collaborative Folders** when:
- ✅ Multiple people need to work on the same list
- ✅ Changes should sync in real-time
- ✅ Everyone needs to see updates immediately
- ✅ You're planning together (e.g., movie night, watch list)

---

## 🔧 Implementation

### Adding to a Collaborative Folder

```typescript
// ✅ CORRECT - Use collaborative function
import { addItemToCollaborativeFolder } from '@/lib/firebase/collaborativeFolders';

if (folder.isCollaborative) {
  await addItemToCollaborativeFolder(
    folder.id,
    folder.ownerId,
    movie,
    currentUserId
  );
}
```

```typescript
// ❌ WRONG - Don't use regular folder update
// This will NOT sync to other users
await updateDoc(userRef, {
  customCollections: updatedCollections
});
```

### Removing from a Collaborative Folder

```typescript
// ✅ CORRECT - Use collaborative function
import { removeItemFromCollaborativeFolder } from '@/lib/firebase/collaborativeFolders';

if (folder.isCollaborative) {
  await removeItemFromCollaborativeFolder(
    folder.id,
    folder.ownerId,
    movieId,
    currentUserId
  );
}
```

---

## 🚀 How It Works

### Collaborative Folder Flow

1. **User A creates collaborative folder**
   - Folder has `isCollaborative: true`
   - `collaborators: []` (empty initially)
   - `ownerId: userA`

2. **User A sends invitations**
   - Calls `sendCollaborativeFolderInvites()`
   - Creates invitation documents
   - Creates notifications for recipients

3. **User B accepts invitation**
   - Calls `acceptCollaborativeInvite()`
   - Creates folder with **SAME ID** as User A
   - Adds User B to `collaborators` array
   - Updates ALL existing collaborators

4. **User B adds a movie**
   - Calls `addItemToCollaborativeFolder()`
   - Updates owner's folder (User A)
   - Updates ALL collaborators' folders (including User B)
   - Everyone sees the change immediately

5. **User C accepts invitation**
   - Gets folder with full `collaborators` list
   - User A and User B's folders updated to include User C
   - Now all three users are synced

---

## 📝 Important Notes

1. **Always check `isCollaborative` flag**
   ```typescript
   if (folder.isCollaborative) {
     // Use collaborative functions
   } else {
     // Use regular folder functions
   }
   ```

2. **Use the correct import**
   ```typescript
   // For collaborative folders
   import { ... } from '@/lib/firebase/collaborativeFolders';
   
   // For shared folders (regular sharing)
   import { ... } from '@/lib/firebase/folderSharing';
   ```

3. **Folder ID is the key**
   - Shared folders: Different IDs = Independent copies
   - Collaborative folders: Same ID = Real-time sync

4. **Permission checks**
   - Collaborative functions check if user is owner OR collaborator
   - Returns error if user doesn't have permission

---

## 🐛 Troubleshooting

### Items not syncing between collaborators?
- ✅ Check if folder has `isCollaborative: true`
- ✅ Verify using `addItemToCollaborativeFolder()` not regular update
- ✅ Check if user is in `collaborators` array

### Wrong folder appearing in tabs?
- ✅ Shared folders: Should have `isShared: true`
- ✅ Collaborative folders: Should have `isCollaborative: true`
- ✅ Auto-fix runs every 5 seconds in `UserSharedFolders.tsx`

### User can't add items?
- ✅ Check if user is in `collaborators` array
- ✅ Verify `ownerId` is set correctly
- ✅ Permission check requires owner OR collaborator status

---

## 📂 File Organization

```
lib/firebase/
├── folderSharing.ts          # Shared folders (one-time copy)
├── collaborativeFolders.ts   # Collaborative folders (real-time sync)
└── README-FOLDER-SYSTEMS.md  # This documentation
```

**Why separate files?**
- Clear separation of concerns
- Easier to maintain (each ~500 lines vs 2000+ lines)
- No confusion between two different systems
- Better code organization

---

## 🗄️ Database Structure

### Firestore Collections

#### 1. `users` Collection
Stores user profiles and their folders (both shared and collaborative)

```typescript
{
  userId: "user123",
  customCollections: [
    // Shared folders (different IDs per user)
    {
      id: "custom_abc123",
      name: "My Movies",
      items: [...],
      isShared: true,
      sharedWith: ["user456"]
    },
    // Collaborative folders (same ID across all users)
    {
      id: "custom_xyz789",
      name: "Our Movie Night",
      items: [...],
      isCollaborative: true,
      ownerId: "user123",
      collaborators: ["user456", "user789"]
    }
  ]
}
```

#### 2. `folderShareInvites` Collection
Stores invitations for BOTH shared and collaborative folders

```typescript
{
  id: "invite123",
  folderId: "custom_xyz789",
  folderName: "Our Movie Night",
  fromUserId: "user123",
  fromUserName: "John Doe",
  toUserId: "user456",
  status: "pending",
  isCollaborative: true,  // ✅ Distinguishes collaborative from shared
  createdAt: "2025-01-01T00:00:00Z"
}
```

#### 3. `collaborativeFolders` Collection (NEW)
**Optional**: Separate collection for collaborative folder metadata

```typescript
{
  id: "custom_xyz789",
  name: "Our Movie Night",
  ownerId: "user123",
  ownerName: "John Doe",
  collaborators: ["user456", "user789"],
  items: [...],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T12:00:00Z",
  settings: {
    allowAddItems: true,
    allowRemoveItems: true
  }
}
```

> **Note**: Currently, collaborative folders are stored within each user's `customCollections` array for simplicity. The separate `collaborativeFolders` collection is available for future features like:
> - Folder-level permissions
> - Activity logs
> - Real-time presence indicators
> - Advanced collaboration settings

---

## 🔒 Firebase Security Rules

### Collaborative Folders Access Control

```javascript
// Firestore rules for collaborative folders
match /collaborativeFolders/{folderId} {
  // Can read if you're the owner or a collaborator
  allow read: if isAuth() && (
    resource.data.ownerId == request.auth.uid ||
    request.auth.uid in resource.data.collaborators
  );
  
  // Can create if you're setting yourself as owner
  allow create: if isAuth() && 
    request.resource.data.ownerId == request.auth.uid;
  
  // Can update if you're owner or collaborator
  allow update: if isAuth() && (
    resource.data.ownerId == request.auth.uid ||
    request.auth.uid in resource.data.collaborators
  );
  
  // Can delete if you're the owner
  allow delete: if isAuth() && 
    resource.data.ownerId == request.auth.uid;
}
```

### Required Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "collaborativeFolders",
      "fields": [
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "collaborativeFolders",
      "fields": [
        { "fieldPath": "collaborators", "arrayConfig": "CONTAINS" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 📂 File Organization

```
lib/firebase/
├── folderSharing.ts          # Shared folders (one-time copy)
├── collaborativeFolders.ts   # Collaborative folders (real-time sync)
└── README-FOLDER-SYSTEMS.md  # This documentation
```

**Why separate files?**
- Clear separation of concerns
- Easier to maintain (each ~500 lines vs 2000+ lines)
- No confusion between two different systems
- Better code organization
