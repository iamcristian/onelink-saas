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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://onelink.bio";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OneLink — High-Scalability Creator Link-in-Bio Platform",
    template: "%s | OneLink",
  },
  description:
    "Lightning-fast, highly-customizable link-in-bio platform for creators and businesses with in-process AI threat defense.",
  keywords: [
    "link in bio",
    "bio link",
    "url shortener",
    "creator infrastructure",
    "linktree alternative",
    "sentinel ai",
    "analytics",
  ],
  authors: [{ name: "Cristian Arando", url: siteUrl }],
  creator: "OneLink",
  publisher: "OneLink",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "OneLink",
    title: "OneLink — High-Scalability Creator Link-in-Bio Platform",
    description:
      "Lightning-fast, highly-customizable link-in-bio platform for creators and businesses with in-process AI threat defense.",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "OneLink Brand Monogram",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneLink — High-Scalability Creator Link-in-Bio Platform",
    description:
      "Lightning-fast, highly-customizable link-in-bio platform for creators and businesses with in-process AI threat defense.",
    images: ["/icon.svg"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OneLink",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Lightning-fast, highly-customizable link-in-bio platform for creators and businesses with in-process AI threat defense.",
    author: {
      "@type": "Person",
      name: "Cristian Arando",
    },
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#fafafa]">
        {children}
      </body>
    </html>
  );
}
