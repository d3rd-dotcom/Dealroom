import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DealRoom',
  description: 'Every deal has a room. Every room has an agent.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <header className="sticky top-0 z-40 border-b border-cream-300 bg-white/90 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg gradient-logo flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8 L8 3 L13 8 L8 13 Z" stroke="white" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                  <path d="M5.5 8 L8 5.5 L10.5 8 L8 10.5 Z" fill="white" opacity="0.8"/>
                </svg>
              </div>
              <span className="font-semibold text-sm tracking-tight">
                <span className="text-teal-600">deal</span>
                <span className="text-sky-500">room</span>
              </span>
            </a>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <a
                href="/deals"
                className="px-3 py-1.5 text-xs font-medium text-teal-700 rounded-lg hover:bg-cream-200 transition-colors"
              >
                Deals
              </a>
              <a
                href="/deals/new"
                className="px-3 py-1.5 text-xs font-medium text-teal-700 rounded-lg hover:bg-cream-200 transition-colors"
              >
                New Deal
              </a>
            </nav>

            {/* User pill */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full gradient-logo flex items-center justify-center text-white text-xs font-semibold">
                JL
              </div>
              <span className="hidden sm:block text-xs font-medium text-teal-800">Jordan Lee</span>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  )
}
