import type { UserPreferences } from "@/lib/types/models"

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notifications: {
    uploadSound: true,
    uploadCompleteToast: true,
    uploadFailedToast: true,
    activityFeedToast: true,
    securityEventsToast: true,
  },
  appearance: {
    compactView: false,
    animatedCards: true,
    accentColor: "#FF4F12",
    toastPosition: "bottom-right",
    toastStyle: "default",
    toastShowIcons: true,
    uiRadius: "comfortable",
  },
  accessibility: {
    fontSize: "Normal",
    reduceAnimations: false,
    highContrast: false,
    keyboardNav: false,
  },
  media: {
    documentThumbnails: true,
  },
}
