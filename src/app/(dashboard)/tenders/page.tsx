import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'

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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Tenders</h1>
        <Link
          href="/tenders/new"
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="-ml-1 mr-2 h-4 w-4" />
          New Tender
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {(!tenders || tenders.length === 0) && (
             <li className="px-6 py-4 text-center text-gray-500">
                 No tenders found. Create one to get started.
             </li>
          )}
          {tenders?.map((tender) => (
            <li key={tender.id}>
              <Link href={`/tenders/${tender.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-indigo-600">{tender.tender_name}</p>
                    <div className="ml-2 flex flex-shrink-0">
                      <p className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${tender.processed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {tender.processed ? 'Processed' : 'Processing'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <FileText className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                        {tender.tender_id_ref}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Closing: {tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
