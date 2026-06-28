import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DealRoom',
  description:
    'Every deal has a room. Every room has an agent. Agent identity, cross org connection, and accumulated context for B2B deal coordination, built on Aicoo.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
