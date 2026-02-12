import { createClient } from '@supabase/supabase-js'
import { generateJSON, generateText } from './gemini'
import { DocumentProcessorServiceClient } from '@google-cloud/documentai'
import { Storage } from '@google-cloud/storage'
import path from 'path'
import fs from 'fs'

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize Google Clients
// Use /tmp for Vercel/Serverless environment
const GOOGLE_KEY_FILE = path.join('/tmp', 'service-account.json')

if (fs.existsSync(GOOGLE_KEY_FILE)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_KEY_FILE
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
        fs.writeFileSync(GOOGLE_KEY_FILE, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_KEY_FILE
        console.log('Created service-account.json from env var in /tmp');
    } catch (e) {
        console.error('Failed to create service-account.json', e);
    }
} else {
    console.warn('Google Service Account JSON not found at', GOOGLE_KEY_FILE)
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'document-ai-2026'
console.log(`Using Google Cloud Project ID: ${projectId}`)
const location = process.env.GOOGLE_CLOUD_REGION || 'us'
const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID
const bucketName = 'tendor_ai_bckt'

const docAIClient = new DocumentProcessorServiceClient()
const storage = new Storage({ projectId })

// --- HELPERS ---

async function uploadBufferToGCS(buffer: Buffer, gcsPath: string) {
    console.log(`Uploading to GCS: gs://${bucketName}/${gcsPath}`)
    const bucket = storage.bucket(bucketName)
    await bucket.file(gcsPath).save(buffer)
}

async function runBatchProcessing(gcsInputPath: string, gcsOutputPrefix: string) {
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

    await operation.promise()
    console.log(`[${new Date().toISOString()}] Batch Processing Completed.`)
}

async function extractTextFromGCS(gcsOutputPrefix: string): Promise<string> {
    console.log(`[${new Date().toISOString()}] Fetching results from GCS...`)
    const bucket = storage.bucket(bucketName)
    const [files] = await bucket.getFiles({ prefix: gcsOutputPrefix })

    const jsonFiles = files.filter(f => f.name.endsWith('.json'))
    jsonFiles.sort((a, b) => a.name.localeCompare(b.name))

    let fullText = ''
    for (const file of jsonFiles) {
        const [content] = await file.download()
        const result = JSON.parse(content.toString())
        if (result.text) {
            fullText += result.text
        }
    }
    console.log(`Extracted ${fullText.length} characters.`)
    return fullText
}

async function cleanupGCS(gcsInputPath: string, gcsOutputPrefix: string) {
    try {
        const bucket = storage.bucket(bucketName)
        await bucket.file(gcsInputPath).delete()
        await bucket.deleteFiles({ prefix: gcsOutputPrefix })
        console.log('GCS Cleanup successful.')
    } catch (e) {
        console.warn('GCS Cleanup failed:', e)
    }
}

// --- PROCESSORS ---

export interface ProcessPayload {
    payload: any
}

export async function processCompanyDoc(job: ProcessPayload) {
    const { document_id, company_id, file_path } = job.payload
    console.log(`Processing Company Doc: ${document_id}`)

    const gcsInputPath = `inputs/company_${document_id}/document.pdf`
    const gcsOutputPrefix = `outputs/company_${document_id}/`

    try {
        // 1. Download from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('company-docs')
            .download(file_path)

        if (downloadError) throw downloadError

        const buffer = Buffer.from(await fileData.arrayBuffer())

        // 2. Upload to GCS
        await uploadBufferToGCS(buffer, gcsInputPath)

        // 3. Batch Process
        await runBatchProcessing(gcsInputPath, gcsOutputPrefix)

        // 4. Extract Full Text
        const fullText = await extractTextFromGCS(gcsOutputPrefix)

        // 5. Extract Structured Data (Gemini)
        console.log('Generating structured data with Gemini...')
        const prompt = `
You are a data extraction engine.

Task:
Extract ONLY factual company information explicitly written in the provided text.

Rules (MANDATORY):
- DO NOT summarize
- DO NOT infer
- DO NOT judge eligibility
- DO NOT rewrite text
- Preserve numbers, symbols, and wording EXACTLY
- If information is not present, return empty arrays
- Output JSON ONLY. No explanations.

Text:
${fullText}

Extract the following if present:
1. Annual turnover (year, amount)
2. Completed projects (name, value, year, client)
3. Certifications (name, issuer, validity)
4. OEM authorizations
`
        // Pass empty array for images as we are using text-only prompt
        const result = await generateJSON(prompt, [])

        const mergedData = {
            turnover: result.turnover || [],
            projects: result.projects || [],
            certifications: result.certifications || [],
            oem_authorizations: result.oem_authorizations || []
        }

        // 6. Update Company Profile
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

        // 7. Update Document Status
        await supabase
            .from('document_uploads')
            .update({
                processing_status: 'completed',
                extracted_data: mergedData
            })
            .eq('id', document_id)

        // 8. Cleanup
        await cleanupGCS(gcsInputPath, gcsOutputPrefix)

        return { success: true, message: 'Processing complete', data: mergedData }

    } catch (err: any) {
        console.error('ProcessCompanyDoc Failed:', err)
        // Update status to failed
        await supabase
            .from('document_uploads')
            .update({
                processing_status: 'failed'
            })
            .eq('id', document_id)

        throw err
    }
}

export async function processTender(job: ProcessPayload) {
    const { tender_id, file_path } = job.payload
    console.log(`Processing Tender (DocAI Batch GCS): ${tender_id}`)

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
        await uploadBufferToGCS(buffer, gcsInputPath)

        // 3. Batch Process
        await runBatchProcessing(gcsInputPath, gcsOutputPrefix)

        // 4. Extract Full Text
        const fullText = await extractTextFromGCS(gcsOutputPrefix)

        // 5. Generate Gemini Summary
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

        // 6. Update Tender Profile
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

        // 7. Cleanup
        await cleanupGCS(gcsInputPath, gcsOutputPrefix)

        return { success: true, message: 'Processing complete', summary }

    } catch (err: any) {
        console.error('ProcessTender Failed:', err)
        // We might want to mark it as failed in DB if there was a status field,
        // but tender_profiles uses 'processed' boolean.
        // We could leave it false or add an error field.
        // For now, rethrow so the API returns error.
        throw err
    }
}
