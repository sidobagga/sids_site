import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import NavBar from '@/components/NavBar'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sid Bagga - Data Scientist & Coach",
  description: "Data scientist, coach, and runner helping teams turn messy data into clear insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} mx-auto max-w-3xl px-4 md:px-0 font-sans antialiased text-gray-900 bg-neutral-50`}>
        <header className="pt-10 pb-6">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-3xl font-bold">Sid Bagga</h1>
          </Link>
          <p className="text-sm text-gray-600">Data scientist · Coach · Runner</p>
          <NavBar />
        </header>
        <main className="pb-16 prose prose-neutral lg:prose-lg max-w-none">
          {children}
        </main>
        <footer className="py-10 text-xs text-center text-gray-500">
          © {new Date().getFullYear()} Sid Bagga. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
