import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/query-provider";

// 1. Asosiy shrift (Inter - Lotin va Kirill uchun)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// 2. Monospace shrift (Kodlar, raqamlar, ID va pullar uchun)
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// VIEWPORT: Mobil telefonlarda brauzer tepasidagi soat turadigan panelni snapline rangiga bo'yash
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" }, // slate-950
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Muqaddas qoida: iOS'da inputga bosganda ekran zoom bo'lib ketmasligini ta'minlaydi
};

// DUNYODAGI ENG KUCHLI SEO METADATA TO'PLAMI
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://snapline.uz"),
  title: {
    default: "snapline — O'zbekistonning Professional Ijtimoiy Tarmog'i",
    template: "%s | snapline", // Dinamik sahifalar uchun: "Profil | snapline"
  },
  description: "O'zbekistonning yangi avlod mutaxassislari, kadrlar va kreatorlari platformasi. O'z portfoliongizni yarating, mijoz toping va mehnatingizni monetizatsiya qiling.",
  keywords: [
    "snapline", "snapline.uz", "O'zbekiston ijtimoiy tarmog'i", "IT mutaxassislar",
    "freelance O'zbekiston", "ish topish", "portfolio yaratish", "kreatorlar iqtisodiyoti",
    "tip berish uz", "dasturchilar tarmog'i", "dizaynerlar platformasi", "kadrlar"
  ],
  authors: [{ name: "snapline Team", url: "https://snapline.uz" }],
  creator: "snapline",
  publisher: "snapline Inc.",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: "https://snapline.uz",
    title: "snapline — Professional Ijtimoiy Tarmoq",
    description: "O'zbek mutaxassislarining raqamli makoni. Loyihalaringizni ulashing va bevosita daromad qiling.",
    siteName: "snapline",
    images: [
      {
        url: "/og-image.png", // Diqqat: public/og-image.png rasm yuklashingiz kerak (1200x630px)
        width: 1200,
        height: 630,
        alt: "snapline Platform Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "snapline — Professional Ijtimoiy Tarmoq",
    description: "O'zbekistonning yangi avlod mutaxassislari va kreatorlari platformasi.",
    images: ["/og-image.png"],
    creator: "@snapline_uz",
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
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "google_search_console_kodi_shu_yerga_tashlanadi", // Google saytni tasdiqlashi uchun
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="uz" // SEO uchun 'en' emas, aynan 'uz' bo'lishi shart
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storedTheme = localStorage.getItem('theme');
                  if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans selection:bg-blue-600 selection:text-white`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}