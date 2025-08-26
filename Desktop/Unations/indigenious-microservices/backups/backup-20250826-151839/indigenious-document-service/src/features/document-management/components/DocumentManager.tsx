// Main Document Management Component
// Handles file upload, viewing, and version control

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, File, Search, Filter, Grid, List, Download,
  Eye, Trash2, Clock, Tag, Users, FolderOpen, X,
  FileText, Image, Layers, ChevronDown
} from 'lucide-react'
import { DocumentUploader } from './DocumentUploader'
import { DocumentViewer } from './DocumentViewer'
import { DocumentList } from './DocumentList'
import { VersionHistory } from './VersionHistory'
import { useDocuments } from '../hooks/useDocuments'
import type { Document, DocumentFilters, DocumentCategory } from '../types/document.types'

interface DocumentManagerProps {
  projectId?: string
  rfqId?: string
  allowedTypes?: string[]
  maxFileSize?: number
  onDocumentSelect?: (document: Document) => void
}

export function DocumentManager({
  projectId,
  rfqId,
  allowedTypes = ['pdf', 'dwg', 'dxf', 'jpg', 'png', 'doc', 'docx'],
  maxFileSize = 500 * 1024 * 1024, // 500MB
  onDocumentSelect
}: DocumentManagerProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showUploader, setShowUploader] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [filters, setFilters] = useState<DocumentFilters>({
    projectId,
    rfqId
  })
  const [showFilters, setShowFilters] = useState(false)

  const { documents, loading, uploadDocument, deleteDocument, refreshDocuments } = useDocuments(filters)

  // Categories with icons
  const categories: { value: DocumentCategory; label: string; icon: JSX.Element }[] = [
    { value: 'blueprint', label: 'Blueprints', icon: <Layers className="w-4 h-4" /> },
    { value: 'specification', label: 'Specifications', icon: <FileText className="w-4 h-4" /> },
    { value: 'contract', label: 'Contracts', icon: <FileText className="w-4 h-4" /> },
    { value: 'photo', label: 'Photos', icon: <Image className="w-4 h-4" /> },
    { value: 'certificate', label: 'Certificates', icon: <FileText className="w-4 h-4" /> },
    { value: 'other', label: 'Other', icon: <File className="w-4 h-4" /> }
  ]

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document)
    setShowViewer(true)
    onDocumentSelect?.(document)
  }

  const handleUploadComplete = (documents: Document[]) => {
    setShowUploader(false)
    refreshDocuments()
  }

  const handleDelete = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(documentId)
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null)
        setShowViewer(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Document Management</h1>
              <p className="text-lg text-white/60">
                Upload and manage project documents, blueprints, and specifications
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUploader(true)}
              className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50
                rounded-xl text-blue-100 font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Documents</span>
            </motion.button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Total Documents</p>
                  <p className="text-2xl font-bold text-white">{documents.length}</p>
                </div>
                <File className="w-8 h-8 text-white/20" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Blueprints</p>
                  <p className="text-2xl font-bold text-white">
                    {documents.filter(d => d.category === 'blueprint').length}
                  </p>
                </div>
                <Layers className="w-8 h-8 text-white/20" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Total Size</p>
                  <p className="text-2xl font-bold text-white">
                    {formatFileSize(documents.reduce((sum, d) => sum + d.fileSize, 0))}
                  </p>
                </div>
                <FolderOpen className="w-8 h-8 text-white/20" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Shared</p>
                  <p className="text-2xl font-bold text-white">
                    {documents.filter(d => d.sharedWith.length > 0).length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-white/20" />
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Search documents..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl
                  backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50
                  focus:outline-none transition-all duration-200"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {/* Filter Toggle */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-xl backdrop-blur-md border transition-all duration-200
                  ${showFilters 
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-100' 
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
              >
                <Filter className="w-5 h-5" />
              </motion.button>

              {/* View Toggle */}
              <div className="flex bg-white/10 rounded-xl p-1">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    view === 'grid' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    view === 'list' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4"
              >
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Category</label>
                      <select
                        value={filters.category || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          category: e.target.value as DocumentCategory || undefined 
                        }))}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg
                          text-white focus:border-blue-400/50 focus:outline-none appearance-none"
                      >
                        <option value="" className="bg-gray-800">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value} className="bg-gray-800">
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* File Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">File Type</label>
                      <select
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg
                          text-white focus:border-blue-400/50 focus:outline-none appearance-none"
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          fileTypes: e.target.value ? [e.target.value] : undefined
                        }))}
                      >
                        <option value="" className="bg-gray-800">All Types</option>
                        <option value="pdf" className="bg-gray-800">PDF</option>
                        <option value="dwg" className="bg-gray-800">DWG</option>
                        <option value="jpg,png" className="bg-gray-800">Images</option>
                        <option value="doc,docx" className="bg-gray-800">Documents</option>
                      </select>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Uploaded</label>
                      <select
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg
                          text-white focus:border-blue-400/50 focus:outline-none appearance-none"
                      >
                        <option value="" className="bg-gray-800">Any Time</option>
                        <option value="today" className="bg-gray-800">Today</option>
                        <option value="week" className="bg-gray-800">This Week</option>
                        <option value="month" className="bg-gray-800">This Month</option>
                      </select>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setFilters({ projectId, rfqId })}
                      className="text-sm text-blue-300 hover:text-blue-200"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Document List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white/60 mt-4">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-20 text-center">
            <Upload className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No documents yet</h3>
            <p className="text-white/60 mb-6">Upload your first document to get started</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUploader(true)}
              className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50
                rounded-xl text-blue-100 font-medium transition-all duration-200"
            >
              Upload Documents
            </motion.button>
          </div>
        ) : (
          <DocumentList
            documents={documents}
            view={view}
            onDocumentClick={handleDocumentClick}
            onDocumentDelete={handleDelete}
            selectedDocument={selectedDocument}
          />
        )}

        {/* Upload Modal */}
        <AnimatePresence>
          {showUploader && (
            <DocumentUploader
              projectId={projectId}
              rfqId={rfqId}
              allowedTypes={allowedTypes}
              maxFileSize={maxFileSize}
              onClose={() => setShowUploader(false)}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </AnimatePresence>

        {/* Document Viewer Modal */}
        <AnimatePresence>
          {showViewer && selectedDocument && (
            <DocumentViewer
              document={selectedDocument}
              onClose={() => {
                setShowViewer(false)
                setSelectedDocument(null)
              }}
              onVersionHistory={() => {
                setShowViewer(false)
                setShowVersionHistory(true)
              }}
            />
          )}
        </AnimatePresence>

        {/* Version History Modal */}
        <AnimatePresence>
          {showVersionHistory && selectedDocument && (
            <VersionHistory
              document={selectedDocument}
              onClose={() => {
                setShowVersionHistory(false)
                setSelectedDocument(null)
              }}
              onSelectVersion={(version) => {
                // Handle version selection
                setShowVersionHistory(false)
                setShowViewer(true)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Utility function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}