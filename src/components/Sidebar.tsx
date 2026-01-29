'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, FileText, PlusCircle, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

const navigation = [
  { name: 'Company Profile', href: '/company', icon: Building2 },
  { name: 'Create Tender', href: '/tenders/new', icon: PlusCircle },
  // { name: 'My Tenders', href: '/tenders', icon: FileText }, // Adding this makes sense
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold text-indigo-600">Tender SaaS</span>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
              )}
            >
              <item.icon
                className={clsx(
                  isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500',
                  'mr-3 h-5 w-5 flex-shrink-0'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}

        <div className="mt-8 px-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Recent Tenders
            </div>
            {/* TODO: List recent tenders here */}
             <Link
              href="/tenders"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center rounded-md px-2 py-2 text-sm font-medium"
            >
               <FileText className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400"/>
               All Tenders
            </Link>
        </div>

      </nav>
      <div className="border-t p-4">
        <button
          onClick={handleSignOut}
          className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut
            className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
            aria-hidden="true"
          />
          Sign out
        </button>
      </div>
    </div>
  )
}
