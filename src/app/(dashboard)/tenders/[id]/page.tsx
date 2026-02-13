import { createClient } from '@/lib/supabase/server'
import TenderIntelligenceDashboard from '@/components/dashboard/TenderIntelligenceDashboard'
import { redirect } from 'next/navigation'
import { TenderProfile, EligibilityResult } from '@/types'

export default async function TenderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch Tender
  const { data: tender } = await supabase
    .from('tender_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!tender) {
      // 404
      return <div>Tender not found</div>
  }

  // Fetch Company
  const { data: company } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!company) redirect('/company')

  // Verify ownership (RLS handles fetch, but check if company_id matches)
  if (tender.company_id !== company.id) {
      return <div>Unauthorized</div>
  }

  // Fetch Eligibility
  const { data: eligibility } = await supabase
    .from('eligibility_results')
    .select('*')
    .eq('tender_id', id)
    .single()

  return (
    <TenderIntelligenceDashboard
        tender={tender as TenderProfile}
        company={company}
        eligibility={eligibility as EligibilityResult | null}
        userId={user.id}
    />
  )
}
