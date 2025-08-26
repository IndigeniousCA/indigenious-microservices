// VR Showroom Component
// Virtual reality product showcase and demonstrations

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  Glasses, Play, Pause, Volume2, VolumeX, Maximize, Users,
  Package, Camera, Settings, Info, ChevronRight, Share,
  Download, Star, ShoppingCart, Eye, Rotate3D, Move3D,
  Sparkles, Globe, Layers, Lightbulb, Palette, Grid3X3
} from 'lucide-react'
import { VREnvironment, VRObject, VRUser, Vector3 } from '../types/nextgen.types'

interface Product3D {
  id: string
  name: string
  description: string
  model: string
  price: number
  variants: ProductVariant[]
  features: string[]
  dimensions: {
    width: number
    height: number
    depth: number
    unit: string
  }
}

interface ProductVariant {
  id: string
  name: string
  color: string
  material: string
  inStock: boolean
}

export function VRShowroom() {
  const [isVRActive, setIsVRActive] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product3D | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [viewMode, setViewMode] = useState<'3d' | 'ar' | 'vr'>('3d')
  const [showControls, setShowControls] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [connectedUsers, setConnectedUsers] = useState<VRUser[]>([])

  // Mock products
  const products: Product3D[] = [
    {
      id: 'prod-1',
      name: 'Traditional Cedar Canoe',
      description: 'Handcrafted cedar strip canoe using traditional Indigenous techniques',
      model: '/models/canoe.glb',
      price: 4500,
      variants: [
        { id: 'v1', name: 'Natural Cedar', color: '#8B4513', material: 'cedar', inStock: true },
        { id: 'v2', name: 'Dark Walnut', color: '#3B2414', material: 'cedar', inStock: true }
      ],
      features: [
        'Hand-selected cedar strips',
        'Traditional steam bending',
        'Custom Indigenous artwork',
        'Environmentally sealed'
      ],
      dimensions: { width: 36, height: 18, depth: 192, unit: 'inches' }
    },
    {
      id: 'prod-2',
      name: 'Dreamcatcher Collection',
      description: 'Authentic dreamcatchers made by Indigenous artisans',
      model: '/models/dreamcatcher.glb',
      price: 125,
      variants: [
        { id: 'v1', name: 'Traditional', color: '#F5DEB3', material: 'willow', inStock: true },
        { id: 'v2', name: 'Modern', color: '#000000', material: 'metal', inStock: false }
      ],
      features: [
        'Willow hoop construction',
        'Natural sinew webbing',
        'Eagle feathers (certified)',
        'Handwoven patterns'
      ],
      dimensions: { width: 12, height: 24, depth: 2, unit: 'inches' }
    },
    {
      id: 'prod-3',
      name: 'Indigenous Art Installation',
      description: 'Large-scale metal sculpture representing the Seven Teachings',
      model: '/models/sculpture.glb',
      price: 25000,
      variants: [
        { id: 'v1', name: 'Corten Steel', color: '#8B4513', material: 'steel', inStock: true },
        { id: 'v2', name: 'Stainless', color: '#C0C0C0', material: 'steel', inStock: true }
      ],
      features: [
        'Weather-resistant materials',
        'LED accent lighting',
        'Modular assembly',
        'Custom sizing available'
      ],
      dimensions: { width: 120, height: 180, depth: 120, unit: 'inches' }
    }
  ]

  // Mock VR environment
  const vrEnvironment: VREnvironment = {
    id: 'showroom-1',
    name: 'Indigenous Art Gallery',
    type: 'showroom',
    scene: {
      skybox: '/textures/gallery-skybox.jpg',
      lighting: {
        ambient: 0.6,
        directional: {
          intensity: 0.8,
          position: { x: 5, y: 10, z: 5 },
          color: '#ffffff'
        },
        shadows: true
      },
      physics: false,
      culturalElements: [
        {
          type: 'pattern',
          nation: 'Haida',
          significance: 'Traditional formline design',
          usage: 'open',
          representation: '/textures/haida-pattern.jpg'
        }
      ]
    },
    objects: [],
    users: connectedUsers,
    settings: {
      maxUsers: 20,
      quality: 'high',
      locomotion: 'both',
      comfort: {
        vignette: true,
        snapTurn: true,
        seated: false,
        heightAdjust: true
      },
      accessibility: {
        subtitles: true,
        colorblind: false,
        audioDescriptions: true,
        hapticFeedback: true
      }
    }
  }

  useEffect(() => {
    // Simulate other users joining
    const mockUsers: VRUser[] = [
      {
        id: 'user-2',
        name: 'Sarah Johnson',
        avatar: '/avatars/avatar1.glb',
        position: { x: 2, y: 0, z: -3 },
        rotation: { x: 0, y: 180, z: 0 },
        isHost: false,
        isSpeaking: false,
        permissions: ['move_objects']
      }
    ]
    setConnectedUsers(mockUsers)
  }, [])

  const enterVR = async () => {
    // Check for WebXR support
    if ('xr' in navigator) {
      try {
        // Request VR session
        setIsVRActive(true)
        setViewMode('vr')
      } catch (error) {
        logger.error('VR not supported:', error)
        alert('VR is not supported on this device')
      }
    } else {
      alert('WebXR is not supported in this browser')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-md 
        border border-pink-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-pink-500/20 rounded-xl">
              <Glasses className="w-8 h-8 text-pink-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">VR Showroom</h2>
              <p className="text-white/70">Immersive product experiences in virtual reality</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {connectedUsers.length > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 
                border border-white/20 rounded-full">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-white text-sm">{connectedUsers.length + 1} in showroom</span>
              </div>
            )}
            <button
              onClick={enterVR}
              className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 
                border border-pink-400/50 rounded-lg text-pink-200 transition-colors
                flex items-center space-x-2"
            >
              <Glasses className="w-4 h-4" />
              <span>Enter VR</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
        <button
          onClick={() => setViewMode('3d')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all 
            flex items-center justify-center space-x-2 ${
            viewMode === '3d'
              ? 'bg-pink-500/20 text-pink-200 border border-pink-400/30'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          <Rotate3D className="w-4 h-4" />
          <span>3D View</span>
        </button>
        <button
          onClick={() => setViewMode('ar')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all 
            flex items-center justify-center space-x-2 ${
            viewMode === 'ar'
              ? 'bg-pink-500/20 text-pink-200 border border-pink-400/30'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>AR View</span>
        </button>
        <button
          onClick={() => setViewMode('vr')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all 
            flex items-center justify-center space-x-2 ${
            viewMode === 'vr'
              ? 'bg-pink-500/20 text-pink-200 border border-pink-400/30'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          <Glasses className="w-4 h-4" />
          <span>VR Mode</span>
        </button>
      </div>

      {/* Main Viewer */}
      <div className="relative bg-black/50 backdrop-blur-md border border-white/20 
        rounded-xl overflow-hidden" style={{ height: '500px' }}>
        {/* 3D Viewer Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-48 h-48 bg-gradient-to-br from-pink-500/20 to-purple-500/20 
                rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
                <Package className="w-24 h-24 text-pink-400/50" />
              </div>
              <Sparkles className="absolute top-0 right-0 w-8 h-8 text-amber-400 animate-pulse" />
              <Sparkles className="absolute bottom-0 left-0 w-6 h-6 text-blue-400 animate-pulse delay-150" />
            </div>
            <p className="text-white/60">3D Viewer loads here</p>
            <p className="text-white/40 text-sm">Click products below to view in 3D</p>
          </div>
        </div>

        {/* VR Controls Overlay */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t 
            from-black/80 via-black/50 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Play className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {audioEnabled ? (
                    <Volume2 className="w-5 h-5 text-white" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-white" />
                  )}
                </button>
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Share className="w-5 h-5 text-white" />
                </button>
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Maximize className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Connected Users */}
        {connectedUsers.length > 0 && (
          <div className="absolute top-4 right-4 space-y-2">
            {connectedUsers.map(user => (
              <div key={user.id} className="flex items-center space-x-2 px-3 py-1.5 
                bg-white/10 backdrop-blur-md rounded-full">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-white text-sm">{user.name}</span>
                {user.isSpeaking && (
                  <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Gallery */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Featured Products</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                overflow-hidden hover:bg-white/15 transition-all cursor-pointer"
              onClick={() => setSelectedProduct(product)}
            >
              <div className="h-48 bg-gradient-to-br from-pink-500/20 to-purple-500/20 
                flex items-center justify-center">
                <Package className="w-24 h-24 text-pink-400/30" />
              </div>

              <div className="p-5">
                <h4 className="text-lg font-semibold text-white mb-2">{product.name}</h4>
                <p className="text-white/60 text-sm mb-3">{product.description}</p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-white">
                    {formatPrice(product.price)}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-white text-sm">4.8</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {product.features.slice(0, 2).map((feature, i) => (
                    <span key={i} className="px-2 py-1 bg-pink-500/20 text-pink-300 
                      text-xs rounded-full">
                      {feature}
                    </span>
                  ))}
                  {product.features.length > 2 && (
                    <span className="text-white/50 text-xs">
                      +{product.features.length - 2} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button className="flex items-center space-x-2 text-pink-300 
                    hover:text-pink-200 transition-colors">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">View in 3D</span>
                  </button>
                  <button className="p-2 bg-pink-500/20 hover:bg-pink-500/30 
                    border border-pink-400/50 rounded-lg transition-colors">
                    <ShoppingCart className="w-4 h-4 text-pink-200" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* VR Environment Settings */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Globe className="w-5 h-5 text-purple-400" />
          <span>Environment Settings</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-white/60 text-sm mb-2">Scene Theme</p>
            <select className="w-full px-3 py-2 bg-white/10 border border-white/20 
              rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400">
              <option value="gallery" className="bg-gray-800">Art Gallery</option>
              <option value="outdoor" className="bg-gray-800">Outdoor Market</option>
              <option value="modern" className="bg-gray-800">Modern Showroom</option>
              <option value="traditional" className="bg-gray-800">Traditional Lodge</option>
            </select>
          </div>

          <div>
            <p className="text-white/60 text-sm mb-2">Lighting</p>
            <select className="w-full px-3 py-2 bg-white/10 border border-white/20 
              rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400">
              <option value="natural" className="bg-gray-800">Natural Daylight</option>
              <option value="warm" className="bg-gray-800">Warm Evening</option>
              <option value="studio" className="bg-gray-800">Studio Lighting</option>
              <option value="dramatic" className="bg-gray-800">Dramatic Spotlights</option>
            </select>
          </div>

          <div>
            <p className="text-white/60 text-sm mb-2">Background Music</p>
            <select className="w-full px-3 py-2 bg-white/10 border border-white/20 
              rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400">
              <option value="traditional" className="bg-gray-800">Traditional Flute</option>
              <option value="drums" className="bg-gray-800">Ceremonial Drums</option>
              <option value="ambient" className="bg-gray-800">Nature Ambient</option>
              <option value="none" className="bg-gray-800">No Music</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-3xl 
                max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-white/60">{selectedProduct.description}</p>
                </div>
                
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white/60 rotate-90" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 
                  rounded-xl p-8 flex items-center justify-center">
                  <Package className="w-32 h-32 text-pink-400/30" />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-white/60 text-sm mb-1">Price</p>
                    <p className="text-3xl font-bold text-white">
                      {formatPrice(selectedProduct.price)}
                    </p>
                  </div>

                  <div>
                    <p className="text-white/60 text-sm mb-2">Variants</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.variants.map(variant => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          disabled={!variant.inStock}
                          className={`px-3 py-1.5 rounded-lg border transition-all ${
                            selectedVariant?.id === variant.id
                              ? 'bg-pink-500/20 border-pink-400/50 text-pink-200'
                              : variant.inStock
                                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                : 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full border border-white/30"
                              style={{ backgroundColor: variant.color }}
                            />
                            <span className="text-sm">{variant.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-white/60 text-sm mb-2">Features</p>
                    <ul className="space-y-1">
                      {selectedProduct.features.map((feature, i) => (
                        <li key={i} className="flex items-start space-x-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                          <span className="text-white/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-white/60 text-sm mb-2">Dimensions</p>
                    <p className="text-white">
                      {selectedProduct.dimensions.width} × {selectedProduct.dimensions.height} × {selectedProduct.dimensions.depth} {selectedProduct.dimensions.unit}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 pt-4">
                    <button className="flex-1 px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 
                      border border-pink-400/50 rounded-lg text-pink-200 transition-colors
                      flex items-center justify-center space-x-2">
                      <Glasses className="w-4 h-4" />
                      <span>View in VR</span>
                    </button>
                    <button className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                      border border-emerald-400/50 rounded-lg text-emerald-200 transition-colors
                      flex items-center justify-center space-x-2">
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}