import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} — Agency Management OS`,
  description: `${APP_TAGLINE} - Manage your clients, sales pipeline, projects, timesheets, invoices, content scheduling, and HR in a unified agency workspace.`,
  keywords: "agency management, CRM, sales pipeline, project tracker, time logs, invoice generator, content calendar, HR tool, attendance tracker",
  authors: [{ name: "Blink Beyond" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
