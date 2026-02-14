import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch Company Profile
  const { data: profile } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!profile) {
    redirect('/company')
  }

  // Fetch Recent Tenders (for the feed)
  const { data: recentTenders } = await supabase
    .from('tender_profiles')
    .select('*')
    .eq('company_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch All Tenders (lightweight) for stats
  // specific fields to minimize payload
  const { data: allTenders } = await supabase
    .from('tender_profiles')
    .select('id, processed, metadata')
    .eq('company_id', profile.id)

  // Calculate Stats
  const stats = {
    totalTenders: allTenders?.length || 0,
    eligibleCount: 0,
    highRiskCount: 0,
    processingCount: 0
  }

  if (allTenders) {
    allTenders.forEach(tender => {
      // Processing Count
      if (!tender.processed) {
        stats.processingCount++
      }

      // Eligibility Count
      // metadata is a JSON object. We need to cast or access safely.
      const meta = tender.metadata as any
      if (meta?.eligibility_result?.eligible === true) {
        stats.eligibleCount++
      }

      // High Risk Count
      // Check if any risk in the risks array is 'high'
      if (meta?.risks && Array.isArray(meta.risks)) {
        const highRisksInTender = meta.risks.filter((risk: any) => risk.severity === 'high').length
        stats.highRiskCount += highRisksInTender
      }
    })
  }

  return (
    <DashboardClient
      profile={profile}
      tenders={recentTenders || []}
      stats={stats}
      userId={user.id}
    />
  )
}
