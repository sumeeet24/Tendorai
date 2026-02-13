'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, FileText, PlusCircle, LogOut, X, LayoutDashboard, Settings, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

const navigation = [
  { name: 'Company Profile', href: '/company', icon: Building2 },
  { name: 'New Analysis', href: '/tenders/new', icon: PlusCircle },
  { name: 'My Tenders', href: '/tenders', icon: FileText },
]

const secondaryNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'System Status', href: '#', icon: Activity },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 md:sticky md:top-0 md:translate-x-0 md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Tender<span className="text-indigo-600 dark:text-indigo-400">AI</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 md:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-50/50 px-4 py-6 dark:bg-zinc-950/50">
          {/* Main Nav */}
          <nav className="space-y-1">
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Workspace
            </div>
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20'
                      : 'text-zinc-600 hover:bg-white hover:text-zinc-900 hover:shadow-sm hover:ring-1 hover:ring-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 dark:hover:ring-zinc-800',
                    'group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200'
                  )}
                >
                  <item.icon
                    className={clsx(
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400',
                      'mr-3 h-5 w-5 flex-shrink-0 transition-colors'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Secondary Nav */}
          <nav className="mt-8 space-y-1">
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              System
            </div>
            {secondaryNavigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-white hover:text-zinc-900 hover:shadow-sm hover:ring-1 hover:ring-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 dark:hover:ring-zinc-800"
              >
                <item.icon
                  className="mr-3 h-5 w-5 flex-shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400"
                  aria-hidden="true"
                />
                {item.name}
              </a>
            ))}
          </nav>

          {/* Agent Status Card */}
          <div className="mt-auto pt-8">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <div className="flex items-center gap-3">
                <div className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
                </div>
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  AI Agent Active
                </p>
              </div>
              <p className="mt-2 text-xs text-indigo-600/80 dark:text-indigo-400/80">
                Ready to analyze tenders and extract insights.
              </p>
            </div>
          </div>
        </div>

        {/* Footer / User */}
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            onClick={handleSignOut}
            className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
          >
            <div className="flex items-center gap-3">
               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  US
               </div>
               <div className="flex flex-col items-start">
                   <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">User Account</span>
                   <span className="text-[10px] text-zinc-500">Sign out</span>
               </div>
            </div>
            <LogOut
              className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-zinc-500"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </>
  )
}
