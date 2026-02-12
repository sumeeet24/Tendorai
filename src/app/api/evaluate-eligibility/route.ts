import { createClient } from '@/lib/supabase/server'
import { evaluateEligibility } from '@/lib/processors'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
      const { tender_id, company_id } = await req.json()

      if (!tender_id || !company_id) {
          return NextResponse.json({ error: 'Missing tender_id or company_id' }, { status: 400 })
      }

      // Fetch Tender
      const { data: tender, error: tenderError } = await supabase
          .from('tender_profiles')
          .select('*')
          .eq('id', tender_id)
          .single()

      if (tenderError || !tender) {
          return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
      }

      // Fetch Company
      const { data: company, error: companyError } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('id', company_id)
          .eq('owner_id', user.id) // Ensure ownership
          .single()

      if (companyError || !company) {
          return NextResponse.json({ error: 'Company profile not found or access denied' }, { status: 404 })
      }

      // Check if sections exist
      const metadata = tender.metadata as any
      const sections = metadata?.sections

      if (!sections) {
          return NextResponse.json({ error: 'Tender sections not processed yet' }, { status: 400 })
      }

      // Evaluate
      const result = await evaluateEligibility(sections, company)

      // Update Tender Metadata with result
      const newMetadata = {
          ...metadata,
          eligibility_result: result
      }

      const { error: updateError } = await supabase
          .from('tender_profiles')
          .update({ metadata: newMetadata })
          .eq('id', tender_id)

      if (updateError) {
          console.error('Failed to update tender metadata', updateError)
          // Not fatal, return result anyway
      }

      return NextResponse.json(result)

  } catch (error: any) {
      console.error('Evaluation Error:', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
