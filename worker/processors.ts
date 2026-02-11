import { createClient } from '@supabase/supabase-js'
import { convertPdfToImages } from '../src/lib/pdf.js'
import { generateJSON, generateText } from '../src/lib/gemini.js'
import { processDocument } from '../src/lib/documentai.js'

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function processCompanyDoc(job: any) {
    const { document_id, company_id, file_path, document_type, owner_id } = job.payload

    console.log(`Processing Company Doc: ${document_id}`)

    // 1. Download File
    const { data: fileData, error: downloadError } = await supabase.storage
        .from('company-docs')
        .download(file_path)

    if (downloadError) throw downloadError

    // 2. Convert to Images
    const arrayBuffer = await fileData.arrayBuffer()
    const images = await convertPdfToImages(arrayBuffer)

    // 3. Extract Data (Agent 1)
    const extractedResults: any[] = []

    for (const img of images) {
        const prompt = `
You are a data extraction engine.

Task:
Extract ONLY factual company information explicitly written on the page.

Rules (MANDATORY):
- DO NOT summarize
- DO NOT infer
- DO NOT judge eligibility
- DO NOT rewrite text
- DO NOT merge information across pages
- Preserve numbers, symbols, and wording EXACTLY
- If information is not present, return empty arrays
- Output JSON ONLY. No explanations.

Extract the following if present:
1. Annual turnover (year, amount)
2. Completed projects (name, value, year, client)
3. Certifications (name, issuer, validity)
4. OEM authorizations

Always include page_number in each extracted item.
Page Number: ${img.pageNumber}
`
        // Call Agent
        const result = await generateJSON(prompt, [img.base64])
        if (result) {
            // Inject page number if missing or just trust agent?
            // Agent told to include it.
            extractedResults.push(result)
        }
    }

    // 4. Merge Results
    const mergedData = {
        turnover: extractedResults.flatMap(r => r.turnover || []),
        projects: extractedResults.flatMap(r => r.projects || []),
        certifications: extractedResults.flatMap(r => r.certifications || []),
        oem_authorizations: extractedResults.flatMap(r => r.oem_authorizations || [])
    }

    // 5. Update Company Profile (Append/Merge)
    // We need to fetch existing profile first
    const { data: profile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', company_id)
        .single()

    if (profile) {
        // Simple merge: Append new data. ideally deduplicate.
        // For now, just append.
        const updatedProfile = {
            turnover: [...(profile.turnover || []), ...mergedData.turnover],
            projects: [...(profile.projects || []), ...mergedData.projects],
            certifications: [...(profile.certifications || []), ...mergedData.certifications],
            oem_authorizations: [...(profile.oem_authorizations || []), ...mergedData.oem_authorizations]
        }

        await supabase
            .from('company_profiles')
            .update(updatedProfile)
            .eq('id', company_id)
    }

    // 6. Update Document Status
    await supabase
        .from('document_uploads')
        .update({
            processing_status: 'completed',
            extracted_data: mergedData
        })
        .eq('id', document_id)

    // 7. Trigger Eligibility Recalculation (Pipeline 4)
    // Find all tenders for this company? Or just re-calc active ones?
    // "Re-run eligibility calculation (code)"
    // We should find all 'processed' tenders for this company and re-check.
    const { data: tenders } = await supabase
        .from('tender_profiles')
        .select('id')
        .eq('company_id', company_id)
        .eq('processed', true)

    if (tenders) {
        for (const tender of tenders) {
            await calculateEligibility(tender.id, company_id)
        }
    }
}

export async function processTender(job: any) {
    const { tender_id, company_id, file_path } = job.payload
    console.log(`Processing Tender: ${tender_id}`)

    // 1. Download
    const { data: fileData, error: downloadError } = await supabase.storage
        .from('tender-docs')
        .download(file_path)

    if (downloadError) throw downloadError

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    try {
        // 2. Document AI Extraction (Replaces Gemini Chunking)
        console.log('Sending to Document AI...')
        const ocrText = await processDocument(buffer)

        // 3. Summarize with Gemini
        console.log('Generating Summary...')
        // Gemini 2.0 Flash has large context window.
        const summaryPrompt = `
Summarize the following tender document in 3-5 concise bullet points.
Highlight the key requirements and scope.

Document Text:
${ocrText}
`
        const summary = await generateText(summaryPrompt)

        // 4. Store in TenderProfile
        await supabase
            .from('tender_profiles')
            .update({
                ocr_text: ocrText,
                summary: summary,
                processed: true
                // clauses: [], // We are disabling clauses for now
            })
            .eq('id', tender_id)

        console.log(`Tender ${tender_id} processed successfully.`)

        // Disable Eligibility Calculation
        // await calculateEligibility(tender_id, company_id)

    } catch (err: any) {
        console.error('Error processing tender:', err)
        throw err
    }
}

async function calculateEligibility(tenderId: string, companyId: string) {
    // Disabled for now as per instructions
    console.log(`Skipping Eligibility: Tender ${tenderId}, Company ${companyId}`)
}
