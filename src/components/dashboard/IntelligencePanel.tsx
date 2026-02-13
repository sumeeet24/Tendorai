import { useState } from 'react'
import { TenderProfile, EligibilityResult, TenderMetadata } from '@/types'
import { FileText, List, CheckSquare, Flag, Settings, LayoutDashboard, FileStack, ShieldCheck, Send } from 'lucide-react'
import OverviewTab from './tabs/OverviewTab'
import SectionsTab from './tabs/SectionsTab'
import RequiredDocumentsTab from './tabs/RequiredDocumentsTab'
import FinalizeTab from './tabs/FinalizeTab'
import { motion, AnimatePresence } from 'framer-motion'

interface IntelligencePanelProps {
  tender: TenderProfile
  eligibility: EligibilityResult | null
  companyId: string
  userId: string
  onUpdateMetadata: (updates: Partial<TenderMetadata>) => Promise<void>
  activeTab: string
  setActiveTab: (tab: string) => void
  onSectionSelect: (sectionKey: string | null) => void
  selectedSectionKey: string | null
}

export default function IntelligencePanel({
    tender,
    eligibility,
    companyId,
    userId,
    onUpdateMetadata,
    activeTab,
    setActiveTab,
    onSectionSelect,
    selectedSectionKey
}: IntelligencePanelProps) {

  const tabs = [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'sections', label: 'Sections', icon: List },
      { id: 'required_docs', label: 'Required Docs', icon: FileStack },
      { id: 'finalize', label: 'Finalize', icon: ShieldCheck },
  ]

  const renderContent = () => {
      switch (activeTab) {
          case 'overview':
              return <OverviewTab tender={tender} eligibility={eligibility} />
          case 'sections':
              return <SectionsTab tender={tender} onSectionSelect={onSectionSelect} selectedSectionKey={selectedSectionKey} />
          case 'required_docs':
              return <RequiredDocumentsTab tender={tender} companyId={companyId} userId={userId} onUpdateMetadata={onUpdateMetadata} />
          case 'finalize':
              return <FinalizeTab tender={tender} eligibility={eligibility} />
          default:
              return <OverviewTab tender={tender} eligibility={eligibility} />
      }
  }

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
        {/* Modern Tab Navigation */}
        <div className="flex items-center gap-1 p-3 bg-white/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex p-1 bg-gray-100/50 rounded-xl w-full max-w-2xl mx-auto border border-gray-100 shadow-inner">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                relative flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 outline-none
                                ${isActive
                                    ? 'text-indigo-600 bg-white shadow-sm ring-1 ring-gray-200/50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }
                            `}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}/>
                            <span className="hidden sm:inline">{tab.label}</span>
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="absolute inset-0 border-2 border-indigo-50 rounded-lg pointer-events-none"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/30 scroll-smooth">
             <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="max-w-7xl mx-auto"
             >
                {renderContent()}
             </motion.div>
        </div>
    </div>
  )
}
