import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter, Press_Start_2P } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const pixelFont = Press_Start_2P({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Getot - Track Your Fitness Journey",
  description: "A comprehensive gym guide and logbook to track your workouts, monitor progress, and achieve your fitness goals.",
  keywords: ["gym", "fitness", "workout", "logbook", "training", "exercise"],
  authors: [{ name: "Gym Logbook Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Getot",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Getot - Track Your Fitness Journey",
    description: "Track your fitness journey with our comprehensive gym logbook",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Getot - Track Your Fitness Journey",
    description: "Track your fitness journey with our comprehensive gym logbook",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FF6B6B" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Getot" />
        <meta name="application-name" content="Getot" />
        <meta name="msapplication-TileColor" content="#FF6B6B" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Fallback for older browsers */}
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}