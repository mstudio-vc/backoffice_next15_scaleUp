import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ivoire Tech — Next 15 & Scale Up",
  description: "Espace des lauréats des programmes Ivoire Tech Next 15 et Scale Up.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
