import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import {
  Poppins,
  Federo,
  Syne,
  Bodoni_Moda,
  Six_Caps,
  Oswald,
  Archivo,
  Manrope,
  Funnel_Sans
} from "next/font/google";
import LenisProvider from "./lenisProvider";
import { SWRprovider } from "./lib/SWRprovider";
import OfflineSync from "./components/OfflineSync";



const funnelSans = Funnel_Sans({
  subsets: ["latin"],
  // Funnel Sans is a variable font, but you can specify weights if needed
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-funnel-sans", // Optional: for Tailwind integration
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
})

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins", //
});

const syne = Syne({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-syne", //
});

const oswald = Oswald({
  // Oswald typically supports 200 through 700
  weight: ["200", "300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-oswald",
  display: 'swap',
});

const bodoni = Bodoni_Moda({
  weight: ["400", "900"], // 400 for body, 900 for high-end headers
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-bodoni", //
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"], // <--- MUST ADD THIS
  variable: "--font-archivo",
});

const sixCaps = Six_Caps({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-six-caps", //
});

const federo = Federo({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-federo", //
});




const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Important for the "native app" feel
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Task Master",
  description: "AI-driven lifestyle, academic, and work task & goal manager",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tracker AI",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`
          ${geistSans.variable} 
          ${geistMono.variable}
          ${poppins.variable} 
          ${syne.variable} 
          ${bodoni.variable} 
          ${sixCaps.variable}
          ${federo.variable}
          ${oswald.variable}
          ${archivo.variable}
          ${manrope.variable}
           antialiased`}
      >
        {/* <LenisProvider> */}
        <div className="relative w-full bg-app-main max-w-md mx-auto min-h-dvh overflow-x-clip">

          <SWRprovider>
            <AuthProvider>
              <OfflineSync />
              <script src="http://localhost:3000/widget.js?token=ce632f34-d54b-462f-aeb8-8d27f56a85a5" async></script>                {children}
            </AuthProvider>
          </SWRprovider>
        </div>
        {/* </LenisProvider> */}
      </body>
    </html>
  );
}
