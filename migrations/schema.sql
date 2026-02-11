-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Company Profile Table
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    company_name TEXT,
    description TEXT,
    turnover JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    oem_authorizations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tender Profile Table
CREATE TABLE IF NOT EXISTS tender_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE NOT NULL,
    tender_name TEXT,
    tender_id_ref TEXT, -- renamed to avoid conflict with tender_id (pk) if any, but logic says tender_id
    opening_date TIMESTAMPTZ,
    closing_date TIMESTAMPTZ,
    source_pdf_url TEXT,
    clauses JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eligibility Result Table
CREATE TABLE IF NOT EXISTS eligibility_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID REFERENCES tender_profiles(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('ELIGIBLE', 'NOT_ELIGIBLE', 'PARTIAL', 'PENDING')),
    failed_clauses JSONB DEFAULT '[]'::jsonb,
    confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Uploads Table
CREATE TABLE IF NOT EXISTS document_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT CHECK (document_type IN ('financial', 'certification', 'experience', 'oem', 'other')),
    file_url TEXT NOT NULL,
    processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    extracted_data JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs Table for Worker
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    error TEXT
);

-- RLS Policies
-- Enable RLS on all tables
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
-- Jobs table is for worker, but maybe users trigger them.
-- Worker uses Service Key (bypasses RLS). Users might read jobs? No.
-- Keep jobs RLS disabled or allow insert.
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Company Profile: Users can view/edit their own profile
CREATE POLICY "Users can view own profile" ON company_profiles
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update own profile" ON company_profiles
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own profile" ON company_profiles
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Tender Profile: Users can view/edit tenders for their company
CREATE POLICY "Users can view own tenders" ON tender_profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM company_profiles WHERE id = tender_profiles.company_id AND owner_id = auth.uid())
    );

CREATE POLICY "Users can insert own tenders" ON tender_profiles
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM company_profiles WHERE id = tender_profiles.company_id AND owner_id = auth.uid())
    );

-- Eligibility Results
CREATE POLICY "Users can view own eligibility" ON eligibility_results
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM company_profiles WHERE id = eligibility_results.company_id AND owner_id = auth.uid())
    );

-- Document Uploads
CREATE POLICY "Users can view own documents" ON document_uploads
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM company_profiles WHERE id = document_uploads.company_id AND owner_id = auth.uid())
    );

CREATE POLICY "Users can insert own documents" ON document_uploads
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM company_profiles WHERE id = document_uploads.company_id AND owner_id = auth.uid())
    );

-- Jobs: Users can insert jobs (e.g. via API) but worker processes them.
-- Actually, the API will likely use Service Role or the user will insert?
-- If user inserts, they need permission.
CREATE POLICY "Users can insert jobs" ON jobs
    FOR INSERT WITH CHECK (true); -- Ideally restrict payload content but for now OK.

-- Migration: Add OCR and Summary columns
ALTER TABLE tender_profiles ADD COLUMN IF NOT EXISTS ocr_text TEXT;
ALTER TABLE tender_profiles ADD COLUMN IF NOT EXISTS summary TEXT;
