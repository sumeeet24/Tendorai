import { useState } from 'react'
import { TenderProfile, RequiredDocument, UploadLink, Draft, TenderMetadata } from '@/types'
import FileUpload from '@/components/FileUpload'
import { FileText, CheckCircle, AlertCircle, Loader2, Download, Upload as UploadIcon, X, Edit, Eye } from 'lucide-react'

interface RequiredDocumentsTabProps {
  tender: TenderProfile
  companyId: string
  userId: string
  onUpdateMetadata: (updates: Partial<TenderMetadata>) => Promise<void>
}

export default function RequiredDocumentsTab({ tender, companyId, userId, onUpdateMetadata }: RequiredDocumentsTabProps) {
  const metadata = (tender.metadata || {}) as TenderMetadata
  const requiredDocs = metadata.required_documents || []
  const uploads = metadata.uploads || {}
  const drafts = metadata.drafts || {}

  const [generatingDraft, setGeneratingDraft] = useState<string | null>(null)
  const [viewingDraft, setViewingDraft] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null) // Name of doc being uploaded

  const handleUploadComplete = async (docName: string, data?: { documentId: string, fileUrl: string }) => {
    if (!data) return
    const newUploads = {
      ...uploads,
      [docName]: {
        document_id: data.documentId,
        file_url: data.fileUrl,
        uploaded_at: new Date().toISOString()
      }
    }
    await onUpdateMetadata({ uploads: newUploads })
    setUploadingDoc(null)
  }

  const handleGenerateDraft = async (doc: RequiredDocument) => {
    const docName = doc.name
    setGeneratingDraft(docName)
    try {
      // Pass the document name AND raw clause
      const response = await fetch('/api/generate-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tenderId: tender.id,
            type: 'technical',
            requirement: docName,
            rawClause: doc.raw_clause // New field
        })
      })

      if (!response.ok) throw new Error('Failed to generate draft')

      const result = await response.json()

      const newDrafts = {
        ...drafts,
        [docName]: {
          title: result.title || docName,
          content: result.content || "Draft content generated.",
          created_at: new Date().toISOString()
        }
      }
      await onUpdateMetadata({ drafts: newDrafts })

    } catch (error) {
      console.error("Draft generation failed", error)
      alert("Failed to generate draft. Please try again.")
    } finally {
      setGeneratingDraft(null)
    }
  }

  const getStatus = (docName: string) => {
    if (uploads[docName]) return { label: 'Uploaded', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle }
    if (drafts[docName]) return { label: 'Draft Ready', color: 'text-blue-600', bg: 'bg-blue-50', icon: FileText }
    return { label: 'Missing', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle }
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Required Documents</h2>
        <span className="text-sm text-gray-500">{requiredDocs.length} items identified</span>
      </div>

      <div className="grid gap-4">
        {requiredDocs.map((doc, idx) => {
          const status = getStatus(doc.name)
          const StatusIcon = status.icon
          const isUploaded = !!uploads[doc.name]
          const isDrafted = !!drafts[doc.name]

          return (
            <div key={idx} className={`border rounded-lg p-4 bg-white shadow-sm transition-all hover:shadow-md ${status.bg.replace('bg-', 'border-').replace('50', '200')}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-5 h-5 ${status.color}`} />
                    <h3 className="font-medium text-gray-900">{doc.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{doc.description || "No description available."}</p>
                  {doc.raw_clause && (
                      <p className="text-xs text-gray-400 mt-1 italic line-clamp-2" title={doc.raw_clause}>"{doc.raw_clause}"</p>
                  )}

                  {/* Status Details */}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    {isUploaded && (
                        <div className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded">
                            <CheckCircle className="w-3 h-3"/>
                            Uploaded on {new Date(uploads[doc.name].uploaded_at).toLocaleDateString()}
                        </div>
                    )}
                    {isDrafted && (
                        <div className="flex items-center gap-1 text-blue-700 bg-blue-100 px-2 py-1 rounded">
                            <FileText className="w-3 h-3"/>
                            Draft generated on {new Date(drafts[doc.name].created_at).toLocaleDateString()}
                        </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[140px]">
                    {!isUploaded && (
                        <button
                            onClick={() => setUploadingDoc(doc.name)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors"
                        >
                            <UploadIcon className="w-4 h-4"/> Upload
                        </button>
                    )}

                    {!isUploaded && !isDrafted && (
                        <button
                            onClick={() => handleGenerateDraft(doc)}
                            disabled={generatingDraft === doc.name}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {generatingDraft === doc.name ? <Loader2 className="w-4 h-4 animate-spin"/> : <Edit className="w-4 h-4"/>}
                            Generate Draft
                        </button>
                    )}

                    {isDrafted && (
                        <button
                            onClick={() => setViewingDraft(doc.name)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium transition-colors"
                        >
                            <Eye className="w-4 h-4"/> Preview Draft
                        </button>
                    )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Upload Modal */}
      {uploadingDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative">
                  <button
                    onClick={() => setUploadingDoc(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                      <X className="w-6 h-6"/>
                  </button>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Document</h3>
                  <p className="text-sm text-gray-500 mb-6">
                      Upload <strong>{uploadingDoc}</strong>. Accepted formats: PDF.
                  </p>
                  <FileUpload
                    label={`Select file for ${uploadingDoc}`}
                    documentType="other"
                    onUploadComplete={(data) => handleUploadComplete(uploadingDoc, data)}
                    ownerId={userId}
                    companyId={companyId}
                  />
              </div>
          </div>
      )}

      {/* Draft Preview Modal */}
      {viewingDraft && drafts[viewingDraft] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-900">Draft Preview: {viewingDraft}</h3>
                    <button onClick={() => setViewingDraft(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 p-4 rounded border font-mono text-sm whitespace-pre-wrap">
                    {drafts[viewingDraft].content}
                </div>
                <div className="mt-4 flex justify-end gap-3 pt-2 border-t">
                    <button
                        onClick={() => setViewingDraft(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Close
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center gap-2">
                        <Download className="w-4 h-4"/> Download .docx
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
