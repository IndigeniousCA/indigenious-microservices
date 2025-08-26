// Document List Component
// Displays documents in grid or list view with actions

import { motion } from 'framer-motion'
import { 
  File, FileText, Image, Layers, Download, Eye, Trash2, 
  Share2, Clock, Tag, MoreVertical, Lock, Users
} from 'lucide-react'
import type { Document } from '../types/document.types'

interface DocumentListProps {
  documents: Document[]
  view: 'grid' | 'list'
  onDocumentClick: (document: Document) => void
  onDocumentDelete: (documentId: string) => void
  selectedDocument: Document | null
}

export function DocumentList({
  documents,
  view,
  onDocumentClick,
  onDocumentDelete,
  selectedDocument
}: DocumentListProps) {
  // Get icon for file type
  const getFileIcon = (fileType: string, category: string) => {
    if (fileType === 'pdf') return <FileText className="w-6 h-6" />
    if (['jpg', 'jpeg', 'png'].includes(fileType)) return <Image className="w-6 h-6" />
    if (['dwg', 'dxf'].includes(fileType)) return <Layers className="w-6 h-6" />
    return <File className="w-6 h-6" />
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      blueprint: 'text-blue-400 bg-blue-500/20',
      specification: 'text-purple-400 bg-purple-500/20',
      contract: 'text-amber-400 bg-amber-500/20',
      photo: 'text-green-400 bg-green-500/20',
      certificate: 'text-red-400 bg-red-500/20',
      other: 'text-gray-400 bg-gray-500/20'
    }
    return colors[category] || colors.other
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  // Grid View
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {documents.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className={`bg-white/10 backdrop-blur-md border rounded-xl overflow-hidden
              cursor-pointer transition-all duration-200 ${
                selectedDocument?.id === doc.id
                  ? 'border-blue-400/50 shadow-lg shadow-blue-500/20'
                  : 'border-white/20 hover:border-white/30'
              }`}
            onClick={() => onDocumentClick(doc)}
          >
            {/* Preview Area */}
            <div className="aspect-[4/3] bg-white/5 relative group">
              {/* File Type Icon */}
              <div className="absolute inset-0 flex items-center justify-center text-white/20">
                {getFileIcon(doc.fileType, doc.category)}
              </div>
              
              {/* Thumbnail if available */}
              {doc.thumbnailUrl && (
                <img 
                  src={doc.thumbnailUrl} 
                  alt={doc.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                transition-opacity duration-200 flex items-center justify-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDocumentClick(doc)
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle download
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDocumentDelete(doc.id)
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Status Badge */}
              {doc.status === 'processing' && (
                <div className="absolute top-2 right-2">
                  <div className="bg-amber-500/20 border border-amber-400/50 rounded-lg px-2 py-1">
                    <span className="text-xs text-amber-100">Processing...</span>
                  </div>
                </div>
              )}

              {/* Access Level */}
              {doc.accessLevel === 'confidential' && (
                <div className="absolute top-2 left-2">
                  <div className="bg-red-500/20 backdrop-blur-md rounded-lg p-1">
                    <Lock className="w-3 h-3 text-red-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Document Info */}
            <div className="p-4">
              <h3 className="font-medium text-white truncate mb-1">{doc.title}</h3>
              
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded-lg ${getCategoryColor(doc.category)}`}>
                  {doc.category}
                </span>
                <span className="text-xs text-white/60">{formatFileSize(doc.fileSize)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-white/60">
                <span>{formatDate(doc.uploadedAt)}</span>
                <div className="flex items-center space-x-3">
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {doc.viewCount}
                  </span>
                  {doc.sharedWith.length > 0 && (
                    <span className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {doc.sharedWith.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Tags */}
              {doc.tags.length > 0 && (
                <div className="flex items-center mt-2 space-x-1">
                  <Tag className="w-3 h-3 text-white/40" />
                  {doc.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs text-white/60">#{tag}</span>
                  ))}
                  {doc.tags.length > 2 && (
                    <span className="text-xs text-white/40">+{doc.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  // List View
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left p-4 text-sm font-medium text-white/80">Name</th>
            <th className="text-left p-4 text-sm font-medium text-white/80">Category</th>
            <th className="text-left p-4 text-sm font-medium text-white/80">Size</th>
            <th className="text-left p-4 text-sm font-medium text-white/80">Uploaded</th>
            <th className="text-left p-4 text-sm font-medium text-white/80">Status</th>
            <th className="text-center p-4 text-sm font-medium text-white/80">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <motion.tr
              key={doc.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                selectedDocument?.id === doc.id ? 'bg-blue-500/10' : ''
              }`}
              onClick={() => onDocumentClick(doc)}
            >
              <td className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="text-white/60">
                    {getFileIcon(doc.fileType, doc.category)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{doc.title}</p>
                    <p className="text-xs text-white/60">{doc.fileName}</p>
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span className={`text-xs px-2 py-1 rounded-lg ${getCategoryColor(doc.category)}`}>
                  {doc.category}
                </span>
              </td>
              <td className="p-4 text-sm text-white/60">
                {formatFileSize(doc.fileSize)}
              </td>
              <td className="p-4 text-sm text-white/60">
                {formatDate(doc.uploadedAt)}
              </td>
              <td className="p-4">
                <div className="flex items-center space-x-2">
                  {doc.status === 'ready' && (
                    <span className="text-xs text-emerald-400">Ready</span>
                  )}
                  {doc.status === 'processing' && (
                    <span className="text-xs text-amber-400">Processing</span>
                  )}
                  {doc.accessLevel === 'confidential' && (
                    <Lock className="w-3 h-3 text-red-400" />
                  )}
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center justify-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDocumentClick(doc)
                    }}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Eye className="w-4 h-4 text-white/60" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle download
                    }}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Download className="w-4 h-4 text-white/60" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle share
                    }}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-white/60" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDocumentDelete(doc.id)
                    }}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}