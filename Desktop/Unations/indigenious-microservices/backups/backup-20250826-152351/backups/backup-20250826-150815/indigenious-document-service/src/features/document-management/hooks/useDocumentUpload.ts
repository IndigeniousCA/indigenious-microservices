// Hook for handling document uploads with progress tracking
// Supports chunked uploads for large files

import { useState, useRef } from 'react'
import { useDataProvider } from '@/core/providers/data-provider'
import type { UploadProgress } from '../types/document.types'

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks

interface UploadData {
  file: File
  metadata: unknown
}

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const uploadControllers = useRef<Map<string, AbortController>>(new Map())
  const provider = useDataProvider()

  // Upload multiple files with progress tracking
  const uploadFiles = async (
    files: UploadData[],
    onProgress: (fileName: string, progress: UploadProgress) => void
  ) => {
    setIsUploading(true)
    const results = []

    try {
      for (const { file, metadata } of files) {
        const controller = new AbortController()
        uploadControllers.current.set(file.name, controller)

        try {
          const result = await uploadFile(file, metadata, (progress) => {
            onProgress(file.name, progress)
          }, controller.signal)
          
          results.push(result)
        } catch (error) {
          if (error.name !== 'AbortError') {
            onProgress(file.name, {
              fileName: file.name,
              fileSize: file.size,
              uploadedBytes: 0,
              percentage: 0,
              status: 'error',
              error: error.message,
              startTime: Date.now()
            })
          }
        } finally {
          uploadControllers.current.delete(file.name)
        }
      }
    } finally {
      setIsUploading(false)
    }

    return results
  }

  // Upload single file with chunking for large files
  const uploadFile = async (
    file: File,
    metadata: unknown,
    onProgress: (progress: UploadProgress) => void,
    signal: AbortSignal
  ) => {
    const startTime = Date.now()
    let uploadedBytes = 0

    // Update progress
    const updateProgress = (bytes: number, status: UploadProgress['status'] = 'uploading') => {
      uploadedBytes = bytes
      const percentage = (uploadedBytes / file.size) * 100
      const elapsed = Date.now() - startTime
      const bytesPerSecond = uploadedBytes / (elapsed / 1000)
      const remainingBytes = file.size - uploadedBytes
      const estimatedTimeRemaining = remainingBytes / bytesPerSecond * 1000

      onProgress({
        fileName: file.name,
        fileSize: file.size,
        uploadedBytes,
        percentage,
        status,
        startTime,
        estimatedTimeRemaining
      })
    }

    try {
      // Initial progress
      updateProgress(0, 'uploading')

      // For large files, use chunked upload
      if (file.size > CHUNK_SIZE) {
        await uploadChunked(file, metadata, updateProgress, signal)
      } else {
        // Small file - single upload
        await uploadSingle(file, metadata, updateProgress, signal)
      }

      // Processing phase
      updateProgress(file.size, 'processing')

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Complete
      updateProgress(file.size, 'complete')

      return {
        id: Math.random().toString(),
        url: `/documents/${file.name}`,
        ...metadata
      }
    } catch (error) {
      if (signal.aborted) {
        throw new Error('Upload cancelled')
      }
      throw error
    }
  }

  // Single file upload
  const uploadSingle = async (
    file: File,
    metadata: unknown,
    updateProgress: (bytes: number) => void,
    signal: AbortSignal
  ) => {
    // Simulate upload with progress
    const totalSteps = 10
    const stepSize = file.size / totalSteps

    for (let i = 0; i <= totalSteps; i++) {
      if (signal.aborted) throw new Error('Upload cancelled')
      
      await new Promise(resolve => setTimeout(resolve, 200))
      updateProgress(Math.min(i * stepSize, file.size))
    }

    // In real implementation:
    // const path = `documents/${Date.now()}-${file.name}`
    // return await provider.storage.upload(file, path)
  }

  // Chunked upload for large files
  const uploadChunked = async (
    file: File,
    metadata: unknown,
    updateProgress: (bytes: number) => void,
    signal: AbortSignal
  ) => {
    const chunks = Math.ceil(file.size / CHUNK_SIZE)
    let uploaded = 0

    for (let i = 0; i < chunks; i++) {
      if (signal.aborted) throw new Error('Upload cancelled')

      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      // Simulate chunk upload
      await new Promise(resolve => setTimeout(resolve, 500))
      
      uploaded += chunk.size
      updateProgress(uploaded)
    }

    // In real implementation:
    // Would use multipart upload API
  }

  // Cancel upload
  const cancelUpload = (fileName: string) => {
    const controller = uploadControllers.current.get(fileName)
    if (controller) {
      controller.abort()
      uploadControllers.current.delete(fileName)
    }
  }

  // Cancel all uploads
  const cancelAllUploads = () => {
    uploadControllers.current.forEach(controller => controller.abort())
    uploadControllers.current.clear()
  }

  return {
    isUploading,
    uploadFiles,
    cancelUpload,
    cancelAllUploads
  }
}