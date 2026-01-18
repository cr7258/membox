import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "MemBox - Intelligent Memory System",
  description:
    "A multimodal intelligent memory system built with SeekDB and PowerMem",
  keywords: ["AI", "Memory", "SeekDB", "PowerMem", "OceanBase"],
  authors: [{ name: "MemBox Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF5FF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0D1A" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen gradient-bg">
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
