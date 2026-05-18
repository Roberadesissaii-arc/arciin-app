// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Galindo } from "next/font/google";
import "./globals.css";
import ClientProvider from "@/components/providers/ClientProvider";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { PageWrapper } from "@/components/layout/PageWrapper";
import FooterWrapper from "@/components/layout/mobile/FooterWrapper";
import MobileBottomNav from "@/components/layout/mobile/MobileBottomNav";
import FloatingAIButton from '@/components/cineai/shared/FloatingAIButtonWrapper';
import PWAInstaller from '@/components/PWAInstaller';
import UpdateNotification from '@/components/UpdateNotification';
import FolderInviteNotifier from '@/components/notifications/FolderInviteNotifier';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

const galindo = Galindo({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-galindo"
});

export const metadata: Metadata = {
  title: "Arcinema",
  description: "Discover and watch the latest movies, TV shows, anime, and. Your ultimate entertainment destination with personalized recommendations and AI-powered chat.",
  keywords: ["movies", "tv shows", "anime", "streaming", "entertainment", "watch", "discover"],
  authors: [{ name: "Arcinema" }],
  creator: "Arcinema",
  publisher: "Arcinema",
  applicationName: "Arcinema",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Arcinema - Your Ultimate Entertainment Hub",
    description: "Discover and watch the latest movies, TV shows, anime, and games",
    siteName: "Arcinema",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Arcinema",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arcinema - Your Ultimate Entertainment Hub",
    description: "Discover and watch the latest movies, TV shows, anime, and games",
    images: ["/og-image.png"],
    creator: "@arcaureus",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.svg",
        color: "#0A0A0A",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Arcinema",
    startupImage: [
      {
        url: "/icons/apple-splash-2048-2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-1668-2224.png",
        media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-1536-2048.png",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-1125-2436.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-1242-2208.png",
        media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-750-1334.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-640-1136.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Arcinema",
    "application-name": "Arcinema",
    "msapplication-TileColor": "#0A0A0A",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#0A0A0A",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0A0A0A" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Fonts - Genre-based Typography System */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Alan+Sans:wght@300..900&family=Bebas+Neue&family=Bodoni+Moda+SC:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Butcherman&family=Caveat+Brush&family=Cinzel+Decorative:wght@400;700;900&family=Eagle+Lake&family=Fascinate&family=Grenze+Gotisch:wght@100..900&family=IBM+Plex+Sans+Arabic:wght@100;200;300;400;500;600;700&family=Jolly+Lodger&family=Macondo+Swash+Caps&family=Nosifer&family=Pangolin&family=Patrick+Hand&family=Pirata+One&family=Playwrite+AU+SA:wght@100..400&family=Playwrite+VN+Guides&family=Rubik+Burned&family=Rubik+Wet+Paint&family=Satisfy&family=Shadows+Into+Light&family=Sofia&family=Trade+Winds&family=UnifrakturCook:wght@700&family=UnifrakturMaguntia&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Frijole&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Galindo&display=swap" rel="stylesheet" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme Colors */}
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        
        {/* Apple PWA Configuration */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arcinema" />
        
        {/* Additional mobile optimizations */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Force black-translucent status bar to show content */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        
        {/* Favicons - Multiple sizes for better compatibility */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={`${inter.className} ${galindo.variable} min-h-screen bg-black text-white overflow-x-hidden`}>
        <ClientProvider>
          {/* Global desktop sidebar — only renders on xl+ */}
          <Sidebar />
          {/* Content shifted right to make room for sidebar on xl+ */}
          <PageWrapper>
            <div className="flex flex-col min-h-screen overflow-x-hidden max-w-full">
              {/* Navbar: hidden on desktop (xl+) where sidebar takes over */}
              <Navbar />
              <div className="flex-grow pb-safe">
                {children}
              </div>
              <FloatingAIButton />
              <FooterWrapper />
              <MobileBottomNav />
            </div>
          </PageWrapper>
          <PWAInstaller />
          <UpdateNotification />
          <FolderInviteNotifier />
          <Toaster />
        </ClientProvider>
      </body>
    </html>
  );
}