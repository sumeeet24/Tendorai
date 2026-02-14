'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FileUpload from '@/components/FileUpload'
import { Loader2, FileText, CheckCircle, XCircle, Clock, Building2, TrendingUp, Award, Briefcase } from 'lucide-react'
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
      case 'completed': return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default: return <Clock className="h-4 w-4 text-zinc-400" />
    }
  }

  const stats = [
    { name: 'Turnover Entries', value: profile.turnover?.length || 0, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Projects', value: profile.projects?.length || 0, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Certifications', value: profile.certifications?.length || 0, icon: Award, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Company Profile</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your company's data and documents for automated tender analysis.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <Building2 className="h-4 w-4 text-indigo-500" />
          <span className="font-medium text-zinc-700 dark:text-zinc-200">{profile.company_name || 'Your Company'}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.name} className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center">
              <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", stat.bg)}>
                <stat.icon className={clsx("h-6 w-6", stat.color)} aria-hidden="true" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.name}</dt>
                  <dd>
                    <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Description Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">Company Description</label>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          This description is used by the AI to match your company's expertise with tender requirements.
        </p>
        <div>
            <textarea
              rows={4}
              className="block w-full rounded-lg border-0 bg-zinc-50 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-800 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your company, core competencies, and expertise..."
            />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveDescription}
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Description'}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Uploads */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Upload Documents</h2>
          <div className="grid gap-6">
            <FileUpload
              label="Financial Documents (Balance Sheets, P&L)"
              documentType="financial"
              companyId={profile.id}
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
        </div>

        {/* Right: Files List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Document Library</h2>
              <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                  {uploads.length} Files
              </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {uploads.length === 0 && (
                  <li className="px-6 py-12 text-center">
                      <FileText className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                      <p className="mt-2 text-sm text-zinc-500">No documents uploaded yet.</p>
                  </li>
              )}
              {uploads.map((doc) => (
                <li key={doc.id} className="group flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-4 truncate">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="truncate">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50 capitalize">{doc.document_type.replace('_', ' ')}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize",
                        doc.processing_status === 'completed' ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20" :
                        doc.processing_status === 'failed' ? "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20" :
                        "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20"
                    )}>
                        {doc.processing_status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
             <div className="flex items-center gap-2 mb-2">
                 <ActivityIcon className="h-4 w-4 text-indigo-500" />
                 <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Data Extraction Preview</h3>
             </div>
             <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                 <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                     <span>Turnover Entries</span>
                     <span className="font-medium text-zinc-900 dark:text-zinc-200">{profile.turnover?.length || 0}</span>
                 </div>
                 <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                     <span>Projects</span>
                     <span className="font-medium text-zinc-900 dark:text-zinc-200">{profile.projects?.length || 0}</span>
                 </div>
                 <div className="flex justify-between">
                     <span>Certifications</span>
                     <span className="font-medium text-zinc-900 dark:text-zinc-200">{profile.certifications?.length || 0}</span>
                 </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    )
}
