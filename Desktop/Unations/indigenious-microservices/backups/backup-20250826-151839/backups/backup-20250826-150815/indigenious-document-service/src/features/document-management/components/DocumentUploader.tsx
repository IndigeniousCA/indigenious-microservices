// Document Upload Component with Drag & Drop
// Handles large file uploads with chunking and progress tracking

import { useState, useCallback, useRef } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, X, File, AlertCircle, CheckCircle, 
  Loader, Trash2, Eye, Tag, FolderOpen
} from 'lucide-react'
import { useDocumentUpload } from '../hooks/useDocumentUpload'
import type { UploadProgress, DocumentCategory } from '../types/document.types'

interface DocumentUploaderProps {
  projectId?: string
  rfqId?: string
  allowedTypes?: string[]
  maxFileSize?: number
  onClose: () => void
  onUploadComplete: (documents: unknown[]) => void
}

export function DocumentUploader({
  projectId,
  rfqId,
  allowedTypes = ['pdf', 'dwg', 'dxf', 'jpg', 'png', 'doc', 'docx'],
  maxFileSize = 500 * 1024 * 1024, // 500MB
  onClose,
  onUploadComplete
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({})
  const [metadata, setMetadata] = useState<Record<string, any>>({})
  const { uploadFiles, cancelUpload } = useDocumentUpload()

  // Categories for documents
  const categories: { value: DocumentCategory; label: string }[] = [
    { value: 'blueprint', label: 'Blueprint' },
    { value: 'specification', label: 'Specification' },
    { value: 'contract', label: 'Contract' },
    { value: 'report', label: 'Report' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'photo', label: 'Photo' },
    { value: 'other', label: 'Other' }
  ]

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    // Handle accepted files
    setFiles(prev => [...prev, ...acceptedFiles])
    
    // Initialize metadata for new files
    acceptedFiles.forEach(file => {
      setMetadata(prev => ({
        ...prev,
        [file.name]: {
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          category: guessCategory(file),
          tags: [],
          description: ''
        }
      }))
    })

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(rejection => {
        const error = rejection.errors[0]
        return `${rejection.file.name}: ${error.message}`
      }).join('\n')
      alert(errors)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedTypes.reduce((acc, type) => ({
      ...acc,
      [`${getMimeType(type)}`]: [`.${type}`]
    }), {}),
    maxSize: maxFileSize,
    multiple: true
  })

  // Guess document category based on filename
  const guessCategory = (file: File): DocumentCategory => {
    const name = file.name.toLowerCase()
    if (name.includes('blueprint') || name.includes('drawing') || name.includes('plan')) return 'blueprint'
    if (name.includes('spec') || name.includes('requirement')) return 'specification'
    if (name.includes('contract') || name.includes('agreement')) return 'contract'
    if (name.includes('report')) return 'report'
    if (name.includes('cert') || name.includes('license')) return 'certificate'
    if (file.type.startsWith('image/')) return 'photo'
    return 'other'
  }

  // Get MIME type from extension
  const getMimeType = (ext: string): string => {
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      dwg: 'application/acad',
      dxf: 'application/dxf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    return types[ext] || 'application/octet-stream'
  }

  // Remove file from list
  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName))
    setMetadata(prev => {
      const newMeta = { ...prev }
      delete newMeta[fileName]
      return newMeta
    })
    if (uploadProgress[fileName]) {
      cancelUpload(fileName)
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[fileName]
        return newProgress
      })
    }
  }

  // Update file metadata
  const updateMetadata = (fileName: string, field: string, value: unknown) => {
    setMetadata(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        [field]: value
      }
    }))
  }

  // Start upload
  const handleUpload = async () => {
    const uploadData = files.map(file => ({
      file,
      metadata: {
        ...metadata[file.name],
        projectId,
        rfqId
      }
    }))

    try {
      const documents = await uploadFiles(
        uploadData,
        (fileName, progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [fileName]: progress
          }))
        }
      )

      onUploadComplete(documents)
    } catch (error) {
      logger.error('Upload error:', error)
    }
  }

  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const uploadedSize = Object.values(uploadProgress).reduce(
    (sum, progress) => sum + progress.uploadedBytes, 
    0
  )
  const totalProgress = totalSize > 0 ? (uploadedSize / totalSize) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 
          max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Upload Documents</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Dropzone */}
        {files.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-200 ${
                isDragActive 
                  ? 'border-blue-400 bg-blue-500/10' 
                  : 'border-white/20 hover:border-white/40'
              }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-sm text-white/60">
              Supports: {allowedTypes.join(', ').toUpperCase()}
            </p>
            <p className="text-sm text-white/60">
              Max file size: {formatFileSize(maxFileSize)}
            </p>
          </div>
        ) : (
          <>
            {/* File List */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-6">
              {files.map((file) => {
                const progress = uploadProgress[file.name]
                const meta = metadata[file.name] || {}

                return (
                  <div
                    key={file.name}
                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                  >
                    {/* File Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                          <File className="w-5 h-5 text-white/60" />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={meta.title || ''}
                            onChange={(e) => updateMetadata(file.name, 'title', e.target.value)}
                            placeholder="Document title"
                            className="bg-transparent text-white font-medium outline-none 
                              border-b border-transparent hover:border-white/20 
                              focus:border-blue-400/50 transition-colors"
                          />
                          <p className="text-sm text-white/60 mt-1">
                            {file.name} • {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      {!progress && (
                        <button
                          onClick={() => removeFile(file.name)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>

                    {/* Metadata Fields */}
                    {!progress && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Category</label>
                          <select
                            value={meta.category || ''}
                            onChange={(e) => updateMetadata(file.name, 'category', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white/10 border border-white/20 
                              rounded-lg text-sm text-white focus:border-blue-400/50 
                              focus:outline-none appearance-none"
                          >
                            {categories.map(cat => (
                              <option key={cat.value} value={cat.value} className="bg-gray-800">
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Tags</label>
                          <input
                            type="text"
                            value={meta.tags?.join(', ') || ''}
                            onChange={(e) => updateMetadata(
                              file.name, 
                              'tags', 
                              e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                            )}
                            placeholder="tag1, tag2, tag3"
                            className="w-full px-3 py-1.5 bg-white/10 border border-white/20 
                              rounded-lg text-sm text-white placeholder-white/50 
                              focus:border-blue-400/50 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Upload Progress */}
                    {progress && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/60">
                            {progress.status === 'uploading' && 'Uploading...'}
                            {progress.status === 'processing' && 'Processing...'}
                            {progress.status === 'complete' && 'Complete'}
                            {progress.status === 'error' && 'Failed'}
                          </span>
                          <span className="text-white/60">{Math.round(progress.percentage)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              progress.status === 'error' 
                                ? 'bg-red-500' 
                                : progress.status === 'complete'
                                ? 'bg-emerald-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        {progress.error && (
                          <p className="text-xs text-red-400">{progress.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 pt-4">
              {/* Total Progress */}
              {Object.keys(uploadProgress).length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-white/60">Total Progress</span>
                    <span className="text-white/60">{Math.round(totalProgress)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${totalProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div
                  {...getRootProps()}
                  className="text-sm text-blue-300 hover:text-blue-200 cursor-pointer"
                >
                  <input {...getInputProps()} />
                  + Add more files
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                      rounded-xl text-white font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={files.length === 0 || Object.keys(uploadProgress).length > 0}
                    className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                      border-blue-400/50 rounded-xl text-blue-100 font-medium 
                      transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload {files.length} {files.length === 1 ? 'File' : 'Files'}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// Note: react-dropzone is not imported - would need to be installed
// For now, creating a simple version without the library
interface DropzoneProps {
  onDrop: (files: File[]) => void
  accept?: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
}

function useDropzone({ onDrop, accept, maxSize, multiple }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    onDrop(files, []) // Simplified - no rejection handling
  }

  const getRootProps = () => ({
    onDrop: handleDrop,
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragActive(true)
    },
    onDragLeave: () => setIsDragActive(false),
    onClick: () => inputRef.current?.click()
  })

  const getInputProps = () => ({
    ref: inputRef,
    type: 'file',
    multiple,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      onDrop(files, [])
    },
    style: { display: 'none' }
  })

  return { getRootProps, getInputProps, isDragActive }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}