'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FileUpload from '@/components/FileUpload'
import { Loader2, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import { CompanyProfile, DocumentUpload } from '@/types'

interface Props {
  profile: CompanyProfile
  uploads: DocumentUpload[]
  userId: string
}

export default function CompanyProfileClient({ profile, uploads, userId }: Props) {
  const [description, setDescription] = useState(profile.description || '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSaveDescription = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('company_profiles')
      .update({ description })
      .eq('id', profile.id)

    setSaving(false)
    if (!error) {
      router.refresh()
    }
  }

  const handleUploadComplete = () => {
    router.refresh()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your documents to automatically extract profile information.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <label className="block text-sm font-medium text-gray-700">Company Description</label>
        <textarea
          rows={4}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your company, core competencies, and expertise..."
        />
        <div className="flex justify-end">
          <button
            onClick={handleSaveDescription}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400"
          >
            {saving ? 'Saving...' : 'Save Description'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900">Upload Documents</h2>

          <FileUpload
            label="Financial Documents (Balance Sheets, P&L)"
            documentType="financial"
            companyId={profile.id} // Or userId if that's what we use for ID
            ownerId={userId}
            onUploadComplete={handleUploadComplete}
          />

          <FileUpload
            label="Past Experience / Work Orders"
            documentType="experience"
            companyId={profile.id}
            ownerId={userId}
            onUploadComplete={handleUploadComplete}
          />

          <FileUpload
            label="Certifications (ISO, Startup India, etc)"
            documentType="certification"
            companyId={profile.id}
            ownerId={userId}
            onUploadComplete={handleUploadComplete}
          />

           <FileUpload
            label="OEM Authorizations"
            documentType="oem"
            companyId={profile.id}
            ownerId={userId}
            onUploadComplete={handleUploadComplete}
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900">Uploaded Files</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {uploads.length === 0 && (
                  <li className="px-4 py-4 text-sm text-gray-500 text-center">No documents uploaded yet.</li>
              )}
              {uploads.map((doc) => (
                <li key={doc.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center truncate">
                    <FileText className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-medium text-indigo-600 truncate">{doc.document_type}</p>
                      <p className="text-xs text-gray-500">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2 capitalize">{doc.processing_status}</span>
                    {getStatusIcon(doc.processing_status)}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
             <h3 className="text-sm font-medium text-gray-900 mb-2">Extracted Data Preview</h3>
             <div className="space-y-2 text-xs text-gray-600">
                 <p>Turnover entries: {profile.turnover?.length || 0}</p>
                 <p>Projects: {profile.projects?.length || 0}</p>
                 <p>Certifications: {profile.certifications?.length || 0}</p>
                 {/* Can expand to show list if needed */}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
