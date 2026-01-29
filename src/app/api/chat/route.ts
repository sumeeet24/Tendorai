import { createClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/gemini'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { message, tenderId, context } = await req.json()

  // Verify ownership
  // We trust the context provided by client? NO. We should fetch it or at least verify tenderId.
  // Fetching context on server is safer.

  const { data: tender } = await supabase.from('tender_profiles').select('*').eq('id', tenderId).single()
  const { data: company } = await supabase.from('company_profiles').select('*').eq('owner_id', user.id).single()
  const { data: eligibility } = await supabase.from('eligibility_results').select('*').eq('tender_id', tenderId).single()

  if (!tender) return new NextResponse('Tender not found', { status: 404 })

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
- Reference clause IDs and page numbers
- If information is missing, say "Information not available"
- Never guess

Context:
Tender Profile: ${JSON.stringify(tender)}
Company Profile: ${JSON.stringify(company)}
Eligibility Result: ${JSON.stringify(eligibility)}
UI State: ${JSON.stringify(context?.uiState || {})}

User Message: ${message}
`

  try {
      const response = await generateText(systemPrompt)
      return NextResponse.json({ response })
  } catch (error) {
      console.error(error)
      return new NextResponse('AI Error', { status: 500 })
  }
}
