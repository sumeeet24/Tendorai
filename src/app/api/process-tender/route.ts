import { NextResponse } from 'next/server'
import { processTender } from '@/lib/processors'

export const maxDuration = 300; // Allow 5 minutes for processing

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tender_id, file_path, file_paths } = body

    // Validate that we have a tender_id and at least one file source
    if (!tender_id || (!file_path && (!file_paths || !Array.isArray(file_paths) || file_paths.length === 0))) {
      return NextResponse.json({ error: 'Missing tender_id or file_paths' }, { status: 400 })
    }

    console.log(`[API] Starting synchronous tender processing for ${tender_id}...`)

    // Pass everything to the processor, which handles normalization
    const result = await processTender({
      payload: { tender_id, file_path, file_paths }
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
