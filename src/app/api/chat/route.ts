import { createClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/gemini'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const { message, tenderId, context } = await req.json()

    // Fetch context data
    const { data: tender } = await supabase.from('tender_profiles').select('*').eq('id', tenderId).single()
    const { data: company } = await supabase.from('company_profiles').select('*').eq('owner_id', user.id).single()

    // Attempt to fetch legacy eligibility result, but we prefer metadata
    const { data: legacyEligibility } = await supabase.from('eligibility_results').select('*').eq('tender_id', tenderId).single()

    if (!tender) return new NextResponse('Tender not found', { status: 404 })

    const metadata = tender.metadata as any || {}
    const sections = metadata.sections || {}

    // Construct focused context from structured sections
    const tenderContext = {
        id: tender.id,
        title: tender.title,
        sections: sections,
        required_documents: metadata.required_documents || []
    }

    // Prefer metadata eligibility result, fallback to legacy table
    const eligibilityContext = metadata.eligibility_result || legacyEligibility || null

    const systemPrompt = `
You are an assistant for tender analysis.

You are NOT allowed to:
- Change data
- Invent facts
- Override eligibility decisions
- Assume missing documents exist

You MAY:
- Explain eligibility results
- Answer questions using provided data only
- Suggest next actions
- Draft text when explicitly requested

Rules:
- Reference clause IDs (if available in sections) and specifics
- If information is missing, say "Information not available"
- Never guess
- Use the structured sections provided in the context for all reasoning.

Context:
Tender Profile: ${JSON.stringify(tenderContext)}
Company Profile: ${JSON.stringify(company)}
Eligibility Result: ${JSON.stringify(eligibilityContext)}
UI State: ${JSON.stringify(context?.uiState || {})}

User Message: ${message}
`

      const response = await generateText(systemPrompt)
      return NextResponse.json({ response })
  } catch (error) {
      console.error(error)
      return new NextResponse('AI Error', { status: 500 })
  }
}
