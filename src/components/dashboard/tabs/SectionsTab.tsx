import { useState, useMemo } from 'react'
import { TenderProfile, Section, TenderMetadata } from '@/types'
import { ChevronDown, ChevronRight, FileText, AlertTriangle, CheckCircle, Search, Info, Loader2 } from 'lucide-react'

interface SectionsTabProps {
  tender: TenderProfile
  onSectionSelect: (sectionKey: string | null) => void
  selectedSectionKey: string | null
}

export default function SectionsTab({ tender, onSectionSelect, selectedSectionKey }: SectionsTabProps) {
  const metadata = (tender.metadata || {}) as TenderMetadata
  const sections = metadata.sections

  const [searchTerm, setSearchTerm] = useState('')

  // Convert sections object to array for easier rendering
  const sectionList = useMemo(() => {
    if (!sections) return []
    return Object.entries(sections).map(([key, section]) => {
      // Handle potentially null/undefined section or properties
      if (!section) {
          return {
              key,
              title: key,
              content: '',
              page_numbers: [],
              risk_level: undefined,
              compliance_status: undefined
          }
      }
      return {
          key,
          ...section,
          title: section.title || key,
          content: section.content || '',
          page_numbers: section.page_numbers || []
      }
    }).sort((a, b) => {
        // Try to sort by section number/title logic if possible, otherwise alphabetical
        // Assuming key might be "1. Introduction" etc.
        const titleA = a.title || ''
        const titleB = b.title || ''
        return titleA.localeCompare(titleB, undefined, { numeric: true })
    })
  }, [sections])

  const filteredSections = useMemo(() => {
    if (!searchTerm) return sectionList
    return sectionList.filter(s =>
        (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.content || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [sectionList, searchTerm])

  // Guard Clause as per requirements
  if (!sections || Object.keys(sections).length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-600"/>
              <p>Analyzing Sections...</p>
          </div>
      )
  }

  const handleToggle = (key: string) => {
    if (selectedSectionKey === key) {
      onSectionSelect(null)
    } else {
      onSectionSelect(key)
    }
  }

  const getComplianceIcon = (status?: string) => {
      switch (status) {
          case 'compliant': return <CheckCircle className="w-4 h-4 text-green-500"/>
          case 'non_compliant': return <AlertTriangle className="w-4 h-4 text-red-500"/>
          case 'review_needed': return <Info className="w-4 h-4 text-yellow-500"/>
          default: return <div className="w-4 h-4 bg-gray-200 rounded-full"/>
      }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden border">
        {/* Search Header */}
        <div className="bg-white p-4 border-b flex items-center gap-2 sticky top-0 z-10">
            <Search className="w-5 h-5 text-gray-400"/>
            <input
                type="text"
                placeholder="Search sections..."
                className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="text-xs text-gray-400">{filteredSections.length} sections found</span>
        </div>

        {/* Section List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredSections.map((section) => (
                <div
                    key={section.key}
                    className={`bg-white border rounded-lg overflow-hidden transition-all ${selectedSectionKey === section.key ? 'ring-2 ring-indigo-500 shadow-md' : 'hover:border-indigo-300'}`}
                >
                    <button
                        onClick={() => handleToggle(section.key)}
                        className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {selectedSectionKey === section.key ? (
                                <ChevronDown className="w-5 h-5 text-indigo-600"/>
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400"/>
                            )}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                    <FileText className="w-3 h-3"/> {section.content.length} chars
                                    {section.page_numbers && section.page_numbers.length > 0 && (
                                        <span className="bg-gray-200 px-1.5 rounded text-[10px]">Pages: {section.page_numbers.join(', ')}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             {getComplianceIcon(section.compliance_status)}
                             {section.risk_level === 'high' && (
                                 <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">High Risk</span>
                             )}
                        </div>
                    </button>

                    {/* Content Viewer (Only if expanded) */}
                    {selectedSectionKey === section.key && (
                        <div className="p-4 border-t bg-white">
                            <div className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-700 whitespace-pre-wrap max-h-96 overflow-auto border border-gray-200">
                                {section.content}
                            </div>
                            <div className="mt-2 flex justify-end gap-2">
                                <button
                                    className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        // Could open a modal or trigger analysis
                                        console.log("Analyze section:", section.key)
                                    }}
                                >
                                    Analyze with AI <ChevronRight className="w-3 h-3"/>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {filteredSections.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No sections match your search.
                </div>
            )}
        </div>
    </div>
  )
}
