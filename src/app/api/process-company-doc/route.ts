import { NextResponse } from 'next/server'
import { processCompanyDoc } from '@/lib/processors'

export const maxDuration = 300; // Allow 5 minutes for processing

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { document_id, company_id, file_path } = body

    if (!document_id || !company_id || !file_path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log(`[API] Starting synchronous company doc processing for ${document_id}...`)

    const result = await processCompanyDoc({
      payload: body
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
