import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })

export const metadata: Metadata = { title: 'Finan', description: 'Finanças pessoais' }
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={manrope.variable}>
        <div className="lg:flex">
          <Sidebar />
          <main className="min-w-0 flex-1 p-4 pt-16 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
