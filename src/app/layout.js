import './globals.css';
import './home-dashboard-redesign.css';
import './app-sidebar-refinement.css';
import AuthRecoveryRedirect from '../components/AuthRecoveryRedirect';

export const metadata = {
  title: 'Libertrade Loop',
  description: 'Prepare, trade your plan, manage risk, and close the loop after each session.',
  manifest: '/manifest.json',
  themeColor: '#111217',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Trade Desk',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <AuthRecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
