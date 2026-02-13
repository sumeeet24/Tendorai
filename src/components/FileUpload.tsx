'use client'

import { useState } from 'react'
import { UploadCloud, CheckCircle, AlertCircle, Loader2, FileText, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

interface FileUploadProps {
  label: string
  description?: string
  documentType: string
  onUploadComplete: (data?: { documentId: string, fileUrl: string }) => void
  companyId: string
  ownerId: string
}

export default function FileUpload({ label, description, documentType, onUploadComplete, ownerId, companyId }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const supabase = createClient()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        setStatus('idle')
        setErrorMessage(null)
      } else {
        setErrorMessage('Only PDF files are allowed.')
        setStatus('error')
      }
    }
  }

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
         console.warn('Processing trigger failed', await processRes.text())
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
    <div
      className={clsx(
        'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors duration-200 ease-in-out bg-white',
        isDragOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50',
        status === 'error' && 'border-red-300 bg-red-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center w-full">
        {status === 'success' ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
            <p className="text-sm font-medium text-green-700">Uploaded successfully</p>
            <button
              onClick={() => setStatus('idle')}
              className="text-xs text-slate-500 hover:text-indigo-600 underline mt-2"
            >
              Upload another file
            </button>
          </div>
        ) : status === 'uploading' ? (
          <div className="flex flex-col items-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm text-slate-600">Uploading & Processing...</p>
          </div>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
              <UploadCloud className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            </div>

            <div className="mt-4 flex flex-col items-center text-sm leading-6 text-slate-600">
              <label
                htmlFor={`file-upload-${documentType}`}
                className="relative cursor-pointer rounded-md font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
              >
                <span>Upload a file</span>
                <input
                  id={`file-upload-${documentType}`}
                  name={`file-upload-${documentType}`}
                  type="file"
                  className="sr-only"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1 text-slate-500">or drag and drop</p>
              <p className="text-xs text-slate-400 mt-1">PDF up to 10MB</p>
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">{label}</div>
            {description && <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">{description}</p>}
          </>
        )}
      </div>

      {file && status === 'idle' && (
        <div className="mt-4 w-full bg-slate-50 rounded-lg p-3 border border-slate-200 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700 truncate">{file.name}</span>
             </div>
             <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X className="h-4 w-4" />
             </button>
          </div>
          <button
            onClick={handleUpload}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
          >
            Start Upload
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 flex items-center text-sm text-red-600 bg-red-50 p-2 rounded w-full justify-center">
          <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}
    </div>
  )
}
