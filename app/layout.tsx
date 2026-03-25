import type { Metadata } from "next";
import {
  Poppins,
  Roboto,
  Inter,
  Tajawal,
  Noto_Naskh_Arabic,
  Amiri,
} from "next/font/google";
import { ThemeProvider } from "next-themes";
import { PatternBackground } from "@/components/bg-scattered-pattern";
import "./globals.css";
import { Providers } from "./providers";
import { auth } from "@/lib/next-auth-handler";
import { TokenMonitor } from "@/components/dev-tools";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  variable: "--font-tajawal",
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-naskh-arabic",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  variable: "--font-amiri",
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SNA",
    template: "%s | SNA",
  },
  description: "SNA",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${roboto.variable} ${inter.variable} ${tajawal.variable} ${notoNaskhArabic.variable} ${amiri.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased w-screen h-screen bg-[#f9fafb] dark:bg-[#121212] relative overflow-hidden">
        <Providers session={session}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <PatternBackground count={1000} size="sm" className="z-0" />
            <div className="relative z-10 w-full h-full">{children}</div>
            <TokenMonitor />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
