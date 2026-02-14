'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, Loader2, Target, ArrowRight } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  companyId: string
  userId: string
}

export default function CreateTenderForm({ companyId, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    tenderName: '',
    tenderId: '',
    openingDate: '',
    closingDate: '',
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please upload a tender PDF.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // 1. Upload PDF
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { data: storageData, error: storageError } = await supabase.storage
        .from('tender-docs')
        .upload(fileName, file)

      if (storageError) throw storageError

      // 2. Create Tender Profile
      const { data: tenderData, error: tenderError } = await supabase
        .from('tender_profiles')
        .insert({
          company_id: companyId,
          tender_name: formData.tenderName,
          tender_id_ref: formData.tenderId,
          opening_date: formData.openingDate || null,
          closing_date: formData.closingDate || null,
          source_pdf_url: storageData.path,
          processed: false
        })
        .select()
        .single()

      if (tenderError) throw tenderError

      // 3. Trigger Processing via API
      const processRes = await fetch('/api/process-tender', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tender_id: tenderData.id,
          file_path: storageData.path
        })
      })

      if (!processRes.ok) {
        const errorData = await processRes.json()
        throw new Error(errorData.error || 'Processing failed')
      }

      // 4. Redirect
      router.push(`/tenders/${tenderData.id}`)

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to create tender.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Initiate Tender Analysis</h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Upload a tender PDF to start the AI-driven extraction and eligibility check process.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900/50 dark:ring-1 dark:ring-white/10">
        <div className="bg-indigo-600 px-6 py-4 dark:bg-indigo-900/20">
             <div className="flex items-center gap-2 text-white">
                 <Target className="h-5 w-5" />
                 <span className="font-semibold">Mission Details</span>
             </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Input Grid */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                {/* Tender Name */}
                <div className="relative">
                     <label htmlFor="tenderName" className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-indigo-600 dark:bg-zinc-900 dark:text-indigo-400">
                        Tender Name
                     </label>
                     <input
                        type="text"
                        id="tenderName"
                        required
                        className="block w-full rounded-md border-0 py-2.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-700 sm:text-sm sm:leading-6"
                        placeholder="e.g. Supply of IT Equipment"
                        value={formData.tenderName}
                        onChange={(e) => setFormData({ ...formData, tenderName: e.target.value })}
                     />
                </div>

                 {/* Tender ID */}
                <div className="relative">
                     <label htmlFor="tenderId" className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-indigo-600 dark:bg-zinc-900 dark:text-indigo-400">
                        Reference ID
                     </label>
                     <input
                        type="text"
                        id="tenderId"
                        required
                        className="block w-full rounded-md border-0 py-2.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-700 sm:text-sm sm:leading-6"
                        placeholder="e.g. GEM/2024/B/123456"
                        value={formData.tenderId}
                        onChange={(e) => setFormData({ ...formData, tenderId: e.target.value })}
                     />
                </div>

                {/* Dates */}
                <div className="relative">
                     <label htmlFor="openingDate" className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-indigo-600 dark:bg-zinc-900 dark:text-indigo-400">
                        Opening Date
                     </label>
                     <input
                        type="datetime-local"
                        id="openingDate"
                        className="block w-full rounded-md border-0 py-2.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-700 sm:text-sm sm:leading-6"
                        value={formData.openingDate}
                        onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                     />
                </div>

                 <div className="relative">
                     <label htmlFor="closingDate" className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-indigo-600 dark:bg-zinc-900 dark:text-indigo-400">
                        Closing Date
                     </label>
                     <input
                        type="datetime-local"
                        id="closingDate"
                        className="block w-full rounded-md border-0 py-2.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-700 sm:text-sm sm:leading-6"
                        value={formData.closingDate}
                        onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                     />
                </div>
            </div>

            {/* Drop Zone */}
            <div>
                 <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-50 mb-2">
                    Tender Document (PDF)
                 </label>
                 <div
                    className={clsx(
                        "relative mt-2 flex justify-center rounded-xl border border-dashed px-6 py-10 transition-colors",
                        file ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10" : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    )}
                 >
                    <div className="text-center">
                        {file ? (
                             <div className="flex flex-col items-center">
                                 <FileText className="h-12 w-12 text-indigo-600" />
                                 <div className="mt-4 flex text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                                     <span className="font-semibold text-indigo-600">{file.name}</span>
                                 </div>
                                 <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                 <button onClick={() => setFile(null)} type="button" className="mt-2 text-xs font-medium text-red-600 hover:text-red-500">Remove</button>
                             </div>
                        ) : (
                            <>
                                <Upload className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
                                <div className="mt-4 flex text-sm leading-6 text-zinc-600 dark:text-zinc-400 justify-center">
                                    <label
                                    htmlFor="file-upload"
                                    className="relative cursor-pointer rounded-md font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                                    >
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-500">PDF up to 50MB</p>
                            </>
                        )}
                    </div>
                 </div>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                <div className="flex">
                    <div className="flex-shrink-0">
                    <Loader2 className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Analysis Error</h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        <p>{error}</p>
                    </div>
                    </div>
                </div>
                </div>
            )}

            <div className="flex items-center justify-end gap-x-6 border-t border-zinc-900/10 pt-8 dark:border-white/10">
                <button type="button" className="text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-50" onClick={() => router.back()}>
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="group inline-flex items-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                         <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                         </>
                    ) : (
                         <>
                            Start Analysis
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                         </>
                    )}
                </button>
            </div>
        </form>
      </div>
    </div>
  )
}
