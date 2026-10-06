import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://peevue.com"),
  openGraph: {siteName:"PEEVUE",type:"website",locale:"en_US",images:[{url:"/peevue-seat-p.png",alt:"PEEVUE bathroom reviews"}]},
  twitter: {card:"summary"},
  title: "PEEVUE · Find a cleaner bathroom in Las Vegas",
  description: "Discover and review Las Vegas bathrooms. Community cleanliness ratings, helpful details, and photos.",
  icons: {
    icon: "/peevue-seat-p.png",
    shortcut: "/peevue-seat-p.png",
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
