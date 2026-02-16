'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UploadCloud, Calendar, FileText, Loader2, AlertCircle, ArrowRight, Hash } from 'lucide-react'
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
  const [dragActive, setDragActive] = useState(false)

  const [formData, setFormData] = useState({
    tenderName: '',
    tenderId: '',
    openingDate: '',
    closingDate: '',
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile.type === 'application/pdf') {
             setFile(droppedFile)
        } else {
             setError('Only PDF files are supported')
        }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
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
    <div className="max-w-2xl mx-auto py-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                    New Tender Analysis
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Upload a tender PDF to automatically extract requirements and scope.
                </p>
            </div>
        </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
         <form onSubmit={handleSubmit} className="px-4 py-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label htmlFor="tenderName" className="block text-sm font-medium leading-6 text-gray-900">
                    Tender Name / Title
                  </label>
                  <div className="mt-2 relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <FileText className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      id="tenderName"
                      required
                      className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pink-600 sm:text-sm sm:leading-6"
                      placeholder="e.g. Construction of New Highway Bridge"
                      value={formData.tenderName}
                      onChange={(e) => setFormData({ ...formData, tenderName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="tenderId" className="block text-sm font-medium leading-6 text-gray-900">
                    Reference ID
                  </label>
                  <div className="mt-2 relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Hash className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      id="tenderId"
                      required
                      className="block w-full rounded-md border-0 py-1.5 pl-9 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pink-600 sm:text-sm sm:leading-6"
                      placeholder="T-2024-001"
                      value={formData.tenderId}
                      onChange={(e) => setFormData({ ...formData, tenderId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="openingDate" className="block text-sm font-medium leading-6 text-gray-900">
                    Opening Date
                  </label>
                  <div className="mt-2 relative rounded-md shadow-sm">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                     </div>
                     <input
                        type="datetime-local"
                        id="openingDate"
                        className="block w-full rounded-md border-0 py-1.5 pl-9 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pink-600 sm:text-sm sm:leading-6"
                        value={formData.openingDate}
                        onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                      />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="closingDate" className="block text-sm font-medium leading-6 text-gray-900">
                    Closing Date
                  </label>
                   <div className="mt-2 relative rounded-md shadow-sm">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                     </div>
                     <input
                        type="datetime-local"
                        id="closingDate"
                        className="block w-full rounded-md border-0 py-1.5 pl-9 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pink-600 sm:text-sm sm:leading-6"
                        value={formData.closingDate}
                        onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                      />
                  </div>
                </div>

                <div className="col-span-full">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                        Tender Document (PDF)
                    </label>
                    <div
                        className={clsx(
                            "mt-2 flex justify-center rounded-lg border border-dashed px-6 py-10 transition-colors",
                            dragActive ? "border-pink-500 bg-pink-50" : "border-gray-900/25 hover:bg-gray-50"
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="text-center">
                            {file ? (
                                <div className="flex flex-col items-center">
                                    <FileText className="mx-auto h-12 w-12 text-pink-600" aria-hidden="true" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                        <span className="font-semibold text-pink-600 hover:text-pink-500">
                                            {file.name}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFile(null)}
                                        className="mt-2 text-xs font-semibold text-red-600 hover:text-red-500"
                                    >
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                                        <label
                                            htmlFor="file-upload"
                                            className="relative cursor-pointer rounded-md bg-white font-semibold text-pink-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-pink-600 focus-within:ring-offset-2 hover:text-pink-500"
                                        >
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-600">PDF up to 50MB</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
            )}

            <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 pt-4">
                <button
                    type="button"
                    className="text-sm font-semibold leading-6 text-gray-900"
                    onClick={() => router.back()}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Analyzing Tender...
                        </>
                    ) : (
                        <>
                            Start Analysis <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </button>
            </div>
         </form>
      </div>
    </div>
  )
}
