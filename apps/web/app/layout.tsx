import type { Metadata } from "next";
import { AppToaster } from "../components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolOS Admin",
  description: "SchoolOS web admin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-canvas font-body">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
