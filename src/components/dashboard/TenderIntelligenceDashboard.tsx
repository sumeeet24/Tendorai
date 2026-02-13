'use client'

import { useState } from 'react'
import { TenderProfile, EligibilityResult, TenderMetadata } from '@/types'
import { createClient } from '@/lib/supabase/client'
import AgentChatPanel from './AgentChatPanel'
import IntelligencePanel from './IntelligencePanel'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Download, MessageSquare, Sparkles, LayoutPanelLeft } from 'lucide-react'

interface Props {
  tender: TenderProfile
  company: any // CompanyProfile
  eligibility: EligibilityResult | null
  userId: string
}

export default function TenderIntelligenceDashboard({ tender: initialTender, company, eligibility: initialEligibility, userId }: Props) {
  const [tender, setTender] = useState<TenderProfile>(initialTender)
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(initialEligibility)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  const handleUpdateMetadata = async (updates: Partial<TenderMetadata>) => {
    // Optimistic update
    const newMetadata = {
      ...(tender.metadata || {}),
      ...updates
    } as TenderMetadata

    const newTender = { ...tender, metadata: newMetadata }
    setTender(newTender)

    // Persist to Supabase
    const { error } = await supabase
      .from('tender_profiles')
      .update({ metadata: newMetadata })
      .eq('id', tender.id)

    if (error) {
      console.error("Failed to update tender metadata:", error)
      alert("Failed to save changes. Please try again.")
    } else {
        router.refresh()
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-50/50 rounded-2xl shadow-sm border border-gray-200/60 backdrop-blur-sm relative font-sans">

        {/* Main Content Area (Intelligence Panel) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white/80 backdrop-blur-xl transition-all duration-300 relative z-0">
            {/* Premium Header / Toolbar */}
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white/50 backdrop-blur-md sticky top-0 z-20">
                 <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <LayoutPanelLeft className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight leading-tight">
                            {tender.tender_name || "Tender Intelligence"}
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Live Analysis</span>
                        </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <button className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all shadow-sm hover:shadow">
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                    </button>
                     <button className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all shadow-sm hover:shadow">
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                    <button className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Deep Analysis
                    </button>

                    <div className="h-6 w-px bg-gray-200 mx-1"></div>

                    {/* Toggle Chat Button */}
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium border ${isChatOpen ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-inner' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                        title={isChatOpen ? "Close Assistant" : "Open Assistant"}
                    >
                        <MessageSquare className={`w-4 h-4 ${isChatOpen ? 'fill-indigo-700' : ''}`} />
                        <span className="hidden sm:inline">{isChatOpen ? 'Assistant Active' : 'Open Assistant'}</span>
                    </button>
                 </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                 <IntelligencePanel
                    tender={tender}
                    eligibility={eligibility}
                    companyId={company.id}
                    userId={userId}
                    onUpdateMetadata={handleUpdateMetadata}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onSectionSelect={setSelectedSectionKey}
                    selectedSectionKey={selectedSectionKey}
                />
            </div>
        </div>

        {/* Right Sidebar - Agent Chat */}
        <AnimatePresence initial={false} mode='wait'>
            {isChatOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 400, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                    className="border-l border-gray-200 bg-white shadow-2xl z-30 h-full flex flex-col relative overflow-hidden"
                >
                    <AgentChatPanel
                        tender={tender}
                        eligibility={eligibility}
                        selectedSectionKey={selectedSectionKey}
                        activeTab={activeTab}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  )
}
