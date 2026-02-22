import type { Metadata } from "next";
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
  icons: {
    icon: "/logo.svg",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
