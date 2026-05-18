"use client";

import { useFolderInviteListener } from "@/hooks/useFolderInviteListener";

export default function FolderInviteNotifier() {
  useFolderInviteListener();
  return null;
}
