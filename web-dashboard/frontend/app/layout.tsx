import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Preflight — Plan before you build",
  description: "Visual architecture planning with 8-dimension scoring, live linting, and AI-powered generation. Plan before you build. Score before you ship.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
