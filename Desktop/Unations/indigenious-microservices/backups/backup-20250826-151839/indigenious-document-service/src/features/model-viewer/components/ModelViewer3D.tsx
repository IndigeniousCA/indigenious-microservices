'use client'

import React, { useRef, useEffect, useState, Suspense } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Grid, 
  Environment,
  TransformControls,
  GizmoHelper,
  GizmoViewport,
  Stats
} from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { 
  Maximize2, Download, Camera, Ruler, MessageSquare, 
  Settings, Layers, Box, Grid3x3, Sun, Moon,
  RotateCw, Move, ZoomIn, ZoomOut, RefreshCw,
  Share2, Eye, EyeOff, Scissors, Play, Pause
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { Model3D, Annotation, ViewerControls, LoadingState } from '../types'
import { ModelLoaderService } from '../services/ModelLoader'

interface ModelViewer3DProps {
  model: Model3D
  annotations?: Annotation[]
  onAnnotationAdd?: (annotation: Annotation) => void
  onAnnotationClick?: (annotation: Annotation) => void
  showStats?: boolean
  enableMeasurements?: boolean
  enableAnnotations?: boolean
  enableScreenshots?: boolean
  className?: string
}

function Model({ model, onLoad }: { model: Model3D, onLoad?: (object: THREE.Object3D) => void }) {
  const [object, setObject] = useState<THREE.Object3D | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loaderService = useRef(new ModelLoaderService())

  useEffect(() => {
    const loadModel = async () => {
      try {
        const loaded = await loaderService.current.loadModel(model)
        setObject(loaded)
        if (onLoad) onLoad(loaded)
      } catch (err) {
        setError(err.message)
        logger.error('Failed to load model:', err)
      }
    }

    loadModel()

    return () => {
      if (object) {
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }
    }
  }, [model])

  if (error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    )
  }

  if (!object) return null

  return <primitive object={object} />
}

function Scene({ 
  model, 
  controls, 
  annotations,
  onAnnotationClick 
}: { 
  model: Model3D
  controls: ViewerControls
  annotations?: Annotation[]
  onAnnotationClick?: (annotation: Annotation) => void
}) {
  const { camera } = useThree()
  const modelRef = useRef<THREE.Object3D>()

  useEffect(() => {
    if (modelRef.current && controls.sectioning.enabled) {
      // Apply section plane
      const plane = new THREE.Plane()
      const normal = new THREE.Vector3()
      
      switch (controls.sectioning.plane) {
        case 'x':
          normal.set(1, 0, 0)
          break
        case 'y':
          normal.set(0, 1, 0)
          break
        case 'z':
          normal.set(0, 0, 1)
          break
      }
      
      plane.normal = normal
      plane.constant = controls.sectioning.position
      
      // Apply clipping plane to all materials
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(mat => {
            mat.clippingPlanes = [plane]
            mat.clipShadows = true
          })
        }
      })
    }
  }, [controls.sectioning])

  // Handle auto-rotation
  useFrame((state, delta) => {
    if (model.viewSettings?.autoRotate && modelRef.current) {
      modelRef.current.rotation.y += delta * (model.viewSettings.rotationSpeed || 0.5)
    }
  })

  const handleModelLoad = (object: THREE.Object3D) => {
    modelRef.current = object
    
    // Center and scale model
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 10 / maxDim
    
    object.scale.multiplyScalar(scale)
    object.position.sub(center.multiplyScalar(scale))
  }

  return (
    <>
      <ambientLight intensity={model.viewSettings?.ambientLight || 0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={model.viewSettings?.directionalLight || 1}
        castShadow={model.viewSettings?.shadowsEnabled}
      />
      
      {model.viewSettings?.gridEnabled !== false && (
        <Grid 
          args={[50, 50]} 
          cellSize={1} 
          cellThickness={0.5} 
          cellColor="#6b7280" 
          sectionColor="#3b82f6"
          fadeDistance={50}
          fadeStrength={1}
          infiniteGrid
        />
      )}
      
      {model.viewSettings?.axisHelperEnabled && (
        <axesHelper args={[5]} />
      )}
      
      <Model model={model} onLoad={handleModelLoad} />
      
      {/* Render annotations */}
      {annotations?.map(annotation => (
        <mesh
          key={annotation.id}
          position={[annotation.position.x, annotation.position.y, annotation.position.z]}
          onClick={() => onAnnotationClick?.(annotation)}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial 
            color={annotation.color || '#3b82f6'} 
            opacity={0.8}
            transparent
          />
        </mesh>
      ))}
    </>
  )
}

export function ModelViewer3D({
  model,
  annotations = [],
  onAnnotationAdd,
  onAnnotationClick,
  showStats = false,
  enableMeasurements = true,
  enableAnnotations = true,
  enableScreenshots = true,
  className = ''
}: ModelViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controls, setControls] = useState<ViewerControls>({
    zoom: 1,
    rotation: { x: 0, y: 0, z: 0 },
    pan: { x: 0, y: 0 },
    cameraMode: 'orbit',
    viewMode: 'shaded',
    sectioning: {
      enabled: false,
      plane: 'x',
      position: 0
    }
  })
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    stage: 'idle'
  })
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [measurementMode, setMeasurementMode] = useState(false)
  const [annotationMode, setAnnotationMode] = useState(false)

  useEffect(() => {
    const loader = new ModelLoaderService()
    loader.onLoadingStateChange(setLoadingState)
    
    return () => loader.dispose()
  }, [])

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleScreenshot = () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = `${model.name}-screenshot.png`
      link.href = canvasRef.current.toDataURL()
      link.click()
    }
  }

  const handleShare = () => {
    // In production, generate shareable link
    navigator.clipboard.writeText(window.location.href)
  }

  const handleReset = () => {
    setControls({
      zoom: 1,
      rotation: { x: 0, y: 0, z: 0 },
      pan: { x: 0, y: 0 },
      cameraMode: 'orbit',
      viewMode: 'shaded',
      sectioning: {
        enabled: false,
        plane: 'x',
        position: 0
      }
    })
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <GlassPanel className="absolute inset-0 overflow-hidden">
        {/* Loading Overlay */}
        {loadingState.isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4">
                <Box className="w-16 h-16 text-blue-400 animate-pulse" />
              </div>
              <p className="text-white text-lg font-medium mb-2">
                Loading 3D Model...
              </p>
              <p className="text-white/60 text-sm mb-4">
                {loadingState.stage === 'downloading' && 'Downloading model...'}
                {loadingState.stage === 'parsing' && 'Processing geometry...'}
                {loadingState.stage === 'rendering' && 'Preparing display...'}
              </p>
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingState.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3D Canvas */}
        <Canvas
          ref={canvasRef}
          shadows={model.viewSettings?.shadowsEnabled}
          dpr={[1, 2]}
          camera={{ position: [10, 10, 10], fov: 50 }}
          gl={{ 
            preserveDrawingBuffer: true,
            antialias: true
          }}
        >
          <Suspense fallback={null}>
            <Scene 
              model={model} 
              controls={controls}
              annotations={showAnnotations ? annotations : []}
              onAnnotationClick={onAnnotationClick}
            />
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minPolarAngle={0}
              maxPolarAngle={Math.PI}
            />
            {controls.viewMode === 'realistic' && (
              <Environment preset="city" />
            )}
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewport />
            </GizmoHelper>
          </Suspense>
          {showStats && <Stats />}
        </Canvas>

        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <GlassPanel className="px-3 py-2">
              <h3 className="text-white font-medium">{model.name}</h3>
              {model.metadata.dimensions && (
                <p className="text-xs text-white/60">
                  {model.metadata.dimensions.x.toFixed(1)} × {model.metadata.dimensions.y.toFixed(1)} × {model.metadata.dimensions.z.toFixed(1)} {model.metadata.dimensions.unit}
                </p>
              )}
            </GlassPanel>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* View Controls */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-lg p-1">
              <button
                onClick={() => setControls({...controls, viewMode: 'shaded'})}
                className={`p-2 rounded transition-colors ${
                  controls.viewMode === 'shaded' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                }`}
                title="Shaded View"
              >
                <Box className="w-4 h-4" />
              </button>
              <button
                onClick={() => setControls({...controls, viewMode: 'wireframe'})}
                className={`p-2 rounded transition-colors ${
                  controls.viewMode === 'wireframe' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                }`}
                title="Wireframe View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setControls({...controls, viewMode: 'xray'})}
                className={`p-2 rounded transition-colors ${
                  controls.viewMode === 'xray' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                }`}
                title="X-Ray View"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>

            {/* Tools */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-lg p-1">
              {enableMeasurements && (
                <button
                  onClick={() => setMeasurementMode(!measurementMode)}
                  className={`p-2 rounded transition-colors ${
                    measurementMode ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                  }`}
                  title="Measure"
                >
                  <Ruler className="w-4 h-4" />
                </button>
              )}
              {enableAnnotations && (
                <button
                  onClick={() => setAnnotationMode(!annotationMode)}
                  className={`p-2 rounded transition-colors ${
                    annotationMode ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                  }`}
                  title="Add Annotation"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowAnnotations(!showAnnotations)}
                className="p-2 rounded text-white/60 hover:text-white transition-colors"
                title={showAnnotations ? "Hide Annotations" : "Show Annotations"}
              >
                {showAnnotations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setControls({...controls, sectioning: {...controls.sectioning, enabled: !controls.sectioning.enabled}})}
                className={`p-2 rounded transition-colors ${
                  controls.sectioning.enabled ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                }`}
                title="Section View"
              >
                <Scissors className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-lg p-1">
              <button
                onClick={handleReset}
                className="p-2 rounded text-white/60 hover:text-white transition-colors"
                title="Reset View"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              {enableScreenshots && (
                <button
                  onClick={handleScreenshot}
                  className="p-2 rounded text-white/60 hover:text-white transition-colors"
                  title="Screenshot"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleShare}
                className="p-2 rounded text-white/60 hover:text-white transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded text-white/60 hover:text-white transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleFullscreen}
                className="p-2 rounded text-white/60 hover:text-white transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Section Controls */}
        {controls.sectioning.enabled && (
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
            <GlassPanel className="p-4 pointer-events-auto">
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/60">Section Plane:</span>
                <div className="flex gap-2">
                  {(['x', 'y', 'z'] as const).map(plane => (
                    <button
                      key={plane}
                      onClick={() => setControls({
                        ...controls,
                        sectioning: { ...controls.sectioning, plane }
                      })}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        controls.sectioning.plane === plane
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {plane.toUpperCase()}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={controls.sectioning.position}
                  onChange={(e) => setControls({
                    ...controls,
                    sectioning: { ...controls.sectioning, position: parseFloat(e.target.value) }
                  })}
                  className="flex-1"
                />
                <span className="text-sm text-white/60">
                  {controls.sectioning.position.toFixed(1)}
                </span>
              </div>
            </GlassPanel>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-20 right-4 w-80 pointer-events-none">
            <GlassPanel className="p-4 pointer-events-auto">
              <h3 className="text-white font-medium mb-4">View Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60">Background</label>
                  <div className="flex gap-2 mt-2">
                    <button className="flex-1 py-2 bg-white/10 rounded text-white/60 hover:bg-white/20 transition-colors">
                      <Sun className="w-4 h-4 mx-auto" />
                    </button>
                    <button className="flex-1 py-2 bg-white/10 rounded text-white/60 hover:bg-white/20 transition-colors">
                      <Moon className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={model.viewSettings?.shadowsEnabled}
                      className="rounded"
                    />
                    <span className="text-sm text-white/80">Enable Shadows</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={model.viewSettings?.gridEnabled !== false}
                      className="rounded"
                    />
                    <span className="text-sm text-white/80">Show Grid</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={model.viewSettings?.autoRotate}
                      className="rounded"
                    />
                    <span className="text-sm text-white/80">Auto Rotate</span>
                  </label>
                </div>
              </div>
            </GlassPanel>
          </div>
        )}
      </GlassPanel>
    </div>
  )
}