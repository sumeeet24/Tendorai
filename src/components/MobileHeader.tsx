'use client'

import { Menu, Bot } from 'lucide-react'

interface MobileHeaderProps {
  onOpenSidebar: () => void
}

export default function MobileHeader({ onOpenSidebar }: MobileHeaderProps) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden hover:text-indigo-600 transition-colors"
        onClick={onOpenSidebar}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-x-2">
            <Bot className="h-6 w-6 text-indigo-600" />
            <span className="text-lg font-bold text-gray-900 tracking-tight">TenderAI</span>
        </div>
      </div>
    </div>
  )
}
