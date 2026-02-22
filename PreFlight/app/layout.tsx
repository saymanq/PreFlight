import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Preflight — AI Architecture Planner",
  description:
    "Design, compare, validate, and export implementation-ready architecture plans before building.",
  icons: {
    icon: "/preflight-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <ClerkProvider
          dynamic
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: "#008000",
              colorBackground: "#000000",
              colorText: "#FFFFFF",
              colorInputBackground: "#111111",
              colorInputText: "#FFFFFF",
            },
          }}
        >
          <ConvexClientProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
