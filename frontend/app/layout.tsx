import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'SocialScravio - Email Scraper for Social Media',
  description: 'Extract and verify emails from Instagram, Twitter, YouTube, LinkedIn, TikTok, and Facebook.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  )
}