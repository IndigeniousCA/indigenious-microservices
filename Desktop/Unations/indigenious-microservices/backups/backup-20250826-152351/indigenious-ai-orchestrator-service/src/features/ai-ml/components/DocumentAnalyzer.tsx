// Document Analyzer Component
// NLP-powered document processing and analysis

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileSearch, Upload, FileText, File, Image, CheckCircle,
  AlertCircle, Globe, Calendar, DollarSign, Building,
  Tag, TrendingUp, Download, Eye, X, Info, Loader
} from 'lucide-react'
import { useAI } from '../hooks/useAI'
import type { DocumentAnalysis } from '../types/ai-ml.types'

interface DocumentAnalyzerProps {
  userId: string
  culturalContext?: {
    community?: string
    language?: string
    protocols?: string[]
  }
}

interface AnalyzedDocument {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  analysis?: DocumentAnalysis
  status: 'pending' | 'analyzing' | 'completed' | 'error'
}

export function DocumentAnalyzer({ userId, culturalContext }: DocumentAnalyzerProps) {
  const [documents, setDocuments] = useState<AnalyzedDocument[]>([])
  const [selectedDocument, setSelectedDocument] = useState<AnalyzedDocument | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const { analyzeDocument, documentAnalyses, isLoading } = useAI({ 
    userId, 
    culturalContext 
  })

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    const newDocs: AnalyzedDocument[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const docId = `doc-${Date.now()}-${i}`
      
      const newDoc: AnalyzedDocument = {
        id: docId,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'pending'
      }
      
      newDocs.push(newDoc)
      
      // Simulate file reading
      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string
        
        // Update status to analyzing
        setDocuments(prev => prev.map(doc => 
          doc.id === docId ? { ...doc, status: 'analyzing' as const } : doc
        ))
        
        try {
          // Analyze document
          const analysis = await analyzeDocument(docId, content)
          
          // Update with analysis results
          setDocuments(prev => prev.map(doc => 
            doc.id === docId ? { 
              ...doc, 
              analysis, 
              status: 'completed' as const 
            } : doc
          ))
        } catch (error) {
          // Update status to error
          setDocuments(prev => prev.map(doc => 
            doc.id === docId ? { ...doc, status: 'error' as const } : doc
          ))
        }
      }
      
      reader.readAsText(file)
    }
    
    setDocuments(prev => [...prev, ...newDocs])
  }, [analyzeDocument])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText
    if (type.includes('image')) return Image
    return File
  }

  // Get entity icon
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'organizations': return Building
      case 'locations': return Globe
      case 'dates': return Calendar
      case 'amounts': return DollarSign
      default: return Tag
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative bg-white/10 backdrop-blur-md border-2 border-dashed 
          rounded-xl p-12 text-center transition-all ${
          isDragging 
            ? 'border-purple-400 bg-purple-500/10' 
            : 'border-white/20 hover:border-white/40'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".pdf,.doc,.docx,.txt,.rtf"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
        
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Drop documents here or click to upload
          </h3>
          <p className="text-white/60 text-sm">
            Supports PDF, Word, and text documents. AI will extract and analyze content.
          </p>
          
          {culturalContext && (
            <p className="text-purple-300 text-sm mt-2">
              Cultural context awareness enabled for {culturalContext.community || 'Indigenous communities'}
            </p>
          )}
        </label>
        
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-xl overflow-hidden">
            <motion.div
              className="h-full bg-purple-400"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Analyzed Documents</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const FileIcon = getFileIcon(doc.type)
              
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <FileIcon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white truncate">{doc.name}</h4>
                        <p className="text-white/60 text-sm">
                          {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {doc.status === 'analyzing' && (
                        <Loader className="w-5 h-5 text-purple-400 animate-spin" />
                      )}
                      {doc.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      )}
                      {doc.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  </div>

                  {doc.analysis && (
                    <div className="space-y-4">
                      {/* Language & Summary */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/60 text-sm">Language: {doc.analysis.language.toUpperCase()}</span>
                          <span className="text-white/60 text-sm">Type: {doc.analysis.type}</span>
                        </div>
                        <p className="text-white/80 text-sm line-clamp-2">{doc.analysis.summary}</p>
                      </div>

                      {/* Key Requirements */}
                      {doc.analysis.keyRequirements.length > 0 && (
                        <div>
                          <h5 className="text-white/80 text-sm font-medium mb-2">Key Requirements</h5>
                          <div className="flex flex-wrap gap-2">
                            {doc.analysis.keyRequirements.slice(0, 3).map((req, i) => (
                              <div key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                {req}
                              </div>
                            ))}
                            {doc.analysis.keyRequirements.length > 3 && (
                              <div className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                                +{doc.analysis.keyRequirements.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Extracted Entities */}
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(doc.analysis.entities).map(([type, values]) => {
                          if (!values.length) return null
                          const Icon = getEntityIcon(type)
                          
                          return (
                            <div key={type} className="flex items-center space-x-2 text-sm">
                              <Icon className="w-4 h-4 text-white/40" />
                              <span className="text-white/60 capitalize">{type}:</span>
                              <span className="text-white">{values.length}</span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Cultural Markers */}
                      {doc.analysis.culturalMarkers && (
                        <div className="p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                          <h5 className="text-purple-300 text-sm font-medium mb-2">Cultural Context</h5>
                          <div className="space-y-1 text-xs">
                            {doc.analysis.culturalMarkers.indigenousReferences.length > 0 && (
                              <p className="text-purple-200">
                                Indigenous references: {doc.analysis.culturalMarkers.indigenousReferences.join(', ')}
                              </p>
                            )}
                            {doc.analysis.culturalMarkers.communityMentions.length > 0 && (
                              <p className="text-purple-200">
                                Communities: {doc.analysis.culturalMarkers.communityMentions.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center space-x-2">
                          <div className="text-white/60 text-xs">
                            Confidence: {Math.round(doc.analysis.confidence * 100)}%
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 
                            border border-purple-400/50 rounded text-purple-200 text-sm 
                            flex items-center space-x-1 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {doc.status === 'analyzing' && (
                    <div className="text-center py-4">
                      <p className="text-white/60 text-sm">Analyzing document...</p>
                    </div>
                  )}

                  {doc.status === 'error' && (
                    <div className="text-center py-4">
                      <p className="text-red-300 text-sm">Failed to analyze document</p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      <AnimatePresence>
        {selectedDocument && selectedDocument.analysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDocument(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedDocument.name}</h3>
                  <p className="text-white/60 text-sm">
                    Analyzed on {new Date(selectedDocument.uploadedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Analysis Details */}
              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h4 className="font-medium text-white mb-3">Document Summary</h4>
                  <p className="text-white/80">{selectedDocument.analysis.summary}</p>
                </div>

                {/* Key Requirements */}
                <div>
                  <h4 className="font-medium text-white mb-3">Extracted Requirements</h4>
                  <ul className="space-y-2">
                    {selectedDocument.analysis.keyRequirements.map((req, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-white/80 text-sm">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Entities */}
                <div>
                  <h4 className="font-medium text-white mb-3">Extracted Entities</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedDocument.analysis.entities).map(([type, values]) => {
                      if (!values.length) return null
                      const Icon = getEntityIcon(type)
                      
                      return (
                        <div key={type} className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Icon className="w-5 h-5 text-white/60" />
                            <h5 className="font-medium text-white capitalize">{type}</h5>
                          </div>
                          <div className="space-y-1">
                            {values.map((value, i) => (
                              <p key={i} className="text-white/70 text-sm">
                                {typeof value === 'number' ? `$${value.toLocaleString()}` : value}
                              </p>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Sentiment Analysis */}
                <div>
                  <h4 className="font-medium text-white mb-3">Sentiment Analysis</h4>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/80">Overall Sentiment</span>
                      <span className={`font-medium ${
                        selectedDocument.analysis.sentiment.overall > 0.6 
                          ? 'text-emerald-400' 
                          : selectedDocument.analysis.sentiment.overall > 0.4
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {selectedDocument.analysis.sentiment.overall > 0.6 ? 'Positive' : 
                         selectedDocument.analysis.sentiment.overall > 0.4 ? 'Neutral' : 'Negative'}
                      </span>
                    </div>
                    
                    {Object.entries(selectedDocument.analysis.sentiment.aspects).map(([aspect, score]) => (
                      <div key={aspect} className="flex items-center justify-between py-2 border-t border-white/10">
                        <span className="text-white/60 text-sm capitalize">{aspect}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                score > 0.6 ? 'bg-emerald-400' : 
                                score > 0.4 ? 'bg-amber-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${score * 100}%` }}
                            />
                          </div>
                          <span className="text-white/60 text-xs">{Math.round(score * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div className="flex items-center space-x-2 text-sm text-white/60">
                    <Info className="w-4 h-4" />
                    <span>AI Confidence: {Math.round(selectedDocument.analysis.confidence * 100)}%</span>
                  </div>
                  
                  <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                    border border-purple-400/50 rounded-lg text-purple-200 text-sm 
                    flex items-center space-x-2 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export Analysis</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}