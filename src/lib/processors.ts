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

// --- INTELLIGENCE & EVALUATION ---

export async function evaluateEligibility(sections: any, companyProfile: any) {
    console.log('Evaluating Eligibility...')

    const criteriaSections = `
Eligibility Criteria:
${sections['Eligibility Criteria'] || ''}

Evaluation Criteria:
${sections['Evaluation Criteria'] || ''}
`

    const prompt = `
Compare company data strictly against tender eligibility criteria.

Rules:
- Do not infer beyond text.
- If requirement not found, mark as unknown.
- Provide evidence quotes.
- Output JSON only.

Return:
{
"eligible": true/false,
"matched_requirements": [
{
"requirement": "",
"evidence_from_company": "",
"evidence_from_tender": ""
}
],
"failed_requirements": [],
"unknown_requirements": [],
"confidence": "low|medium|high"
}

Tender Criteria:
${criteriaSections}

Company Data:
${JSON.stringify(companyProfile)}
`
    try {
        const result = await generateJSON(prompt)
        return result
    } catch (error) {
        console.error('Eligibility Evaluation Failed:', error)
        return {
            eligible: false,
            matched_requirements: [],
            failed_requirements: ['AI evaluation failed'],
            unknown_requirements: [],
            confidence: 'low'
        }
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
    // accept file_paths (array) or file_path (legacy string)
    const { tender_id, file_path, file_paths } = job.payload

    // Normalize file_paths
    let files: string[] = []
    if (Array.isArray(file_paths)) {
        files = file_paths
    } else if (typeof file_path === 'string') {
        files = [file_path]
    }

    console.log(`Processing Tender (DocAI Batch GCS): ${tender_id}, Files: ${files.length}`)

    let mergedFullText = ''

    try {
        // --- STEP 1: MULTI-PDF HANDLING ---
        for (const filePath of files) {
            const filename = path.basename(filePath)
            // Use simple safe name for GCS to avoid path issues
            const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
            const gcsInputPath = `inputs/${tender_id}/${safeFilename}`
            // Unique output prefix for each file
            const gcsOutputPrefix = `outputs/${tender_id}/${safeFilename}/`

            console.log(`Processing file: ${filename}`)

            // 1. Download from Supabase
            const { data: fileData, error: downloadError } = await supabase.storage
                .from('tender-docs')
                .download(filePath)

            if (downloadError) throw downloadError

            const buffer = Buffer.from(await fileData.arrayBuffer())

            // 2. Upload to GCS
            await uploadBufferToGCS(buffer, gcsInputPath)

            // 3. Batch Process
            await runBatchProcessing(gcsInputPath, gcsOutputPrefix)

            // 4. Extract Text
            const text = await extractTextFromGCS(gcsOutputPrefix)

            // Merge with delimiter
            mergedFullText += `\n===== DOCUMENT: ${filename} =====\n${text}\n`

            // Cleanup this file's artifacts immediately to save space/cost
            await cleanupGCS(gcsInputPath, gcsOutputPrefix)
        }

        // --- STEP 2: SECTION CLASSIFICATION ---
        console.log('Classifying text into fixed categories...')
        const classificationPrompt = `
You are a deterministic tender classifier.

Classify the provided text into the following EXACT JSON structure.

Rules:
- Copy relevant text exactly.
- Do NOT summarize.
- Do NOT rewrite.
- Do NOT infer.
- If no relevant content exists, return empty string.
- Output strictly valid JSON.

Schema:
{
"Eligibility Criteria": "",
"Pre-Bid Meeting": "",
"Evaluation Criteria": "",
"Required Documents": "",
"Scope Of Work": "",
"EMD Fee": "",
"Relaxations": "",
"Payment Terms": "",
"BOQ Requirements": "",
"Risks": "",
"Redlining": "",
"Annexures": "",
"Uncategorized": ""
}

Text:
${mergedFullText}
`
        let sections: any = {}
        try {
            sections = await generateJSON(classificationPrompt)
        } catch (err) {
            console.error('Classification Failed:', err)
            throw new Error('Tender classification failed')
        }

        // --- STEP 3: EXECUTIVE SUMMARY STAGE ---
        console.log('Generating Executive Summary...')
        const summarySections = `
Scope Of Work:
${sections["Scope Of Work"]}

Eligibility Criteria:
${sections["Eligibility Criteria"]}

Evaluation Criteria:
${sections["Evaluation Criteria"]}

EMD Fee:
${sections["EMD Fee"]}

Pre-Bid Meeting:
${sections["Pre-Bid Meeting"]}
`
        const summaryPrompt = `
Generate an executive summary strictly from the provided sections.

Constraints:
- Do not invent data.
- Do not add assumptions.
- Only summarize what exists.
- Highlight financial thresholds, key dates, and qualification requirements.
- If data missing, do not fabricate.

Sections:
${summarySections}
`
        let summary = ''
        try {
            // Use generateText for summary as it is free-form text
            summary = await generateText(summaryPrompt)
        } catch (err) {
            console.error('Summary Generation Failed:', err)
            summary = "Summary generation failed."
        }

        // --- STEP 4: REQUIRED DOCUMENT EXTRACTION STAGE ---
        console.log('Extracting Required Documents...')
        const reqDocsPrompt = `
Extract only explicitly listed required submission documents.

Rules:
- Do not invent documents.
- Only include documents clearly stated.
- If none found, return empty array.
- Preserve original clause in raw_clause field.

Return JSON array:
[
{
"name": "",
"mandatory": true/false,
"raw_clause": ""
}
]

Text:
${sections['Required Documents'] || ''}
`
        let requiredDocuments: any[] = []
        try {
            requiredDocuments = await generateJSON(reqDocsPrompt)
        } catch (err) {
            console.error('Req Docs Extraction Failed:', err)
            requiredDocuments = []
        }

        // --- STEP 5: RISK ANALYSIS STAGE ---
        console.log('Analyzing Risks...')
        const riskSections = `
Risks:
${sections["Risks"]}

Payment Terms:
${sections["Payment Terms"]}

Redlining:
${sections["Redlining"]}

EMD Fee:
${sections["EMD Fee"]}
`
        const riskPrompt = `
Identify explicit financial, legal, or compliance risks.

Rules:
- Only use provided sections.
- Do not speculate.
- Extract exact clauses that represent risk.

Return JSON:
[
{
"risk_type": "",
"clause": "",
"severity": "low|medium|high"
}
]

Input:
${riskSections}
`
        let risks: any[] = []
        try {
            risks = await generateJSON(riskPrompt)
        } catch (err) {
            console.error('Risk Analysis Failed:', err)
            risks = []
        }

        // --- STEP 6: STORE STRUCTURED STATE ---
        // Fetch current to preserve anything if needed
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
                    extracted_text: mergedFullText,
                    sections: sections,
                    summary: summary,
                    required_documents: requiredDocuments,
                    risks: risks,
                    eligibility_result: null // Reset eligibility as content changed
                },
                processed: true,
                clauses: [] // Clear old clauses
            })
            .eq('id', tender_id)

        console.log('Tender Profile Updated with Structured Data.')

        return { success: true, message: 'Processing complete', sections }

    } catch (err: any) {
        console.error('ProcessTender Failed:', err)
        throw err
    }
}
