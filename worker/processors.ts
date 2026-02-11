import { createClient } from '@supabase/supabase-js'
import { convertPdfToImages } from '../src/lib/pdf.js'
import { generateJSON, generateText } from '../src/lib/gemini.js'
import { DocumentProcessorServiceClient } from '@google-cloud/documentai'
import path from 'path'
import fs from 'fs'
import os from 'os'

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize Google Clients
const GOOGLE_KEY_FILE = path.resolve('service-account.json')

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Using GOOGLE_APPLICATION_CREDENTIALS from env')
} else if (fs.existsSync(GOOGLE_KEY_FILE)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_KEY_FILE
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const tempFile = path.join(os.tmpdir(), 'gcp-service-account.json')
    fs.writeFileSync(tempFile, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFile
    console.log('Created temporary service account file from GOOGLE_APPLICATION_CREDENTIALS_JSON')
} else {
    console.warn('Google Service Account credentials not found!')
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'document-ai-2026'
const location = process.env.GOOGLE_CLOUD_REGION || 'us'
const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID

const docAIClient = new DocumentProcessorServiceClient()

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
        const result = await generateJSON(prompt, [img.base64])
        if (result) {
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
    const { data: profile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', company_id)
        .single()

    if (profile) {
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
    // Placeholder - requires implementation of calculateEligibility
}

export async function processTender(job: any) {
    const { tender_id, company_id, file_path } = job.payload
    console.log(`Processing Tender (DocAI Online): ${tender_id}`)

    try {
        // 1. Download from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('tender-docs')
            .download(file_path)

        if (downloadError) throw downloadError

        const arrayBuffer = await fileData.arrayBuffer()

        // 2. Convert PDF to Images
        console.log('Converting PDF to images...')
        const images = await convertPdfToImages(arrayBuffer)
        console.log(`Converted ${images.length} pages.`)

        let fullText = ''

        // 3. Process each page with Document AI
        const name = `projects/${projectId}/locations/${location}/processors/${processorId}`

        // Process sequentially or in small batches
        for (const [index, img] of images.entries()) {
             console.log(`Processing page ${index + 1}/${images.length}...`)
             const request = {
                name,
                rawDocument: {
                    content: img.base64, // convertPdfToImages returns base64 string (jpeg)
                    mimeType: 'image/jpeg',
                }
            }

            try {
                const [result] = await docAIClient.processDocument(request)
                const { document } = result
                if (document && document.text) {
                    fullText += document.text + '\n'
                }
            } catch (pageErr) {
                console.error(`Error processing page ${index + 1}:`, pageErr)
                // Continue with other pages
            }
        }

        console.log(`Extracted ${fullText.length} characters.`)

        if (!fullText) {
             throw new Error('No text extracted from document.')
        }

        // 4. Generate Gemini Summary
        console.log('Generating Gemini Summary...')

        const summaryPrompt = `
You are a tender analyst.
Summarize the following tender document text into a concise executive summary.
Highlight:
1. Scope of Work
2. Key Qualifications (Financial/Technical)
3. Important Dates (if found)

Text:
${fullText}
`
        let summary = ''
        try {
            summary = await generateText(summaryPrompt)
        } catch (err) {
            console.error('Gemini Summary Failed:', err)
            summary = 'Summary generation failed.'
        }

        // 5. Update Tender Profile
        const { data: currentTender } = await supabase
            .from('tender_profiles')
            .select('metadata')
            .eq('id', tender_id)
            .single()

        const currentMetadata = currentTender?.metadata || {}

        await supabase
            .from('tender_profiles')
            .update({
                metadata: {
                    ...currentMetadata,
                    extracted_text: fullText,
                    summary: summary
                },
                processed: true,
                clauses: []
            })
            .eq('id', tender_id)

        console.log('Tender Profile Updated.')

    } catch (err: any) {
        console.error('ProcessTender Failed:', err)
        throw err
    }
}
