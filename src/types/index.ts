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

// --- New Types ---

export interface TenderProfile {
  id: string
  company_id: string
  tender_name: string | null
  tender_id_ref: string | null
  opening_date: string | null
  closing_date: string | null
  source_pdf_url: string | null
  clauses: any[]
  metadata: TenderMetadata
  processed: boolean
  created_at: string
}

export interface TenderMetadata {
  extracted_text?: string
  summary?: string
  sections?: Record<string, Section> // Key is section title or ID
  required_documents?: RequiredDocument[]
  eligibility_result?: EligibilityResult | null // Optional here as it might be stored in metadata too
  risk_analysis?: any // Deprecated or kept for backward compat
  risks?: RiskItem[] // New from spec
  drafts?: Record<string, Draft> // requirement_name -> Draft
  uploads?: Record<string, UploadLink> // requirement_name -> UploadLink
}

export interface Section {
  title: string
  content: string
  page_numbers: number[]
  risk_level?: 'low' | 'medium' | 'high'
  compliance_status?: 'compliant' | 'non_compliant' | 'review_needed'
}

export interface RequiredDocument {
  name: string
  description?: string
  type?: string // 'financial', 'technical', etc.
  mandatory?: boolean
  raw_clause?: string
}

export interface EligibilityResult {
  id?: string // If from table
  tender_id?: string
  company_id?: string
  status?: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PARTIAL' | 'PENDING'

  // New structure
  eligible?: boolean
  matched_requirements?: MatchedRequirement[]
  failed_requirements?: any[]
  unknown_requirements?: any[]
  confidence: string | number // "low"|"medium"|"high" or number

  // Legacy
  failed_clauses?: FailedClause[]

  created_at?: string
}

export interface MatchedRequirement {
  requirement: string
  evidence_from_company: string
  evidence_from_tender: string
}

export interface RiskItem {
  risk_type: string
  clause: string
  severity: 'low' | 'medium' | 'high'
}

export interface FailedClause {
  clause_id: string
  reason: string
  text: string
}

export interface Draft {
  title: string
  content: string // HTML or Markdown
  created_at: string
}

export interface UploadLink {
  document_id: string
  file_url: string
  uploaded_at: string
}
