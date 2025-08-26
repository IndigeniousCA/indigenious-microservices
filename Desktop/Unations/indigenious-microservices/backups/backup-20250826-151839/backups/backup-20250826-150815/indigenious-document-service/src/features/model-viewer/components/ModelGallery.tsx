'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Box, Upload, Search, Filter, Grid, List,
  Download, Share2, Eye, Clock, Tag, FileText,
  ChevronRight, X, MoreVertical, Folder, Star
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { Model3D } from '../types'
import { ModelViewer3D } from './ModelViewer3D'

interface ModelGalleryProps {
  projectId?: string
  onModelSelect?: (model: Model3D) => void
  onUpload?: (files: File[]) => void
  models?: Model3D[]
}

export function ModelGallery({ projectId, onModelSelect, onUpload, models: propModels }: ModelGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedModel, setSelectedModel] = useState<Model3D | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Mock data - in production would come from props or API
  const models: Model3D[] = propModels || [
    {
      id: '1',
      name: 'Office Building - Main Structure',
      description: 'Complete architectural model with MEP systems',
      fileUrl: '/models/office-building.glb',
      thumbnailUrl: '/images/office-thumb.jpg',
      format: 'glb',
      fileSize: 45 * 1024 * 1024, // 45MB
      uploadDate: new Date('2024-01-15'),
      uploadedBy: 'Sarah Mitchell',
      projectId: 'proj-123',
      tags: ['architecture', 'commercial', 'final'],
      metadata: {
        dimensions: { x: 50, y: 20, z: 40, unit: 'm' },
        vertexCount: 150000,
        faceCount: 50000,
        materialCount: 25,
        hasTextures: true,
        hasAnimations: false
      },
      annotations: [],
      permissions: {
        canView: ['all'],
        canAnnotate: ['team'],
        canDownload: ['team'],
        canEdit: ['owner'],
        isPublic: false
      }
    },
    {
      id: '2',
      name: 'HVAC System Layout',
      description: 'Mechanical systems for floors 1-5',
      fileUrl: '/models/hvac-system.ifc',
      thumbnailUrl: '/images/hvac-thumb.jpg',
      format: 'ifc',
      fileSize: 12 * 1024 * 1024, // 12MB
      uploadDate: new Date('2024-01-20'),
      uploadedBy: 'James Wilson',
      projectId: 'proj-123',
      tags: ['mechanical', 'MEP', 'revision-2'],
      metadata: {
        dimensions: { x: 50, y: 15, z: 40, unit: 'm' },
        vertexCount: 75000,
        faceCount: 25000,
        materialCount: 10,
        hasTextures: false,
        hasAnimations: false
      },
      annotations: [],
      permissions: {
        canView: ['all'],
        canAnnotate: ['team'],
        canDownload: ['team'],
        canEdit: ['owner'],
        isPublic: false
      }
    },
    {
      id: '3',
      name: 'Site Plan - Landscaping',
      description: 'Exterior landscaping and walkways',
      fileUrl: '/models/site-plan.dwg',
      format: 'dwg',
      fileSize: 8 * 1024 * 1024, // 8MB
      uploadDate: new Date('2024-01-10'),
      uploadedBy: 'Emily Chen',
      projectId: 'proj-123',
      tags: ['landscape', 'exterior', 'approved'],
      metadata: {
        dimensions: { x: 100, y: 5, z: 80, unit: 'm' },
        vertexCount: 50000,
        faceCount: 15000,
        materialCount: 15,
        hasTextures: true,
        hasAnimations: false
      },
      annotations: [],
      permissions: {
        canView: ['all'],
        canAnnotate: ['team'],
        canDownload: ['team'],
        canEdit: ['owner'],
        isPublic: false
      }
    }
  ]

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => model.tags.includes(tag))
    return matchesSearch && matchesTags
  })

  const allTags = Array.from(new Set(models.flatMap(m => m.tags)))

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload?.(Array.from(e.dataTransfer.files))
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  }

  const getFormatColor = (format: string): string => {
    const colors = {
      glb: 'blue',
      gltf: 'blue',
      ifc: 'green',
      dwg: 'purple',
      dxf: 'purple',
      obj: 'orange',
      stl: 'red',
      fbx: 'yellow',
      step: 'indigo',
      ply: 'pink'
    }
    return colors[format] || 'gray'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">3D Models</h2>
          <p className="text-sm text-white/60 mt-1">
            View and manage project models
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <GlassButton onClick={() => setShowUpload(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Model
          </GlassButton>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50"
          />
        </div>
        <button className="p-3 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-white/60">Filter by tag:</span>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTags(prev => 
              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            )}
            className={`px-3 py-1 rounded-full text-sm transition-all ${
              selectedTags.includes(tag)
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            <Tag className="w-3 h-3 inline mr-1" />
            {tag}
          </button>
        ))}
      </div>

      {/* Models Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map(model => (
            <GlassPanel
              key={model.id}
              className="p-6 hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => setSelectedModel(model)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg mb-4 overflow-hidden relative">
                {model.thumbnailUrl ? (
                  <img 
                    src={model.thumbnailUrl} 
                    alt={model.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Box className="w-12 h-12 text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <div className={`absolute top-2 right-2 px-2 py-1 bg-${getFormatColor(model.format)}-500/20 text-${getFormatColor(model.format)}-400 text-xs rounded`}>
                  {model.format.toUpperCase()}
                </div>
              </div>

              {/* Info */}
              <h3 className="text-lg font-semibold text-white mb-1">{model.name}</h3>
              <p className="text-sm text-white/60 mb-3 line-clamp-2">
                {model.description}
              </p>

              {/* Metadata */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Size</span>
                  <span className="text-white">{formatFileSize(model.fileSize)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Uploaded</span>
                  <span className="text-white">
                    {new Date(model.uploadDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">By</span>
                  <span className="text-white">{model.uploadedBy}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Download logic
                  }}
                  className="flex-1 py-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  Download
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Share logic
                  }}
                  className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // More options
                  }}
                  className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredModels.map(model => (
            <GlassPanel
              key={model.id}
              className="p-4 hover:bg-white/5 transition-all cursor-pointer"
              onClick={() => setSelectedModel(model)}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <Box className="w-8 h-8 text-white/40" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">{model.name}</h3>
                  <p className="text-sm text-white/60">{model.description}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                    <span>{model.format.toUpperCase()}</span>
                    <span>{formatFileSize(model.fileSize)}</span>
                    <span>{new Date(model.uploadDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Download className="w-4 h-4 text-white/60" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Share2 className="w-4 h-4 text-white/60" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Upload 3D Model</h3>
                  <button
                    onClick={() => setShowUpload(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-400 bg-blue-500/10'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white mb-2">
                    Drag & drop your 3D model here
                  </p>
                  <p className="text-sm text-white/60 mb-4">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".glb,.gltf,.obj,.fbx,.stl,.ifc,.dwg,.dxf,.3dm,.step,.stp,.iges,.igs"
                    onChange={(e) => e.target.files && onUpload?.(Array.from(e.target.files))}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    <Folder className="w-4 h-4" />
                    Browse Files
                  </label>
                </div>

                <div className="mt-4 text-sm text-white/60">
                  <p className="mb-2">Supported formats:</p>
                  <div className="flex flex-wrap gap-2">
                    {['GLB', 'GLTF', 'OBJ', 'FBX', 'STL', 'IFC', 'DWG', 'DXF', '3DM', 'STEP'].map(format => (
                      <span
                        key={format}
                        className={`px-2 py-1 bg-${getFormatColor(format.toLowerCase())}-500/20 text-${getFormatColor(format.toLowerCase())}-400 rounded text-xs`}
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2">Maximum file size: 500MB</p>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Viewer Modal */}
      <AnimatePresence>
        {selectedModel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
          >
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={() => setSelectedModel(null)}
                className="p-2 bg-white/10 backdrop-blur-md rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ModelViewer3D
              model={selectedModel}
              className="w-full h-full"
              enableAnnotations
              enableMeasurements
              enableScreenshots
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}