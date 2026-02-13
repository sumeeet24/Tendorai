'use client'

import { useState } from 'react'
import { Upload, X, Check, AlertCircle, Loader2, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

interface FileUploadProps {
  label: string
  documentType: 'financial' | 'certification' | 'experience' | 'oem' | 'other'
  onUploadComplete: (data?: { documentId: string, fileUrl: string }) => void
  companyId: string | null
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
    <div className={clsx(
        "relative rounded-xl border border-dashed p-4 transition-all duration-200",
        status === 'error' ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/10" :
        status === 'success' ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10" :
        "border-zinc-300 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-indigo-500 dark:hover:bg-zinc-900"
    )}>
      <div className="flex items-start justify-between gap-4">
         <div className="flex-1 min-w-0">
             <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate" title={label}>{label}</h3>

             {status === 'idle' && (
                 <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">PDF, max 10MB</p>
             )}

             {status === 'uploading' && (
                 <div className="mt-2 flex items-center text-xs text-indigo-600 dark:text-indigo-400">
                     <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                     Uploading...
                 </div>
             )}

             {status === 'success' && (
                 <div className="mt-2 flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                     <Check className="mr-1 h-3 w-3" />
                     Uploaded
                     <button onClick={() => setStatus('idle')} className="ml-3 underline hover:text-emerald-700">Replace</button>
                 </div>
             )}

             {status === 'error' && (
                 <div className="mt-2 flex items-center text-xs text-red-600 dark:text-red-400">
                     <AlertCircle className="mr-1 h-3 w-3" />
                     {errorMessage}
                     <button onClick={() => setStatus('idle')} className="ml-2 underline">Retry</button>
                 </div>
             )}
         </div>

         {/* Action Area */}
         <div className="flex-shrink-0">
             {status === 'idle' || status === 'error' ? (
                 <div className="relative group">
                     <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={status === 'uploading'}
                     />
                     <div className={clsx(
                         "flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-colors",
                         file ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-zinc-200 text-zinc-400 group-hover:border-indigo-400 group-hover:text-indigo-500 dark:bg-zinc-800 dark:border-zinc-700 dark:group-hover:border-indigo-500"
                     )}>
                         <Upload className="h-4 w-4" />
                     </div>
                 </div>
             ) : (
                 <div className={clsx(
                     "flex h-8 w-8 items-center justify-center rounded-lg border",
                     status === 'success' ? "border-emerald-200 bg-emerald-100 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900 dark:text-emerald-400" :
                     "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
                 )}>
                    {status === 'success' ? <FileText className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                 </div>
             )}
         </div>
      </div>

      {/* File Confirmation Overlay/Action */}
      {file && status === 'idle' && (
          <div className="mt-3 flex items-center justify-between rounded-md bg-white p-2 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700 animate-in fade-in zoom-in-95 duration-200">
              <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300 max-w-[150px]">{file.name}</span>
              <button
                onClick={handleUpload}
                className="ml-2 rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                  Upload
              </button>
          </div>
      )}
    </div>
  )
}
