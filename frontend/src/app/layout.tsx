import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Vector - Hook-Based Liquidity Protection",
  description:
    "Real-time risk assessment and protection for Uniswap v4 liquidity pools via attested hook enforcement.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-vector-dark text-slate-200 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
