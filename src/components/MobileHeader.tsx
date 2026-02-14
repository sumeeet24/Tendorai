'use client'

import { Menu } from 'lucide-react'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 md:hidden">
      <div className="flex items-center gap-3">
        {/* Logo or Brand Name */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/30">
          T
        </div>
        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Tender<span className="text-indigo-600 dark:text-indigo-400">AI</span>
        </span>
      </div>

      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>
    </div>
  )
}
