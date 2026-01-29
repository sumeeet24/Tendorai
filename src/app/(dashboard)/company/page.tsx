import { createClient } from '@/lib/supabase/server'
import CompanyProfileClient from '@/components/CompanyProfileClient'
import { redirect } from 'next/navigation'

export default async function CompanyPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch Profile
  let { data: profile } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  // Defensive: Create if not exists (handling edge case of signup failure or manual user creation)
  if (!profile) {
      const { data: newProfile, error } = await supabase
        .from('company_profiles')
        .insert({
            owner_id: user.id,
            company_name: user.email?.split('@')[0] || 'My Company',
        })
        .select()
        .single()

      if (error) {
          console.error('Failed to create profile', error)
          // Handle error gracefully or throw
          return <div>Error loading profile. Please contact support.</div>
      }
      profile = newProfile
  }

  // Fetch Uploads
  const { data: uploads } = await supabase
    .from('document_uploads')
    .select('*')
    .eq('company_id', profile.id) // Assuming company_id refers to profile ID.
    // Wait, in schema: company_id UUID REFERENCES company_profiles(id)
    // So yes, I use profile.id.
    // BUT in FileUpload.tsx I used ownerId (user.id) as company_id?
    // Let's check FileUpload.tsx.
    // "company_id: ownerId"
    // If company_id references company_profiles(id), then ownerId (auth.uid) IS NOT profile.id usually, unless I set profile.id = auth.uid.
    // In migration: "id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), owner_id UUID ..."
    // So profile.id != user.id.
    // I MUST fix FileUpload.tsx to use profile.id.
    .order('uploaded_at', { ascending: false })

  return (
    <CompanyProfileClient
        profile={profile}
        uploads={uploads || []}
        userId={user.id}
    />
  )
}
