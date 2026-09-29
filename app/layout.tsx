import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEEVUE · Find a cleaner bathroom in Las Vegas",
  description: "Discover and review Las Vegas bathrooms. Community cleanliness ratings, helpful details, and photos.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
