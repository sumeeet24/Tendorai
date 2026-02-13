import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Plus, Calendar, ArrowRight, Loader2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import clsx from 'clsx'

export default async function TendersListPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('company_profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/company')

  const { data: tenders } = await supabase
    .from('tender_profiles')
    .select('*')
    .eq('company_id', profile.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Header with Search and Action */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                <p className="mt-2 text-lg text-gray-600">
                    Your active tender analysis projects.
                </p>
            </div>
            <Link
                href="/tenders/new"
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                New Analysis
            </Link>
        </div>

        {/* Tenders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenders?.map((tender) => (
                <div key={tender.id} className="group relative bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex items-center justify-between mb-4">
                             <span className={clsx(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                                tender.processed
                                    ? "bg-green-50 text-green-700 ring-green-600/20"
                                    : "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
                             )}>
                                {tender.processed ? (
                                    'Processed'
                                ) : (
                                    <span className="flex items-center">
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing
                                    </span>
                                )}
                             </span>
                             <span className="text-xs text-gray-400">
                                {new Date(tender.created_at).toLocaleDateString()}
                             </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[3.5rem]">
                            <Link href={`/tenders/${tender.id}`}>
                                <span className="absolute inset-0" />
                                {tender.tender_name}
                            </Link>
                        </h3>
                        <div className="mt-4 flex items-center text-sm text-gray-500">
                            <FileText className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="truncate">{tender.tender_id_ref}</span>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                            <Calendar className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span>
                                Closing: {tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between group-hover:bg-indigo-50/50 transition-colors">
                        <span className="text-sm font-medium text-indigo-600 group-hover:text-indigo-700">View Analysis</span>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                </div>
            ))}

            {(!tenders || tenders.length === 0) && (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <FileText className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No tenders found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new tender analysis.</p>
                    <div className="mt-6">
                        <Link
                            href="/tenders/new"
                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                        >
                            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                            New Tender
                        </Link>
                    </div>
                </div>
            )}
        </div>
    </div>
  )
}
