import { createClient } from '@supabase/supabase-js'
import { convertPdfToImages } from '../src/lib/pdf.js'
import { generateJSON, generateText } from '../src/lib/gemini.js'
import { DocumentProcessorServiceClient } from '@google-cloud/documentai'
import { Storage } from '@google-cloud/storage'
import path from 'path'
import fs from 'fs'
// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize Google Clients
const GOOGLE_KEY_FILE = path.resolve('service-account.json')
if (fs.existsSync(GOOGLE_KEY_FILE)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_KEY_FILE
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
        fs.writeFileSync(GOOGLE_KEY_FILE, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_KEY_FILE
        console.log('Created service-account.json from env var');
    } catch (e) {
        console.error('Failed to create service-account.json', e);
    }
} else {
    console.warn('Google Service Account JSON not found at', GOOGLE_KEY_FILE)
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'document-ai-2026'
const location = process.env.GOOGLE_CLOUD_REGION || 'us'
const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID

const docAIClient = new DocumentProcessorServiceClient()
const storage = new Storage({ projectId })

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
    console.log(`Processing Tender (DocAI Batch GCS): ${tender_id}`)

    const bucketName = 'tendor_ai_bckt'
    const gcsInputPath = `inputs/${tender_id}/document.pdf`
    const gcsOutputPrefix = `outputs/${tender_id}/`

    try {
        // 1. Download from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('tender-docs')
            .download(file_path)

        if (downloadError) throw downloadError

        const buffer = Buffer.from(await fileData.arrayBuffer())

        // 2. Upload to GCS
        const bucket = storage.bucket(bucketName)
        console.log(`Uploading to GCS: gs://${bucketName}/${gcsInputPath}`)
        await bucket.file(gcsInputPath).save(buffer)

        // 3. Document AI Batch Process
        const name = `projects/${projectId}/locations/${location}/processors/${processorId}`
        const inputGcsUri = `gs://${bucketName}/${gcsInputPath}`
        const outputGcsUri = `gs://${bucketName}/${gcsOutputPrefix}`

        const request = {
            name,
            inputDocuments: {
                gcsDocuments: {
                    documents: [
                        {
                            gcsUri: inputGcsUri,
                            mimeType: 'application/pdf'
                        }
                    ]
                }
            },
            documentOutputConfig: {
                gcsOutputConfig: {
                    gcsUri: outputGcsUri
                }
            }
        }

        console.log(`[${new Date().toISOString()}] Starting Batch Processing...`)
        const [operation] = await docAIClient.batchProcessDocuments(request)
        console.log(`[${new Date().toISOString()}] Operation started: ${operation.name}`)

        // Wait for completion
        await operation.promise()
        console.log(`[${new Date().toISOString()}] Batch Processing Completed.`)

        // 4. Download & Parse Results
        console.log(`[${new Date().toISOString()}] Fetching results from GCS...`)
        const [files] = await bucket.getFiles({ prefix: gcsOutputPrefix })

        let fullText = ''

        // Document AI output is sharded JSONs
        const jsonFiles = files.filter(f => f.name.endsWith('.json'))

        // Sort files to ensure order (optional but good practice)
        jsonFiles.sort((a, b) => a.name.localeCompare(b.name))

        for (const file of jsonFiles) {
            const [content] = await file.download()
            const result = JSON.parse(content.toString())
            if (result.text) {
                fullText += result.text
            }
        }

        console.log(`Extracted ${fullText.length} characters.`)

        // 5. Generate Gemini Summary
        console.log('Generating Gemini Summary...')
        // Truncate if too long? Gemini 2.0 has large context (1M tokens).
        // 80 pages of text is fine.

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

        // 6. Update Tender Profile
        // Using metadata column as decided (skipping migration)

        // First fetch existing metadata to preserve other fields if any
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
                // Clear old clauses to avoid confusion? Or keep them empty.
                clauses: []
            })
            .eq('id', tender_id)

        console.log('Tender Profile Updated.')

        // 7. Cleanup GCS
        try {
            await bucket.file(gcsInputPath).delete()
            await bucket.deleteFiles({ prefix: gcsOutputPrefix })
            console.log('GCS Cleanup successful.')
        } catch (e) {
            console.warn('GCS Cleanup failed:', e)
        }

    } catch (err: any) {
        console.error('ProcessTender Failed:', err)
        throw err
    }
}
