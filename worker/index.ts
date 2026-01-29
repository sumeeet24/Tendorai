import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { processCompanyDoc, processTender } from './processors.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function worker() {
    console.log('Worker started...')
    while (true) {
        try {
            // Fetch pending job
            const { data: jobs, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('status', 'pending')
                .limit(1)

            if (error) {
                console.error('Error fetching jobs:', error)
                await new Promise(r => setTimeout(r, 5000))
                continue
            }

            if (!jobs || jobs.length === 0) {
                // Sleep
                await new Promise(r => setTimeout(r, 2000))
                continue
            }

            const job = jobs[0]
            console.log(`Picked up job: ${job.id} (${job.type})`)

            // Mark as processing
            await supabase.from('jobs').update({ status: 'processing', updated_at: new Date() }).eq('id', job.id)

            // Process
            try {
                if (job.type === 'PROCESS_COMPANY_DOC') {
                    await processCompanyDoc(job)
                } else if (job.type === 'PROCESS_TENDER') {
                    await processTender(job)
                } else {
                    console.warn(`Unknown job type: ${job.type}`)
                }

                // Mark completed
                await supabase.from('jobs').update({ status: 'completed', updated_at: new Date() }).eq('id', job.id)
                console.log(`Job completed: ${job.id}`)

            } catch (err: any) {
                console.error(`Job failed: ${job.id}`, err)
                await supabase.from('jobs').update({
                    status: 'failed',
                    error: err.message || JSON.stringify(err),
                    updated_at: new Date()
                }).eq('id', job.id)
            }

        } catch (err) {
            console.error('Worker loop error:', err)
            await new Promise(r => setTimeout(r, 5000))
        }
    }
}

worker()
