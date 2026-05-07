import type { Metadata } from 'next'
import './globals.css'
import { RecordingProvider } from '@/contexts/RecordingContext'

export const metadata: Metadata = {
  title: 'Sporthouse Hub',
  description: 'Intern platform voor SporthouseGroup',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body>
        <RecordingProvider>
          {children}
        </RecordingProvider>
      </body>
    </html>
  )
}
