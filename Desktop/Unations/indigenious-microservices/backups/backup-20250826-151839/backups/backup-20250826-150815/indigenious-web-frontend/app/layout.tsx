import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Indigenous Digital Forest - Elemental Ecosystem',
  description: 'Where Economics Meets The Land - A living digital ecosystem honoring Indigenous wisdom',
  manifest: '/manifest.json',
  themeColor: '#22C55E',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Forest Platform'
  },
  icons: {
    icon: [
      { url: '/icons/tree-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/tree-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  openGraph: {
    title: 'Indigenous Digital Forest',
    description: 'Living ecosystem where business meets nature',
    images: ['/og-image.png'],
    type: 'website'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22C55E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}