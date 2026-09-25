import type { Metadata } from "next";
import { Hanken_Grotesk, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Blueprint type (spec §2.3): Hanken Grotesk for headings and numbers, Source Sans 3 for body and UI.
// Both are variable fonts, so one self-hosted file each covers every weight the scale uses (ruling R8).
const display = Hanken_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });
const body = Source_Sans_3({ variable: '--font-body', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: "Campusly - School Management System",
  description: "Comprehensive school management platform for South African schools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
