'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import {
  Building2,
  FileText,
  PlusCircle,
  LogOut,
  X,
  LayoutDashboard,
  Settings,
  Bot
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'All Tenders', href: '/tenders', icon: FileText },
  { name: 'New Tender', href: '/tenders/new', icon: PlusCircle },
  { name: 'Company Profile', href: '/company', icon: Building2 },
]

const secondaryNavigation = [
  // { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-900">
      <div className="flex h-16 flex-shrink-0 items-center px-4 bg-slate-950">
        <Bot className="h-8 w-8 text-pink-500" />
        <span className="ml-3 text-lg font-bold tracking-wide text-brand-gradient">Qubit</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/tenders' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  isActive
                    ? 'bg-slate-800 text-white border-l-4 border-pink-500'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-r-md transition-colors duration-150'
                )}
              >
                <item.icon
                  className={clsx(
                    isActive ? 'text-pink-400' : 'text-slate-400 group-hover:text-slate-300',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}

          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recent Tenders
            </h3>
            <div className="mt-1 space-y-1 px-2" role="group">
                 <Link
                    href="/tenders"
                    className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <span className="truncate">View All Tenders</span>
                  </Link>
            </div>
          </div>
        </nav>
      </div>
      <div className="flex flex-shrink-0 border-t border-slate-800 p-4 bg-slate-950">
        <button
          onClick={handleSignOut}
          className="group block w-full flex-shrink-0"
        >
          <div className="flex items-center">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white">
               <LogOut className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white group-hover:text-slate-200">Sign Out</p>
              <p className="text-xs font-medium text-slate-400 group-hover:text-slate-300">Account</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Sidebar */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setIsOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button type="button" className="-m-2.5 p-2.5" onClick={() => setIsOpen(false)}>
                      <span className="sr-only">Close sidebar</span>
                      <X className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Sidebar (Static) */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
      </div>
    </>
  )
}
