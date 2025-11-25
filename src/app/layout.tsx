import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavigationGuardProvider } from "next-navigation-guard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XML Parameter Editor | BAL NOSTICS",
  description: "Edit and manage XML parameters with ease. Upload, modify, and download XML files with real-time validation and parameter descriptions.",
  keywords: ["XML Editor", "Parameter Editor", "XML Viewer", "BAL NOSTICS", "XML Management"],
  authors: [{ name: "BAL NOSTICS" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <NavigationGuardProvider>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
      </NavigationGuardProvider>
    </html>
  );
}
