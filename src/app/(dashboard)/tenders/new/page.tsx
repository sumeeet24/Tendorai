import { createClient } from '@/lib/supabase/server'
import CreateTenderForm from '@/components/CreateTenderForm'
import { redirect } from 'next/navigation'

export default async function NewTenderPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch Profile ID
  const { data: profile } = await supabase
    .from('company_profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) {
      // If profile doesn't exist, redirect to company setup or create it?
      // Redirect to company page is safer to force setup.
      redirect('/company')
  }

  return (
    <div className="max-w-3xl mx-auto">
        <CreateTenderForm companyId={profile.id} userId={user.id} />
    </div>
  )
}
