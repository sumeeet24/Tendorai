'use client'

import { useState } from 'react'
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FileUploadProps {
  label: string
  documentType: 'financial' | 'certification' | 'experience' | 'oem' | 'other'
  onUploadComplete: (data?: { documentId: string, fileUrl: string }) => void
  companyId: string | null // Actually, we can get user ID from auth, but companyId is usually user ID here.
  ownerId: string
}

export default function FileUpload({ label, documentType, onUploadComplete, ownerId, companyId }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setStatus('idle')
      setErrorMessage(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !ownerId) return

    setStatus('uploading')
    setErrorMessage(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${ownerId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // 1. Upload to Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('company-docs')
        .upload(fileName, file)

      if (storageError) throw storageError

      // 2. Insert into document_uploads
      // Get public URL? Or private. Usually signed URL needed for private buckets.
      // But user owns it, so they can access.
      // We store the path or key.
      const filePath = storageData.path

      const { data: docData, error: docError } = await supabase
        .from('document_uploads')
        .insert({
          company_id: companyId,
          document_type: documentType,
          file_url: filePath,
          processing_status: 'pending'
        })
        .select()
        .single()

      if (docError) throw docError

      // 3. Trigger Processing via API
      const processRes = await fetch('/api/process-company-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_id: docData.id,
          company_id: companyId,
          owner_id: ownerId,
          file_path: filePath,
          document_type: documentType
        })
      })

      if (!processRes.ok) {
        const errorData = await processRes.json()
        throw new Error(errorData.error || 'Processing failed')
      }

      setStatus('success')
      setFile(null)
      onUploadComplete({ documentId: docData.id, fileUrl: filePath })

    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setErrorMessage(err.message || 'Upload failed')
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">{label}</h3>
        {status === 'success' && <Check className="h-5 w-5 text-green-500" />}
      </div>

      <div className="mt-4">
        {status === 'idle' || status === 'error' ? (
           <div className="flex gap-2">
             <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {file && (
                <button
                    onClick={handleUpload}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    Upload
                </button>
            )}
           </div>
        ) : status === 'uploading' ? (
          <div className="flex items-center text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading & Processing...
          </div>
        ) : (
             <div className="flex items-center text-sm text-green-600">
                 File uploaded successfully. Processing started.
                 <button onClick={() => setStatus('idle')} className="ml-4 text-xs underline text-gray-500">Upload another</button>
             </div>
        )}

        {status === 'error' && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <AlertCircle className="mr-2 h-4 w-4" />
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  )
}
