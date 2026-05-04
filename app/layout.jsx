import './globals.css';
import { Inter_Tight, Fraunces } from 'next/font/google';
import { themeBootstrapScript } from '@/lib/theme';

const interTight = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

export const metadata = {
  title: 'What The Fuss?!',
  description: 'A parenting chat that gives you real answers, not Google sludge.',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#FAF5EE',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${interTight.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="bg-wtf-bg text-wtf-text font-sans">
        <div className="min-h-[100dvh] flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
