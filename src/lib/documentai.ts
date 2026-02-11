import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// Initialize client
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
let credentials;
try {
    credentials = credentialsJson ? JSON.parse(credentialsJson) : undefined;
} catch (e) {
    console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON', e);
}

const client = new DocumentProcessorServiceClient({
    credentials,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = process.env.GOOGLE_CLOUD_REGION || 'us'; // e.g. 'us' or 'eu'
const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;

export async function processDocument(fileBuffer: Buffer, mimeType: string = 'application/pdf'): Promise<string> {
    if (!projectId || !processorId) {
        throw new Error('Missing Document AI configuration (PROJECT_ID or PROCESSOR_ID)');
    }

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Convert buffer to base64
    const content = fileBuffer.toString('base64');

    const request = {
        name,
        rawDocument: {
            content,
            mimeType,
        },
    };

    try {
        console.log(`Sending document to Document AI (${name})...`);
        const [result] = await client.processDocument(request);
        const { document } = result;

        if (!document || !document.text) {
            console.warn('Document AI returned no text.');
            return '';
        }

        return document.text;
    } catch (error: any) {
        console.error('Document AI Error:', error);
        // Add more context if needed
        throw error;
    }
}
