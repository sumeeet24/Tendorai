'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FileUpload from '@/components/FileUpload'
import { Loader2, FileText, CheckCircle, XCircle, Clock, Building2, FileCheck } from 'lucide-react'
import { CompanyProfile, DocumentUpload } from '@/types'
import clsx from 'clsx'

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
      case 'completed':
        return <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Processed</span>
      case 'failed':
        return <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Failed</span>
      case 'processing':
        return (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing
          </span>
        )
      default:
        return <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Pending</span>
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Company Profile</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage your company details and documentation for AI analysis.
          </p>
        </div>
        <div className="flex items-center gap-x-3">
           <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
             <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-600" />
             Profile Active
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Info & Uploads */}
        <div className="lg:col-span-2 space-y-8">
           {/* Company Description Card */}
           <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-500" />
                    Company Overview
                 </h2>
              </div>
              <div className="relative">
                <textarea
                    rows={6}
                    className="block w-full rounded-lg border-0 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your company, core competencies, and expertise..."
                />
                <div className="absolute bottom-3 right-3">
                    <span className="text-xs text-gray-400">{description.length} chars</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                    onClick={handleSaveDescription}
                    disabled={saving}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all"
                >
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                        </>
                    ) : 'Save Changes'}
                </button>
              </div>
           </div>

           {/* Document Uploads Grid */}
           <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                 <FileCheck className="h-5 w-5 text-indigo-500" />
                 Required Documents
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FileUpload
                    label="Financial Documents"
                    description="Balance Sheets, P&L (Last 3 Years)"
                    documentType="financial"
                    companyId={profile.id}
                    ownerId={userId}
                    onUploadComplete={handleUploadComplete}
                />
                <FileUpload
                    label="Experience / Work Orders"
                    description="Proof of past projects & completions"
                    documentType="experience"
                    companyId={profile.id}
                    ownerId={userId}
                    onUploadComplete={handleUploadComplete}
                />
                <FileUpload
                    label="Certifications"
                    description="ISO, Startup India, MSME, etc."
                    documentType="certification"
                    companyId={profile.id}
                    ownerId={userId}
                    onUploadComplete={handleUploadComplete}
                />
                <FileUpload
                    label="OEM Authorizations"
                    description="Manufacturer authorization letters"
                    documentType="oem"
                    companyId={profile.id}
                    ownerId={userId}
                    onUploadComplete={handleUploadComplete}
                />
              </div>
           </div>
        </div>

        {/* Right Column: Uploaded Files List & Stats */}
        <div className="space-y-8">
           {/* Stats / Extracted Data Summary */}
           <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6 relative overflow-hidden">
               <div className="relative z-10">
                   <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                       <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                       Profile Intelligence
                   </h3>
                   <dl className="grid grid-cols-1 gap-4">
                       <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10">
                           <dt className="text-xs font-medium text-slate-400 uppercase tracking-wider">Turnover Entries</dt>
                           <dd className="mt-1 text-2xl font-bold tracking-tight">{profile.turnover?.length || 0}</dd>
                       </div>
                       <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10">
                           <dt className="text-xs font-medium text-slate-400 uppercase tracking-wider">Projects Detected</dt>
                           <dd className="mt-1 text-2xl font-bold tracking-tight">{profile.projects?.length || 0}</dd>
                       </div>
                   </dl>
               </div>
               {/* Decorative background */}
               <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-600 rounded-full blur-3xl opacity-20"></div>
               <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-600 rounded-full blur-3xl opacity-20"></div>
           </div>

           {/* Recent Uploads List */}
           <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="text-base font-semibold text-gray-900">Recent Uploads</h3>
                  <span className="text-xs text-gray-500">{uploads.length} files</span>
              </div>
              <ul className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {uploads.length === 0 && (
                      <li className="px-6 py-12 text-center">
                          <FileText className="mx-auto h-12 w-12 text-gray-300" />
                          <p className="mt-2 text-sm text-gray-500">No documents uploaded yet.</p>
                      </li>
                  )}
                  {uploads.map((doc) => (
                    <li key={doc.id} className="px-4 py-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                           <div className="flex-shrink-0">
                               <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                   <FileText className="h-5 w-5 text-indigo-600" />
                               </div>
                           </div>
                           <div className="min-w-0">
                               <p className="text-sm font-medium text-gray-900 truncate capitalize">
                                   {doc.document_type}
                               </p>
                               <p className="text-xs text-gray-500">
                                   {new Date(doc.uploaded_at).toLocaleDateString()}
                               </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {getStatusIcon(doc.processing_status)}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
           </div>
        </div>
      </div>
    </div>
  )
}
