import { NextResponse } from 'next/server'
import { processTender } from '@/lib/processors'

export const maxDuration = 300; // Allow 5 minutes for processing

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tender_id, file_path } = body

    if (!tender_id || !file_path) {
      return NextResponse.json({ error: 'Missing tender_id or file_path' }, { status: 400 })
    }

    console.log(`[API] Starting synchronous tender processing for ${tender_id}...`)

    // Call the processor directly
    // We await it to make it synchronous as requested.
    const result = await processTender({
      payload: { tender_id, file_path }
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
