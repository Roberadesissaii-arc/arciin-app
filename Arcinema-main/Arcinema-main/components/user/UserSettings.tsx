// components/user/UserSettings.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, query, where, getDocs,
} from "firebase/firestore";
import { updateProfile, deleteUser } from "firebase/auth";
import { projectFirestore as db } from "@/firebase/config";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  User, Bell, Palette, Shield, Database,
  Flame, Loader2, ChevronDown, ChevronRight,
  Globe, Brain, Eye, Trash2, AlertTriangle,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── color tokens (same as sidebar) ───────────────────────────────────────────
const SB_BG    = "#08080d";
const PANEL_BG = "#0d0d12";
const BORDER   = "rgba(255,255,255,0.07)";
const DIVIDER  = "rgba(255,255,255,0.05)";
const TEXT_OFF = "rgba(255,255,255,0.5)";
const TEXT_ON  = "rgba(255,255,255,0.9)";
const TEXT_DIM = "rgba(255,255,255,0.3)";
const HOVER_BG = "rgba(255,255,255,0.04)";
const ACTIVE_BG= "rgba(255,255,255,0.08)";
const PURPLE   = "var(--accent-color, #5D5FEF)";

// ─── primitives ────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="w-10 h-5 rounded-full relative transition-all shrink-0"
      style={{ background: on ? PURPLE : "rgba(255,255,255,0.12)" }}
    >
      <div
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm"
        style={{ left: on ? "calc(100% - 18px)" : "2px" }}
      />
    </button>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between gap-6 py-3.5"
      style={{ borderBottom: `1px solid ${DIVIDER}` }}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium" style={{ color: TEXT_ON }}>{label}</p>
        {hint && <p className="text-[12px] mt-0.5" style={{ color: TEXT_DIM }}>{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Sel({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="w-48 rounded-xl text-[13px] border-none focus:ring-0 focus-visible:ring-0"
        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT_ON }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="rounded-xl border-none shadow-2xl z-[100]"
        style={{ background: "#16161e", border: `1px solid ${BORDER}` }}
      >
        {options.map(o => (
          <SelectItem
            key={o.value} value={o.value}
            className="text-[13px] rounded-lg cursor-pointer focus:bg-white/5 data-[state=checked]:text-[#a5b4fc]"
            style={{ color: TEXT_OFF }}
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── types ─────────────────────────────────────────────────────────────────────
type CatId = "account" | "preferences" | "notifications" | "appearance" | "privacy" | "data" | "danger";

interface UserSettingsData {
  username: string;
  email: string;
  notifications: { email: boolean; push: boolean; newReleases: boolean; recommendations: boolean };
  preferences: {
    language: string;
    country: string;
    autoplay: boolean;
    contentFilter: "all" | "filtered" | "kids";
    autoAddToWatchlist: boolean;
    showSpoilers: boolean;
    activeProfile: string;
    aiModel?: string;
  };
  privacy: { showWatchlist: boolean; showLikedMovies: boolean; showActivity: boolean; profileVisibility: "public" | "private" };
  activitySettings: { enableTracking: boolean; autoCleanup: boolean; retentionDays: number };
}

const DEFAULT: UserSettingsData = {
  username: "",
  email: "",
  notifications: { email: true, push: true, newReleases: true, recommendations: true },
  preferences: {
    language: "en", country: "all", autoplay: true,
    contentFilter: "filtered", autoAddToWatchlist: false,
    showSpoilers: false, activeProfile: "default", aiModel: "deepseek",
  },
  privacy: { showWatchlist: true, showLikedMovies: true, showActivity: true, profileVisibility: "public" },
  activitySettings: { enableTracking: true, autoCleanup: true, retentionDays: 30 },
};

// ─── nav sections ──────────────────────────────────────────────────────────────
const SECTIONS: { id: CatId; label: string; icon: any }[] = [
  { id: "account",       label: "Account",       icon: User      },
  { id: "preferences",   label: "Preferences",   icon: Globe     },
  { id: "notifications", label: "Notifications", icon: Bell      },
  { id: "appearance",    label: "Appearance",    icon: Palette   },
  { id: "privacy",       label: "Privacy",       icon: Eye       },
  { id: "data",          label: "Data & Activity", icon: Database },
  { id: "danger",        label: "Danger Zone",   icon: Flame     },
];

const LANGUAGES = [
  { value: "en", label: "English" }, { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
];

const COUNTRIES = [
  { value: "all", label: "All Countries" }, { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" }, { value: "CA", label: "Canada" },
  { value: "FR", label: "France" },         { value: "DE", label: "Germany" },
  { value: "IT", label: "Italy" },          { value: "ES", label: "Spain" },
  { value: "IN", label: "India" },          { value: "AU", label: "Australia" },
  { value: "BR", label: "Brazil" },         { value: "MX", label: "Mexico" },
];

const AI_MODELS = [
  { value: "deepseek", label: "DeepSeek V3 (Recommended)" },
  { value: "grok",     label: "Grok (xAI)"                },
  { value: "gpt-4o",   label: "GPT-4o (OpenAI)"           },
  { value: "gpt-4",    label: "GPT-4 (OpenAI)"            },
  { value: "claude",   label: "Claude (Anthropic)"         },
];

const ACCENT_COLORS = ["#5D5FEF", "#7c3aed", "#0d9488", "#e11d48", "#ea580c", "#0ea5e9"];

// ─── main component ────────────────────────────────────────────────────────────
export default function UserSettings() {
  const { user, logoutUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { cleanupOldActivities } = useActivityTracking();

  const [cat, setCat] = useState<CatId>("account");
  const [settings, setSettings] = useState<UserSettingsData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accent, setAccent] = useState("#5D5FEF");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [displayNameEdit, setDisplayNameEdit] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Load settings from Firestore
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setSettings({
            username: user.displayName || "",
            email: user.email || "",
            notifications: d.notifications || DEFAULT.notifications,
            preferences: { ...DEFAULT.preferences, ...(d.preferences || {}) },
            privacy: { ...DEFAULT.privacy, ...(d.privacy || {}) },
            activitySettings: d.activitySettings || DEFAULT.activitySettings,
          });
          if (d.preferences?.accent_color) {
            setAccent(d.preferences.accent_color);
            applyAccent(d.preferences.accent_color);
          }
        } else {
          setSettings({ ...DEFAULT, username: user.displayName || "", email: user.email || "" });
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [user]);

  useEffect(() => {
    setDisplayNameEdit(settings.username);
  }, [settings.username]);

  // Auto-save settings to Firestore (debounced)
  useEffect(() => {
    if (loading || !user) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await setDoc(doc(db, "users", user.uid), {
          username: settings.username,
          notifications: settings.notifications,
          preferences: settings.preferences,
          privacy: settings.privacy,
          activitySettings: settings.activitySettings,
          updatedAt: new Date(),
        }, { merge: true });
      } catch { /* ignore */ }
      finally { setSaving(false); }
    }, 800);
    return () => clearTimeout(t);
  }, [settings, loading, user]);

  const applyAccent = (c: string) => {
    document.documentElement.style.setProperty("--accent-color", c);
    const rgb = hexToRgb(c);
    if (rgb) document.documentElement.style.setProperty("--accent-rgb", rgb);
  };

  const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : null;
  };

  const update = (partial: Partial<UserSettingsData>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  const handleSaveName = async () => {
    if (!user || !displayNameEdit.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: displayNameEdit.trim() });
      update({ username: displayNameEdit.trim() });
      toast({ title: "Name updated" });
    } catch {
      toast({ title: "Failed to update name", variant: "destructive" });
    } finally { setSavingName(false); }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      // Delete storage
      try {
        const { ref, deleteObject } = await import("firebase/storage");
        const { projectStorage } = await import("@/firebase/config");
        await deleteObject(ref(projectStorage, `profile-pictures/${user.uid}`));
      } catch { /* may not exist */ }
      // Delete chats
      const chatsQ = query(collection(db, "chats"), where("userId", "==", user.uid));
      await Promise.all((await getDocs(chatsQ)).docs.map(d => deleteDoc(d.ref)));
      // Delete activities
      const actQ = query(collection(db, "activities"), where("userId", "==", user.uid));
      await Promise.all((await getDocs(actQ)).docs.map(d => deleteDoc(d.ref)));
      // Delete lists
      const listQ = query(collection(db, "userLists"), where("userId", "==", user.uid));
      await Promise.all((await getDocs(listQ)).docs.map(d => deleteDoc(d.ref)));
      // Delete user doc
      await deleteDoc(doc(db, "users", user.uid));
      // Delete auth user
      await deleteUser(user);
      router.push("/auth/login");
    } catch {
      toast({ title: "Failed to delete account", variant: "destructive" });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: PURPLE }} />
      </div>
    );
  }

  // ─── panel content ────────────────────────────────────────────────────────────
  const renderPanel = () => {
    switch (cat) {
      // ── Account ──────────────────────────────────────────────────────────────
      case "account":
        return (
          <div>
            <h2 className="text-[16px] font-bold mb-0.5" style={{ color: TEXT_ON }}>Account</h2>
            <p className="text-[12px] mb-5" style={{ color: TEXT_DIM }}>Manage your profile and credentials</p>

            <Row label="Display Name" hint="Shown across the app and on your profile">
              <div className="flex items-center gap-2">
                <input
                  value={displayNameEdit}
                  onChange={e => setDisplayNameEdit(e.target.value)}
                  className="rounded-lg px-3 py-1.5 text-[13px] outline-none w-36"
                  style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, color: TEXT_ON }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || displayNameEdit === settings.username}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-30"
                  style={{ background: PURPLE, color: "#fff" }}
                >
                  {savingName ? "Saving…" : "Save"}
                </button>
              </div>
            </Row>

            <Row label="Email" hint="Your sign-in email address">
              <span className="text-[13px]" style={{ color: TEXT_OFF }}>{settings.email}</span>
            </Row>

            <Row label="Sign-in Method" hint="Authentication provider">
              <span className="text-[13px]" style={{ color: TEXT_OFF }}>
                {user?.providerData?.[0]?.providerId === "google.com" ? "Google" :
                  user?.providerData?.[0]?.providerId === "github.com" ? "GitHub" : "Email/Password"}
              </span>
            </Row>
          </div>
        );

      // ── Preferences ───────────────────────────────────────────────────────────
      case "preferences":
        return (
          <div>
            <h2 className="text-[16px] font-bold mb-0.5" style={{ color: TEXT_ON }}>Preferences</h2>
            <p className="text-[12px] mb-5" style={{ color: TEXT_DIM }}>Content, language, and AI settings</p>

            <Row label="Language" hint="Filter content by spoken language">
              <Sel options={LANGUAGES} value={settings.preferences.language}
                onChange={v => update({ preferences: { ...settings.preferences, language: v } })} />
            </Row>

            <Row label="Country / Region" hint="Affects watch provider availability">
              <Sel options={COUNTRIES} value={settings.preferences.country}
                onChange={v => update({ preferences: { ...settings.preferences, country: v } })} />
            </Row>

            <Row label="Content Filter" hint="Controls what content is shown">
              <Sel
                options={[
                  { value: "all",      label: "All Content"       },
                  { value: "filtered", label: "Filtered"           },
                  { value: "kids",     label: "Kids Mode"          },
                ]}
                value={settings.preferences.contentFilter}
                onChange={v => update({ preferences: { ...settings.preferences, contentFilter: v as any } })}
              />
            </Row>

            <Row label="AI Chat Model" hint="Default model for CineAI conversations">
              <Sel options={AI_MODELS} value={settings.preferences.aiModel || "deepseek"}
                onChange={v => update({ preferences: { ...settings.preferences, aiModel: v } })} />
            </Row>

            <Row label="Autoplay Trailers" hint="Auto-play trailers on the home hero">
              <Toggle on={settings.preferences.autoplay}
                onChange={() => update({ preferences: { ...settings.preferences, autoplay: !settings.preferences.autoplay } })} />
            </Row>

            <Row label="Auto-add Liked to Watchlist" hint="Favorites are added to your watchlist automatically">
              <Toggle on={settings.preferences.autoAddToWatchlist}
                onChange={() => update({ preferences: { ...settings.preferences, autoAddToWatchlist: !settings.preferences.autoAddToWatchlist } })} />
            </Row>

            <Row label="Show Spoilers" hint="Include plot details in descriptions">
              <Toggle on={settings.preferences.showSpoilers}
                onChange={() => update({ preferences: { ...settings.preferences, showSpoilers: !settings.preferences.showSpoilers } })} />
            </Row>
          </div>
        );

      // ── Notifications ─────────────────────────────────────────────────────────
      case "notifications":
        return (
          <div>
            <h2 className="text-[16px] font-bold mb-0.5" style={{ color: TEXT_ON }}>Notifications</h2>
            <p className="text-[12px] mb-5" style={{ color: TEXT_DIM }}>Choose what you want to be notified about</p>

            <Row label="Email Notifications" hint="Receive updates via email">
              <Toggle on={settings.notifications.email}
                onChange={() => update({ notifications: { ...settings.notifications, email: !settings.notifications.email } })} />
            </Row>
            <Row label="Push Notifications" hint="In-app and browser push alerts">
              <Toggle on={settings.notifications.push}
                onChange={() => update({ notifications: { ...settings.notifications, push: !settings.notifications.push } })} />
            </Row>
            <Row label="New Releases" hint="Alert when a movie or show you follow releases">
              <Toggle on={settings.notifications.newReleases}
                onChange={() => update({ notifications: { ...settings.notifications, newReleases: !settings.notifications.newReleases } })} />
            </Row>
            <Row label="Recommendations" hint="Personalised picks based on your taste">
              <Toggle on={settings.notifications.recommendations}
                onChange={() => update({ notifications: { ...settings.notifications, recommendations: !settings.notifications.recommendations } })} />
            </Row>
          </div>
        );

      // ── Appearance ────────────────────────────────────────────────────────────
      case "appearance":
        return (
          <div>
            <h2 className="text-[16px] font-bold mb-0.5" style={{ color: TEXT_ON }}>Appearance</h2>
            <p className="text-[12px] mb-5" style={{ color: TEXT_DIM }}>Customise how Arcinema looks</p>

            <Row label="Accent Color" hint="Used for buttons, highlights, and active states">
              <div className="flex gap-2">
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setAccent(c);
                      applyAccent(c);
                      update({ preferences: { ...settings.preferences, accent_color: c } as any });
                      toast({ title: "Accent color updated" });
                    }}
                    className="w-7 h-5 rounded-md border-2 transition-transform hover:scale-110"
                    style={{ background: c, borderColor: accent === c ? "white" : "transparent" }}
                  />
                ))}
              </div>
            </Row>

            <Row label="Animated Cards" hint="Enable hover animations on movie cards">
              <Toggle
                on={!document.documentElement.classList.contains("no-animated-cards")}
                onChange={() => {
                  const has = document.documentElement.classList.contains("no-animated-cards");
                  if (has) document.documentElement.classList.remove("no-animated-cards");
                  else document.documentElement.classList.add("no-animated-cards");
                  toast({ title: `Animated cards ${has ? "enabled" : "disabled"}` });
                }}
              />
            </Row>

            <Row label="Compact View" hint="Reduce spacing in grids and lists">
              <Toggle
                on={document.documentElement.classList.contains("compact-view")}
                onChange={() => {
                  const has = document.documentElement.classList.contains("compact-view");
                  if (has) document.documentElement.classList.remove("compact-view");
                  else document.documentElement.classList.add("compact-view");
                  toast({ title: `Compact view ${has ? "disabled" : "enabled"}` });
                }}
              />
            </Row>
          </div>
        );

      // ── Privacy ───────────────────────────────────────────────────────────────
      case "privacy":
        return (
          <div>
            <h2 className="text-[16px] font-bold mb-0.5" style={{ color: TEXT_ON }}>Privacy</h2>
            <p className="text-[12px] mb-5" style={{ color: TEXT_DIM }}>Control what others can see about you</p>

            <Row label="Profile Visibility" hint="Who can view your public profile">
              <Sel
                options={[{ value: "public", label: "Public" }, { value: "private", label: "Private" }]}
                value={settings.privacy.profileVisibility}
                onChange={v => update({ privacy: { ...settings.privacy, profileVisibility: v as any } })}
              />
            </Row>
            <Row label="Show Watchlist" hint="Visible on your public profile">
              <Toggle on={settings.privacy.showWatchlist}
                onChange={() => update({ privacy: { ...settings.privacy, showWatchlist: !settings.privacy.showWatchlist } })} />
            </Row>
            <Row label="Show Liked Movies" hint="Visible on your public profile">
              <Toggle on={settings.privacy.showLikedMovies}
                onChange={() => update({ privacy: { ...settings.privacy, showLikedMovies: !settings.privacy.showLikedMovies } })} />
            </Row>
            <Row label="Show Activity" hint="Others can see your watch activity">
              <Toggle on={settings.privacy.showActivity}
                onChange={() => update({ privacy: { ...settings.privacy, showActivity: !settings.privacy.showActivity } })} />
            </Row>
          </div>
        );

      // ── Data & Activity ───────────────────────────────────────────────────────
      case "data":
        return (
          <div>
            <h2 className="text-[16px] font-bold mb-0.5" style={{ color: TEXT_ON }}>Data & Activity</h2>
            <p className="text-[12px] mb-5" style={{ color: TEXT_DIM }}>Activity tracking and storage controls</p>

            <Row label="Activity Tracking" hint="Record what you watch and interact with">
              <Toggle on={settings.activitySettings.enableTracking}
                onChange={() => update({ activitySettings: { ...settings.activitySettings, enableTracking: !settings.activitySettings.enableTracking } })} />
            </Row>
            <Row label="Auto Cleanup" hint="Automatically remove old activity entries">
              <Toggle on={settings.activitySettings.autoCleanup}
                onChange={() => update({ activitySettings: { ...settings.activitySettings, autoCleanup: !settings.activitySettings.autoCleanup } })} />
            </Row>
            <Row label="Retention Period" hint="How long to keep activity history">
              <Sel
                options={[
                  { value: "7",  label: "7 days"   },
                  { value: "14", label: "14 days"  },
                  { value: "30", label: "30 days"  },
                  { value: "90", label: "90 days"  },
                ]}
                value={String(settings.activitySettings.retentionDays)}
                onChange={v => update({ activitySettings: { ...settings.activitySettings, retentionDays: Number(v) } })}
              />
            </Row>
            <div className="pt-3">
              <button
                onClick={async () => {
                  try {
                    await cleanupOldActivities();
                    toast({ title: "Old activities cleared" });
                  } catch {
                    toast({ title: "Failed to clear activities", variant: "destructive" });
                  }
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{ background: "rgba(255,255,255,0.07)", color: TEXT_ON, border: `1px solid ${BORDER}` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.11)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"}
              >
                Clear old activity now
              </button>
            </div>
          </div>
        );

      // ── Danger Zone ───────────────────────────────────────────────────────────
      case "danger":
        return (
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <AlertTriangle className="w-4 h-4" style={{ color: "#f87171" }} />
              <h2 className="text-[16px] font-bold" style={{ color: "#f87171" }}>Danger Zone</h2>
            </div>
            <p className="text-[12px] mb-5" style={{ color: TEXT_DIM }}>These actions are permanent and cannot be undone</p>

            <div
              className="rounded-xl p-4 mb-4"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-[13px] font-semibold mb-1" style={{ color: "#fca5a5" }}>Delete Account</p>
              <p className="text-[12px] mb-3" style={{ color: TEXT_DIM }}>
                Permanently deletes your account, watchlist, favorites, activity, and chat history. This cannot be reversed.
              </p>
              <p className="text-[12px] mb-2" style={{ color: TEXT_OFF }}>
                Type <span className="font-bold text-white">DELETE</span> to confirm:
              </p>
              <input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="rounded-lg px-3 py-1.5 text-[13px] outline-none w-full mb-3"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,68,68,0.3)", color: TEXT_ON }}
              />
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "DELETE" || deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-30"
                style={{ background: "#dc2626", color: "#fff" }}
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="flex min-h-screen"
      style={{ background: SB_BG }}
    >
      {/* ── Left nav ── */}
      <aside
        className="w-52 shrink-0 border-r flex flex-col pt-6 pb-4 px-2"
        style={{ borderColor: BORDER, background: SB_BG }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: TEXT_DIM }}>
          Settings
        </p>
        <div className="space-y-[1px]">
          {SECTIONS.map(s => {
            const active = cat === s.id;
            const isDanger = s.id === "danger";
            return (
              <button
                key={s.id}
                onClick={() => setCat(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left"
                style={{
                  background: active ? ACTIVE_BG : "transparent",
                  color: active ? (isDanger ? "#f87171" : TEXT_ON) : (isDanger ? "#f87171" : TEXT_OFF),
                  borderLeft: active ? `2px solid ${isDanger ? "#ef4444" : PURPLE}` : "2px solid transparent",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = HOVER_BG; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <s.icon className="w-[14px] h-[14px] shrink-0" />
                <span className="leading-none">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Auto-save indicator */}
        <div className="mt-auto px-3 pt-4">
          <p className="text-[10px]" style={{ color: saving ? "rgba(255,255,255,0.4)" : "transparent" }}>
            Saving…
          </p>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className="flex-1 px-8 py-8 max-w-2xl" style={{ background: PANEL_BG }}>
        {renderPanel()}
      </main>
    </div>
  );
}
