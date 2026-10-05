import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { DrawerProvider } from '@/components/DrawerProvider'
import { bootstrap } from '@/server/bootstrap'
import { listCategories, listTags } from '@/server/queries'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })

export const metadata: Metadata = { title: 'Finan', description: 'Finanças pessoais' }
export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await bootstrap()
  const [categories, tags] = await Promise.all([listCategories(), listTags()])
  return (
    <html lang="pt-BR">
      <body className={manrope.variable} suppressHydrationWarning>
        <DrawerProvider categories={categories} tags={tags.map((t) => t.name)}>
          <div className="lg:flex">
            <Sidebar />
            <main className="min-w-0 flex-1 p-4 pt-16 lg:p-8">{children}</main>
          </div>
        </DrawerProvider>
      </body>
    </html>
  )
}
