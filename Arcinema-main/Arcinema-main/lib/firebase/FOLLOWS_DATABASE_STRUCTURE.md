# Follows Database Structure

## Collection: `follows`

This collection stores all follow relationships between users, similar to social media platforms.

### Document Structure

**Document ID Format:** `${followerId}_${followingId}`

**Example:** `user123_user456` (user123 follows user456)

### Document Fields

```typescript
{
  followerId: string,        // ID of the user who is following
  followingId: string,       // ID of the user being followed
  createdAt: Timestamp,       // When the follow relationship was created
  followerName: string,      // Display name of the follower (for quick reference)
  followingName: string      // Display name of the user being followed (for quick reference)
}
```

### Queries

#### Get all users a user is following:
```typescript
query(followsRef, where('followerId', '==', userId))
```

#### Get all followers of a user:
```typescript
query(followsRef, where('followingId', '==', userId))
```

#### Check if user A follows user B:
```typescript
getDoc(doc(followsRef, `${userIdA}_${userIdB}`))
```

### Benefits

1. **Efficient Queries**: Can quickly query who follows whom
2. **Scalable**: Works well even with millions of follow relationships
3. **Bidirectional**: Easy to get both following and followers
4. **Timestamps**: Track when relationships were created
5. **No Duplicates**: Document ID ensures one relationship per pair

### Backward Compatibility

The system still maintains the `following` array in the `users` collection for backward compatibility, but all new operations use the `follows` collection as the source of truth.

### Firestore Rules

Make sure to add appropriate Firestore security rules for the `follows` collection:

```javascript
match /follows/{followId} {
  allow read: if isAuth();
  allow create: if isAuth() && request.resource.data.followerId == request.auth.uid;
  allow delete: if isAuth() && resource.data.followerId == request.auth.uid;
}
```

