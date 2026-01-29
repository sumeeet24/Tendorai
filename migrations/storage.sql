-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-docs', 'company-docs', false, null, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tender-docs', 'tender-docs', false, null, null)
ON CONFLICT (id) DO NOTHING;

-- Policies for company-docs
CREATE POLICY "Users can upload company docs" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'company-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
-- We'll use folder structure: company-docs/{user_id}/{filename}

CREATE POLICY "Users can view company docs" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'company-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policies for tender-docs
CREATE POLICY "Users can upload tender docs" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'tender-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view tender docs" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'tender-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
