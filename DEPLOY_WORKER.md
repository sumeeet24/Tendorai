# Document Processing Worker Deployment Guide

The Tendor AI platform relies on a background worker to process uploaded documents (Tenders and Company Docs). This worker handles:
1.  Uploading documents to Google Cloud Storage.
2.  Triggering Google Document AI Batch Processing.
3.  Extracting text and structured data using Gemini AI.
4.  Updating Supabase records.

**Crucial Note:** This worker is a **long-running Node.js process**. It is NOT a serverless function and is NOT automatically deployed by Vercel's default Next.js deployment. You must run it separately.

## Prerequisites

Ensure you have the following environment variables set in the environment where the worker runs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (Must be the Service Role key, NOT Anon key)
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_REGION`
- `DOCUMENT_AI_PROCESSOR_ID`
- `GEMINI_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (The full content of the Google Service Account JSON file) OR `GOOGLE_APPLICATION_CREDENTIALS` (Path to the file)

## How to Run

### Option 1: Local Development / VPS

1.  Ensure dependencies are installed:
    ```bash
    npm install
    ```
2.  Create a `.env` file with the required variables.
3.  Start the worker:
    ```bash
    npm run worker
    # OR using the helper script
    ./scripts/start-worker.sh
    ```
    Ideally, use a process manager like `pm2` to keep it running:
    ```bash
    npm install -g pm2
    pm2 start scripts/start-worker.sh --name "tendor-worker"
    ```

### Option 2: Railway / Render / Heroku (Worker Service)

1.  Connect your repository.
2.  Create a new Service.
3.  Set the **Start Command** to:
    ```bash
    npm run worker
    ```
4.  Add all environment variables in the platform's dashboard.

### Option 3: Docker

You can containerize the worker. Ensure the `CMD` runs `npm run worker`.

## Troubleshooting

-   **"Worker not processing jobs"**: Check if the worker process is actually running. On Vercel, it won't run. You need a separate provider.
-   **"Credentials missing"**: The worker logs its configuration on startup. Check the logs to see which key is missing.
-   **"Service Account Error"**: Ensure `GOOGLE_APPLICATION_CREDENTIALS_JSON` is exactly as provided, including newlines.
