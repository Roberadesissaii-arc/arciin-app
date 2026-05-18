// types/user.ts
export interface CustomCollection {
  id: string;
  name: string;
  items: SavedMedia[];
  createdAt: string;
  icon?: string;
  color?: string;
  ownerId?: string; // User ID of the folder owner
  ownerName?: string; // Display name of the owner
  sharedWith?: string[]; // Array of user IDs who have VIEW access only
  isShared?: boolean; // Whether this folder is shared with others
  isCollaborative?: boolean; // TRUE = edit access, FALSE = view only
  collaborators?: string[]; // Array of user IDs who can add/remove items
  sharedFrom?: { // If this folder was received via sharing
    userId: string;
    userName: string;
    originalFolderId: string;
  };
}

export interface FolderShareInvite {
  id: string;
  folderId: string;
  folderName: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserId: string;
  toUserEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt?: string;
  isCollaborative?: boolean; // TRUE = collaborative folder, FALSE = shared (view-only)
}

export interface SharedFolder {
  folderId: string;
  folderName: string;
  ownerId: string;
  ownerName: string;
  sharedAt: string;
  items: SavedMedia[];
}

export interface UserList {
    watchlist: SavedMedia[];
    favorites: SavedMedia[];
    watched: SavedMedia[];
    wantToWatch: SavedMedia[];
    recentlyViewed: SavedMedia[];
    following: SavedMedia[];
    followers: SavedMedia[];
    customCollections?: CustomCollection[];
  }
  
  export interface SavedMedia {
    id: number;
    title?: string;
    name?: string;
    type?: 'movie' | 'tv' | 'anime';
    poster_path: string;
    backdrop_path?: string;
    overview: string;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    addedAt: string;
    genres?: { id: number; name: string; }[];
    media_type: 'movie' | 'tv' | 'anime';
  }
  
  export interface StreamingHistory {
    mediaId: string;
    mediaType: string;
    title: string;
    provider: string;
    timestamp: Date;
  }
  
  export interface UserData {
    // ... other user data types
    streamingHistory?: StreamingHistory[];
  }