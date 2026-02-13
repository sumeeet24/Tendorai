'use client'

import { useState } from 'react'
import { TenderProfile, EligibilityResult, TenderMetadata } from '@/types'
import { createClient } from '@/lib/supabase/client'
import AgentChatPanel from './AgentChatPanel'
import IntelligencePanel from './IntelligencePanel'
import { useRouter } from 'next/navigation'

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
      // Revert on error? Or just alert.
      // For simplicity, we alert and maybe revert if needed, but here we just log.
      // Ideally, re-fetch.
      alert("Failed to save changes. Please try again.")
    } else {
        router.refresh()
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* Left Panel - Agent Chat (40%) */}
        <div className="w-[40%] min-w-[350px] max-w-[600px] border-r bg-gray-50 flex flex-col z-10">
            <AgentChatPanel
                tender={tender}
                eligibility={eligibility}
                selectedSectionKey={selectedSectionKey}
                activeTab={activeTab}
            />
        </div>

        {/* Right Panel - Intelligence Tabs (60%) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
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
  )
}
