// types/notification.ts
export interface Notification {
  id: string;
  userId: string;
  type: 'new_release' | 'new_tv_release' | 'recommendation' | 'reminder' | 'folder_share' | 'collaborative_folder';
  title: string;
  message: string;
  movieData?: {
    id: number;
    title: string;
    poster_path?: string;
  };
  tvShowData?: {
    id: number;
    name: string;
    poster_path?: string;
  };
  metadata?: {
    inviteId?: string;
    folderId?: string;
    folderName?: string;
    fromUserId?: string;
    fromUserName?: string;
  };
  isRead: boolean;
  createdAt: any; // Firebase Timestamp or Date
}

export interface NewRelease {
  id: number;
  title: string;
  releaseDate: string;
  posterPath?: string;
  overview?: string;
  voteAverage?: number;
  processed: boolean;
}