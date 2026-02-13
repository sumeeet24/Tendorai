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
    const { message, tenderId } = await req.json()
    const lowerMessage = message.toLowerCase()

    // Fetch context data
    const { data: tender } = await supabase.from('tender_profiles').select('*').eq('id', tenderId).single()
    const { data: company } = await supabase.from('company_profiles').select('*').eq('owner_id', user.id).single()

    if (!tender) return new NextResponse('Tender not found', { status: 404 })

    const metadata = tender.metadata as any || {}
    const sections = metadata.sections || {}
    const summary = metadata.summary || ""

    // 1. Detect Keywords
    let selectedContext = ""
    let includeCompany = false

    if (lowerMessage.includes('eligibility') || lowerMessage.includes('eligible') || lowerMessage.includes('qualify')) {
        selectedContext = sections["Eligibility Criteria"] || ""
        includeCompany = true
    } else if (lowerMessage.includes('scope') || lowerMessage.includes('work') || lowerMessage.includes('project')) {
        selectedContext = sections["Scope Of Work"] || ""
    } else if (lowerMessage.includes('payment') || lowerMessage.includes('terms') || lowerMessage.includes('fee')) {
        selectedContext = sections["Payment Terms"] || ""
    } else if (lowerMessage.includes('document') || lowerMessage.includes('doc') || lowerMessage.includes('submit')) {
        selectedContext = sections["Required Documents"] || "" // Note: This might be raw text or JSON if processed?
        // metadata.sections['Required Documents'] stores the text content from the classification step.
        // metadata.required_documents stores the extracted JSON.
        // The prompt says "Section: <<<RELEVANT_SECTION>>>".
        // Classification step stores *text* in sections['Required Documents'].
        // So we use sections['Required Documents'].
    } else if (lowerMessage.includes('risk') || lowerMessage.includes('liability') || lowerMessage.includes('penalty')) {
        selectedContext = sections["Risks"] || ""
    } else {
        // Fallback or multiple?
        // Spec says "Only send relevant section".
        // If no keyword, maybe send Summary?
        selectedContext = `Executive Summary:\n${summary}\n\n(Note: No specific section matched the query. Using summary.)`
    }

    // 2. Construct Prompt
    let prompt = `
Answer based only on the provided section.
If answer not found in section, say information not available.

Section:
${selectedContext}
`

    if (includeCompany && company) {
        prompt += `
Company Data:
${JSON.stringify(company)}
`
    }

    prompt += `
User Question:
${message}
`

    // 3. Call Gemini
    const response = await generateText(prompt)
    return NextResponse.json({ response })

  } catch (error) {
      console.error(error)
      return new NextResponse('AI Error', { status: 500 })
  }
}
