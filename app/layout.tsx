import type React from "react";
import type { Metadata } from "next";
import "./globals.css";

/**
 * Metadata for the page
 */
export const metadata: Metadata = {
  title: "HooMind",
  description: "HooMind | Where AI Meets DeFi",
};

/**
 * Root layout for the page
 *
 * @param {object} props - The props for the root layout
 * @param {React.ReactNode} props.children - The children for the root layout
 * @returns {React.ReactNode} The root layout
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="bg-[#121212]">{children}</body>
    </html>
  );
}
