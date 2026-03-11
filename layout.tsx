import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportsLights — Score-Triggered Hue Light Shows",
  description: "Automatically trigger Philips Hue light shows when your teams score in real time.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
