import { useState } from 'react'
import { TenderProfile, EligibilityResult, TenderMetadata } from '@/types'
import { FileText, List, CheckSquare, Flag, Settings, LayoutDashboard, FileStack, ShieldCheck, Send } from 'lucide-react'
import OverviewTab from './tabs/OverviewTab'
import SectionsTab from './tabs/SectionsTab'
import RequiredDocumentsTab from './tabs/RequiredDocumentsTab'
import FinalizeTab from './tabs/FinalizeTab'

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
    <div className="flex flex-col h-full bg-white border-l shadow-xl">
        {/* Tab Navigation */}
        <div className="flex border-b bg-gray-50">
            {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-4 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors border-b-2 ${isActive ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}/>
                        {tab.label}
                    </button>
                )
            })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            {renderContent()}
        </div>
    </div>
  )
}
