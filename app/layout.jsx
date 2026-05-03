import './globals.css';

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
    <html lang="en">
      <body className="bg-wtf-bg text-wtf-text">
        <div className="min-h-[100dvh] flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
