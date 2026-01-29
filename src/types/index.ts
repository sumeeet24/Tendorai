export interface CompanyProfile {
  id: string
  owner_id: string
  company_name: string
  description: string | null
  turnover: TurnoverItem[]
  projects: ProjectItem[]
  certifications: CertificationItem[]
  oem_authorizations: any[]
  created_at: string
  updated_at: string
}

export interface TurnoverItem {
  year: string
  amount: string
  source_doc?: string
  page_number?: number
}

export interface ProjectItem {
  name: string
  value: string
  year: string
  client: string
  source_doc?: string
  page_number?: number
}

export interface CertificationItem {
  name: string
  issuer: string
  validity: string
  source_doc?: string
  page_number?: number
}

export interface DocumentUpload {
  id: string
  company_id: string
  document_type: 'financial' | 'certification' | 'experience' | 'oem' | 'other'
  file_url: string
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  extracted_data: any
  uploaded_at: string
}

export interface Job {
  id: string
  type: 'PROCESS_COMPANY_DOC' | 'PROCESS_TENDER'
  payload: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  error?: string
}
