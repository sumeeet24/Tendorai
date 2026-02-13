import { createClient } from '@/lib/supabase/server'
import { generateJSON, generateText } from '@/lib/gemini'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
      const { tenderId, type, requirement, rawClause } = await req.json()

      const { data: tender } = await supabase.from('tender_profiles').select('*').eq('id', tenderId).single()
      const { data: company } = await supabase.from('company_profiles').select('*').eq('owner_id', user.id).single()

      if (!tender) return new NextResponse('Tender not found', { status: 404 })

      // If we have a specific requirement and rawClause, use the Draft Engine logic
      if (requirement && rawClause) {
          const prompt = `
Draft a formal procurement submission document.

Requirement Clause:
${rawClause}

Company Data:
${JSON.stringify(company)}

Rules:
- Follow formal tender submission tone.
- Address the requirement directly.
- Include company credentials only if relevant to clause.
- Do not summarize the company generally.
- Produce submission-ready text.

Output full document.
`
          const content = await generateText(prompt)

          return NextResponse.json({
              title: requirement,
              content: content
          })
      }

      // Legacy fallback (or if no rawClause provided)
      const metadata = tender.metadata as any || {}
      const sections = metadata.sections || {}
      const tenderContext = {
          id: tender.id,
          title: tender.title,
          sections: sections,
          required_documents: metadata.required_documents || []
      }

      const prompt = `
You are generating a technical bid draft.

Rules:
- Use ONLY provided data (specifically the sections)
- DO NOT invent experience or numbers
- If data is missing, insert [TO BE PROVIDED]
- Write in formal tender language
- Output structured sections

Context:
Tender: ${JSON.stringify(tenderContext)}
Company: ${JSON.stringify(company)}

Task: Generate a ${type === 'compliance' ? 'Compliance Statement' : 'Technical Proposal'}.
Output JSON format: { "title": "...", "content": "..." }
`
      const result = await generateJSON(prompt)
      return NextResponse.json(result)

  } catch (error) {
      console.error(error)
      return new NextResponse('AI Error', { status: 500 })
  }
}
