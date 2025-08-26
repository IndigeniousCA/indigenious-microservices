// Document Viewer Component
// Displays PDFs, images, and CAD files with annotation support

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Download, Share2, Clock, MessageSquare, ZoomIn, ZoomOut,
  RotateCw, Maximize2, Layers, ChevronLeft, ChevronRight,
  Edit3, Square, Circle, Type, Ruler, Save, Trash2
} from 'lucide-react'
import { AnnotationTools } from './AnnotationTools'
import { useDocumentViewer } from '../hooks/useDocumentViewer'
import type { Document, Annotation, ViewerState } from '../types/document.types'

interface DocumentViewerProps {
  document: Document
  onClose: () => void
  onVersionHistory?: () => void
  allowAnnotations?: boolean
}

export function DocumentViewer({
  document,
  onClose,
  onVersionHistory,
  allowAnnotations = true
}: DocumentViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    viewerState,
    setViewerState,
    annotations,
    addAnnotation,
    deleteAnnotation,
    saveAnnotations
  } = useDocumentViewer(document.id)

  const [showAnnotationTools, setShowAnnotationTools] = useState(false)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Mock pages for demonstration
  const totalPages = document.fileType === 'pdf' ? 5 : 1
  const currentPage = viewerState?.currentPage || 1

  // Viewer controls
  const handleZoomIn = () => {
    setViewerState(prev => ({
      ...prev!,
      zoom: Math.min(prev!.zoom + 0.25, 3)
    }))
  }

  const handleZoomOut = () => {
    setViewerState(prev => ({
      ...prev!,
      zoom: Math.max(prev!.zoom - 0.25, 0.5)
    }))
  }

  const handleRotate = () => {
    setViewerState(prev => ({
      ...prev!,
      rotation: (prev!.rotation + 90) % 360
    }))
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setViewerState(prev => ({
        ...prev!,
        currentPage: page
      }))
    }
  }

  const handleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
    setIsFullscreen(!isFullscreen)
  }

  // Handle annotation creation
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedTool || !allowAnnotations) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const annotation: Partial<Annotation> = {
      type: selectedTool as unknown,
      coordinates: { x, y },
      pageNumber: currentPage,
      content: selectedTool === 'comment' ? 'New comment' : '',
      color: '#3B82F6'
    }

    addAnnotation(annotation)
    setSelectedTool(null)
  }

  // Render document preview
  const renderDocument = () => {
    // This is a placeholder - actual implementation would use:
    // - PDF.js for PDFs
    // - DWG/DXF viewer libraries for CAD files
    // - Native img tags for images
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Document Canvas */}
        <canvas
          ref={canvasRef}
          className="bg-white rounded-lg shadow-2xl cursor-crosshair"
          style={{
            transform: `scale(${viewerState?.zoom || 1}) rotate(${viewerState?.rotation || 0}deg)`,
            transition: 'transform 0.3s ease'
          }}
          width={800}
          height={1000}
          onClick={handleCanvasClick}
        />

        {/* Render Annotations */}
        {annotations.map(annotation => (
          <div
            key={annotation.id}
            className="absolute"
            style={{
              left: annotation.coordinates.x,
              top: annotation.coordinates.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {annotation.type === 'comment' && (
              <div className="bg-blue-500 text-white p-2 rounded-lg text-xs max-w-xs">
                {annotation.content}
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 
                  w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent 
                  border-t-blue-500"></div>
              </div>
            )}
            {annotation.type === 'rectangle' && (
              <div
                className="border-2 border-blue-500"
                style={{
                  width: annotation.coordinates.width || 100,
                  height: annotation.coordinates.height || 100
                }}
              />
            )}
          </div>
        ))}

        {/* Loading State */}
        {!canvasRef.current && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      ref={containerRef}
    >
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Document Info */}
            <div>
              <h3 className="text-lg font-medium text-white">{document.title}</h3>
              <p className="text-sm text-white/60">
                {document.category} • {formatFileSize(document.fileSize)} • 
                Page {currentPage} of {totalPages}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Annotation Toggle */}
            {allowAnnotations && (
              <button
                onClick={() => setShowAnnotationTools(!showAnnotationTools)}
                className={`p-2 rounded-lg transition-colors ${
                  showAnnotationTools 
                    ? 'bg-blue-500/20 text-blue-300' 
                    : 'hover:bg-white/10 text-white/60'
                }`}
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}

            {/* Version History */}
            {onVersionHistory && (
              <button
                onClick={onVersionHistory}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
              >
                <Clock className="w-5 h-5" />
              </button>
            )}

            {/* Share */}
            <button
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Download */}
            <button
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        <AnimatePresence>
          {showThumbnails && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-black/30 border-r border-white/10 overflow-y-auto"
            >
              <div className="p-4 space-y-3">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`block w-full p-2 rounded-lg transition-colors ${
                      page === currentPage 
                        ? 'bg-blue-500/20 border border-blue-400/50' 
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="bg-white/10 aspect-[8.5/11] rounded mb-2"></div>
                    <p className="text-xs text-white/60">Page {page}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document Viewer */}
        <div className="flex-1 relative overflow-auto bg-gray-900">
          <div className="absolute inset-0 overflow-auto p-8">
            {renderDocument()}
          </div>
        </div>

        {/* Annotation Tools */}
        <AnimatePresence>
          {showAnnotationTools && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-black/30 border-l border-white/10"
            >
              <AnnotationTools
                selectedTool={selectedTool}
                onSelectTool={setSelectedTool}
                annotations={annotations.filter(a => a.pageNumber === currentPage)}
                onDeleteAnnotation={deleteAnnotation}
                onSaveAnnotations={saveAnnotations}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="bg-black/50 backdrop-blur-md border-t border-white/10 px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Page Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-2 rounded-lg transition-colors ${
                showThumbnails 
                  ? 'bg-white/10 text-white' 
                  : 'hover:bg-white/10 text-white/60'
              }`}
            >
              <Layers className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors 
                  disabled:opacity-50 disabled:cursor-not-allowed text-white/60"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <span className="text-white/60 text-sm px-3">
                {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors 
                  disabled:opacity-50 disabled:cursor-not-allowed text-white/60"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            
            <span className="text-white/60 text-sm w-16 text-center">
              {Math.round((viewerState?.zoom || 1) * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
            >
              <ZoomIn className="w-5 h-5" />
            </button>

            <button
              onClick={handleRotate}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 ml-4"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          {/* View Stats */}
          <div className="flex items-center space-x-4 text-sm text-white/60">
            <span>Views: {document.viewCount}</span>
            <span>Downloads: {document.downloadCount}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}