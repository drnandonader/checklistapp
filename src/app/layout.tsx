import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/useAuth'

export const metadata: Metadata = {
  title: 'Checklist Boa Vista II',
  description: 'Checklist mensal de indicadores de Atenção Primária à Saúde — UBS Boa Vista II',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
