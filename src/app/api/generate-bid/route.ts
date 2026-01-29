import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/gemini'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { tenderId, type } = await req.json() // type: 'technical' or 'compliance'

  const { data: tender } = await supabase.from('tender_profiles').select('*').eq('id', tenderId).single()
  const { data: company } = await supabase.from('company_profiles').select('*').eq('owner_id', user.id).single()
  const { data: eligibility } = await supabase.from('eligibility_results').select('*').eq('tender_id', tenderId).single()

  if (!tender) return new NextResponse('Tender not found', { status: 404 })

  const prompt = `
You are generating a technical bid draft.

Rules:
- Use ONLY provided data
- DO NOT invent experience or numbers
- If data is missing, insert [TO BE PROVIDED]
- Write in formal tender language
- Output structured sections

Context:
Tender: ${JSON.stringify(tender)}
Company: ${JSON.stringify(company)}
Eligibility: ${JSON.stringify(eligibility)}

Task: Generate a ${type === 'compliance' ? 'Compliance Statement' : 'Technical Proposal'}.
Output JSON format: { "title": "...", "content": "..." }
`

  try {
      const result = await generateJSON(prompt)
      return NextResponse.json(result)
  } catch (error) {
      console.error(error)
      return new NextResponse('AI Error', { status: 500 })
  }
}
