import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://thomasdechillaz.com"),
  title: "Thomas de Chillaz | AI, Computational Biology & Space",
  description:
    "Researching complex systems from single cells to distant worlds, and building AI products that make knowledge useful.",
  keywords: [
    "Thomas de Chillaz",
    "MIT CSAIL",
    "computational biology",
    "single-cell RNA sequencing",
    "artificial intelligence",
    "astronomy",
  ],
  authors: [{ name: "Thomas de Chillaz" }],
  openGraph: {
    title: "Thomas de Chillaz — AI for science, systems & discovery",
    description:
      "An animated CV spanning computational biology, space research, AI products, and science communication.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1734,
        height: 907,
        alt: "Thomas de Chillaz — AI, biology, and space",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thomas de Chillaz — AI for science, systems & discovery",
    description:
      "An animated CV spanning computational biology, space research, AI products, and science communication.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/thomas-de-chillaz.webp",
    shortcut: "/thomas-de-chillaz.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
