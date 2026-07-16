import './globals.css';
import './branded-selects.css';
import './premium-sliders.css';
import './home-dashboard-redesign.css';
import './app-sidebar-refinement.css';
import AuthRecoveryRedirect from '../components/AuthRecoveryRedirect';
import PublicAnalytics from '../components/PublicAnalytics';

export const metadata = {
  metadataBase: new URL('https://libertrade.app'),
  title: 'Libertrade Loop',
  description: 'Prepare, trade your plan, manage risk, and close the loop after each session.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Libertrade Loop',
    description: 'Prepare, trade your plan, manage risk, and close the loop after each session.',
    url: 'https://libertrade.app',
    siteName: 'Libertrade',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Trade Desk',
  },
};

export const viewport = {
  themeColor: '#111217',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <AuthRecoveryRedirect />
        {children}
        <PublicAnalytics />
      </body>
    </html>
  );
}
