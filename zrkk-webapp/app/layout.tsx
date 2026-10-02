import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import PwaRegister from './pwa-register';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://zrkk-1m-game.ardent-hawk-6772.chatgpt.site'),
  title: 'ZRKK 1M GAME',
  description: 'Real-time KPI and revenue dashboard for the ZRKK team.',
  openGraph: {title:'ZRKK 1M GAME',description:'Performance & Revenue Command Center',images:['/og.png']},
  twitter: {card:'summary_large_image',title:'ZRKK 1M GAME',description:'Performance & Revenue Command Center',images:['/og.png']},
  manifest: '/manifest.webmanifest',
  applicationName: 'ZRKK 1M GAME',
  appleWebApp: {capable:true,title:'ZRKK 1M',statusBarStyle:'default'},
  icons: {icon:[{url:'/favicon.svg',type:'image/svg+xml'},{url:'/icon-192.png',sizes:'192x192',type:'image/png'}],apple:[{url:'/apple-touch-icon.png',sizes:'180x180'}]},
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#17324d',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
