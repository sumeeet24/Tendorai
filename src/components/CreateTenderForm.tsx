'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, Calendar, FileText, Loader2 } from 'lucide-react'

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

      // 3. Trigger Job
      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          type: 'PROCESS_TENDER',
          payload: {
            tender_id: tenderData.id,
            company_id: companyId,
            file_path: storageData.path
          }
        })

      if (jobError) throw jobError

      // 4. Redirect
      router.push(`/tenders/${tenderData.id}`)

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to create tender.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">New Tender Analysis</h2>
        <p className="mt-1 text-sm text-gray-500">Upload a tender PDF to start extracting requirements.</p>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="tenderName" className="block text-sm font-medium text-gray-700">Tender Name</label>
          <input
            type="text"
            id="tenderName"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            value={formData.tenderName}
            onChange={(e) => setFormData({ ...formData, tenderName: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="tenderId" className="block text-sm font-medium text-gray-700">Tender Ref ID</label>
          <input
            type="text"
            id="tenderId"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            value={formData.tenderId}
            onChange={(e) => setFormData({ ...formData, tenderId: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="openingDate" className="block text-sm font-medium text-gray-700">Opening Date</label>
          <div className="relative mt-1 rounded-md shadow-sm">
             <input
                type="datetime-local"
                id="openingDate"
                className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                value={formData.openingDate}
                onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
              />
          </div>
        </div>

        <div>
          <label htmlFor="closingDate" className="block text-sm font-medium text-gray-700">Closing Date</label>
           <div className="relative mt-1 rounded-md shadow-sm">
             <input
                type="datetime-local"
                id="closingDate"
                className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                value={formData.closingDate}
                onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
              />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Tender PDF Document</label>
          <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
            <div className="space-y-1 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                >
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF up to 50MB</p>
              {file && (
                  <p className="text-sm text-green-600 font-semibold">{file.name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
        >
          {loading ? (
            <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4"/>
                Analyzing...
            </>
          ) : (
            'Analyze Tender'
          )}
        </button>
      </div>
    </form>
  )
}
