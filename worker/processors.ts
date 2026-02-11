import { createClient } from '@supabase/supabase-js'
import { convertPdfToImages } from '../src/lib/pdf.js'
import { generateJSON, generateText } from '../src/lib/gemini.js'
import { DocumentProcessorServiceClient } from '@google-cloud/documentai'
import { Storage } from '@google-cloud/storage'
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
// Use the numeric ID for buckets if possible to avoid issues?
// But usually bucket names must be unique globally.
const bucketProjectId = '875739244664' // From user env details

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
}

export async function processTender(job: any) {
    const { tender_id, company_id, file_path } = job.payload
    console.log(`Processing Tender: ${tender_id}`)

    try {
        // 1. Download from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('tender-docs')
            .download(file_path)

        if (downloadError) throw downloadError

        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        let fullText = ''

        // 2. Attempt GCS Batch Processing first (Preferred for large docs)
        try {
            console.log('Attempting GCS Batch Processing...')
            fullText = await processTenderViaGCS(tender_id, buffer)
            console.log('GCS Batch Processing Successful.')
        } catch (gcsError: any) {
            console.warn('GCS Batch Processing Failed (likely permissions). Falling back to Online Processing.', gcsError.message)

            // 3. Fallback to Online Processing
            console.log('Starting Online Processing (Page-by-Page)...')
            fullText = await processTenderOnline(arrayBuffer)
        }

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

async function processTenderViaGCS(tender_id: string, buffer: Buffer): Promise<string> {
    const bucketName = `tender-ai-processing-${projectId}`
    const gcsInputPath = `inputs/${tender_id}.pdf`
    const gcsOutputPrefix = `outputs/${tender_id}/`

    // Ensure Bucket Exists & Upload
    const bucket = storage.bucket(bucketName)
    const [exists] = await bucket.exists()
    if (!exists) {
        console.log(`Creating bucket ${bucketName}...`)
        await bucket.create({ location })
    }

    console.log(`Uploading to GCS: gs://${bucketName}/${gcsInputPath}`)
    await bucket.file(gcsInputPath).save(buffer)

    // Document AI Batch Process
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

    console.log('Starting Batch Processing...')
    const [operation] = await docAIClient.batchProcessDocuments(request)
    console.log(`Operation started: ${operation.name}`)

    await operation.promise()
    console.log('Batch Processing Completed.')

    // Download & Parse Results
    const [files] = await bucket.getFiles({ prefix: gcsOutputPrefix })
    let text = ''
    const jsonFiles = files.filter(f => f.name.endsWith('.json'))

    for (const file of jsonFiles) {
        const [content] = await file.download()
        const result = JSON.parse(content.toString())
        if (result.text) {
            text += result.text
        }
    }

    // Cleanup
    try {
        await bucket.file(gcsInputPath).delete()
        await bucket.deleteFiles({ prefix: gcsOutputPrefix })
    } catch (e) {
        console.warn('GCS Cleanup failed:', e)
    }

    return text
}

async function processTenderOnline(arrayBuffer: ArrayBuffer): Promise<string> {
    const images = await convertPdfToImages(arrayBuffer)
    console.log(`Converted ${images.length} pages.`)

    let text = ''
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`

    // Process in batches of 3 to avoid rate limits but speed up processing
    const BATCH_SIZE = 3
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batch = images.slice(i, i + BATCH_SIZE)
        console.log(`Processing pages ${i + 1} to ${Math.min(i + BATCH_SIZE, images.length)}...`)

        const promises = batch.map(async (img) => {
             const request = {
                name,
                rawDocument: {
                    content: img.base64,
                    mimeType: 'image/jpeg',
                }
            }
            try {
                const [result] = await docAIClient.processDocument(request)
                return result.document?.text || ''
            } catch (err) {
                console.error(`Error processing page ${img.pageNumber}:`, err)
                return ''
            }
        })

        const results = await Promise.all(promises)
        text += results.join('\n')
    }

    return text
}
