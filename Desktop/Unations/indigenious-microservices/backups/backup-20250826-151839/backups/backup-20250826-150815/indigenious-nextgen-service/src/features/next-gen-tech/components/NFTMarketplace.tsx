// NFT Marketplace Component
// Digital asset marketplace for Indigenous art and certifications

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store, Image, Award, FileCheck, Shield, TrendingUp,
  Filter, Search, ShoppingCart, Heart, Share, ExternalLink,
  Clock, Eye, DollarSign, User, ChevronRight, Sparkles,
  Palette, Certificate, Crown, Gem, Tag, BarChart3
} from 'lucide-react'
import { NFTAsset, NFTType, NFTTransaction } from '../types/nextgen.types'

interface NFTCollection {
  id: string
  name: string
  description: string
  creator: string
  totalItems: number
  floorPrice: number
  volume: number
  image: string
}

export function NFTMarketplace() {
  const [activeTab, setActiveTab] = useState<'explore' | 'collections' | 'my-nfts' | 'create'>('explore')
  const [selectedCategory, setSelectedCategory] = useState<NFTType | 'all'>('all')
  const [selectedNFT, setSelectedNFT] = useState<NFTAsset | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'price' | 'popular'>('recent')

  // Mock NFT assets
  const nftAssets: NFTAsset[] = [
    {
      tokenId: '1',
      contractAddress: '0xNFT...123',
      type: 'art',
      name: 'Eagle Spirit',
      description: 'Traditional Haida art representing the Eagle spirit guide',
      creator: '0xArtist...456',
      owner: '0xCollector...789',
      metadata: {
        image: '/nfts/eagle-spirit.jpg',
        attributes: [
          { traitType: 'Artist', value: 'Robert Davidson' },
          { traitType: 'Nation', value: 'Haida' },
          { traitType: 'Medium', value: 'Digital' },
          { traitType: 'Year', value: 2024 },
          { traitType: 'Rarity', value: 'Rare' }
        ],
        culturalSignificance: 'The Eagle represents leadership and vision in Haida culture',
        story: 'Created to preserve traditional art forms in the digital age'
      },
      price: 2500,
      royalty: 10,
      history: [
        {
          type: 'mint',
          from: '0x0000...000',
          to: '0xArtist...456',
          timestamp: '2024-01-01T10:00:00Z',
          txHash: '0xMint...123'
        },
        {
          type: 'sale',
          from: '0xArtist...456',
          to: '0xCollector...789',
          price: 2500,
          timestamp: '2024-01-10T15:30:00Z',
          txHash: '0xSale...456'
        }
      ]
    },
    {
      tokenId: '2',
      contractAddress: '0xCert...456',
      type: 'certification',
      name: 'Indigenous Business Certification',
      description: 'Official certification verifying Indigenous business ownership',
      creator: '0xRegistry...123',
      owner: '0xBusiness...456',
      metadata: {
        image: '/nfts/certification.jpg',
        attributes: [
          { traitType: 'Type', value: 'Business Certification' },
          { traitType: 'Issuer', value: 'CCAB' },
          { traitType: 'Valid Until', value: '2025-12-31' },
          { traitType: 'Business', value: 'Cardinal Construction' }
        ]
      },
      history: []
    },
    {
      tokenId: '3',
      contractAddress: '0xBadge...789',
      type: 'badge',
      name: 'Community Leader Badge',
      description: 'Recognition for outstanding community contributions',
      creator: '0xPlatform...123',
      owner: '0xLeader...789',
      metadata: {
        image: '/nfts/leader-badge.jpg',
        attributes: [
          { traitType: 'Achievement', value: 'Community Leader' },
          { traitType: 'Level', value: 'Gold' },
          { traitType: 'Points', value: 5000 },
          { traitType: 'Year Earned', value: 2024 }
        ],
        unlockableContent: 'Access to exclusive community events'
      },
      history: []
    }
  ]

  // Mock collections
  const collections: NFTCollection[] = [
    {
      id: 'coll-1',
      name: 'Indigenous Digital Art',
      description: 'Preserving traditional art in the digital realm',
      creator: 'Indigenous Artists Collective',
      totalItems: 234,
      floorPrice: 500,
      volume: 125000,
      image: '/collections/digital-art.jpg'
    },
    {
      id: 'coll-2',
      name: 'Business Certifications',
      description: 'Verifiable business credentials on blockchain',
      creator: 'Indigenous Business Registry',
      totalItems: 1567,
      floorPrice: 0,
      volume: 0,
      image: '/collections/certifications.jpg'
    }
  ]

  const categoryInfo: Record<NFTType, { name: string; icon: any; color: string }> = {
    art: { name: 'Art', icon: Palette, color: 'purple' },
    certification: { name: 'Certifications', icon: Certificate, color: 'blue' },
    contract: { name: 'Contracts', icon: FileCheck, color: 'emerald' },
    badge: { name: 'Badges', icon: Award, color: 'amber' },
    cultural: { name: 'Cultural', icon: Crown, color: 'pink' },
    utility: { name: 'Utility', icon: Gem, color: 'indigo' }
  }

  const filteredNFTs = nftAssets.filter(nft => {
    if (selectedCategory !== 'all' && nft.type !== selectedCategory) return false
    if (searchTerm && !nft.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return (b.price || 0) - (a.price || 0)
      case 'popular':
        return b.history.length - a.history.length
      default: // recent
        const aTime = a.history[a.history.length - 1]?.timestamp || '0'
        const bTime = b.history[b.history.length - 1]?.timestamp || '0'
        return bTime.localeCompare(aTime)
    }
  })

  const formatPrice = (price?: number) => {
    if (!price) return 'Not for sale'
    return `$${price.toLocaleString()} CAD`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md 
        border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Store className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">NFT Marketplace</h2>
              <p className="text-white/70">Indigenous art, certifications, and digital assets</p>
            </div>
          </div>

          <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
            border border-purple-400/50 rounded-lg text-purple-200 transition-colors
            flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Create NFT</span>
          </button>
        </div>
      </div>

      {/* Marketplace Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Image className="w-5 h-5 text-purple-400" />
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">3,456</p>
          <p className="text-white/60 text-sm">Total NFTs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <User className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-emerald-300">+23%</span>
          </div>
          <p className="text-2xl font-bold text-white">892</p>
          <p className="text-white/60 text-sm">Artists</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">$2.4M</p>
          <p className="text-white/60 text-sm">Total Volume</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">1,234</p>
          <p className="text-white/60 text-sm">Certifications</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
        {(['explore', 'collections', 'my-nfts', 'create'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium capitalize 
              transition-all ${
                activeTab === tab
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {tab === 'my-nfts' ? 'My NFTs' : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'explore' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Search and Filters */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-3 md:space-y-0 md:space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search NFTs..."
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as unknown)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                    text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="all" className="bg-gray-800">All Categories</option>
                  {Object.entries(categoryInfo).map(([key, info]) => (
                    <option key={key} value={key} className="bg-gray-800">{info.name}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as unknown)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                    text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="recent" className="bg-gray-800">Most Recent</option>
                  <option value="price" className="bg-gray-800">Highest Price</option>
                  <option value="popular" className="bg-gray-800">Most Popular</option>
                </select>
              </div>
            </div>

            {/* Category Quick Links */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(categoryInfo).map(([key, info]) => {
                const Icon = info.icon
                const isActive = selectedCategory === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key as NFTType)}
                    className={`px-4 py-2 rounded-lg border transition-all flex items-center space-x-2
                      ${isActive
                        ? `bg-${info.color}-500/20 border-${info.color}-400/50 text-${info.color}-200`
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/15'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{info.name}</span>
                  </button>
                )
              })}
            </div>

            {/* NFT Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredNFTs.map((nft, index) => {
                const categoryData = categoryInfo[nft.type]
                const Icon = categoryData.icon
                
                return (
                  <motion.div
                    key={nft.tokenId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                      overflow-hidden hover:bg-white/15 transition-all cursor-pointer group"
                    onClick={() => setSelectedNFT(nft)}
                  >
                    <div className="relative h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className="w-24 h-24 text-purple-400/30" />
                      </div>
                      
                      {/* Category Badge */}
                      <div className={`absolute top-3 left-3 px-2 py-1 bg-${categoryData.color}-500/20 
                        backdrop-blur-md border border-${categoryData.color}-400/50 rounded-full`}>
                        <span className={`text-${categoryData.color}-200 text-xs font-medium`}>
                          {categoryData.name}
                        </span>
                      </div>

                      {/* Quick Actions */}
                      <div className="absolute top-3 right-3 flex items-center space-x-2 
                        opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md 
                          rounded-lg transition-colors">
                          <Heart className="w-4 h-4 text-white" />
                        </button>
                        <button className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md 
                          rounded-lg transition-colors">
                          <Share className="w-4 h-4 text-white" />
                        </button>
                      </div>

                      {nft.price && (
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                          <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg">
                            <p className="text-white/60 text-xs">Current Price</p>
                            <p className="text-white font-semibold">{formatPrice(nft.price)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h4 className="text-white font-semibold mb-1">{nft.name}</h4>
                      <p className="text-white/60 text-sm mb-3 line-clamp-2">{nft.description}</p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 text-white/60">
                          <User className="w-3 h-3" />
                          <span className="truncate">{nft.creator.slice(0, 8)}...</span>
                        </div>
                        
                        {nft.history.length > 0 && (
                          <div className="flex items-center space-x-1 text-white/60">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(nft.history[nft.history.length - 1].timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'collections' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {collections.map((collection, index) => (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                  overflow-hidden hover:bg-white/15 transition-all cursor-pointer"
              >
                <div className="h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
                
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-white mb-2">{collection.name}</h3>
                  <p className="text-white/60 text-sm mb-4">{collection.description}</p>
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-white font-semibold">{collection.totalItems}</p>
                      <p className="text-white/60 text-xs">Items</p>
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {collection.floorPrice > 0 ? `$${collection.floorPrice}` : 'N/A'}
                      </p>
                      <p className="text-white/60 text-xs">Floor</p>
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        ${(collection.volume / 1000).toFixed(1)}K
                      </p>
                      <p className="text-white/60 text-xs">Volume</p>
                    </div>
                  </div>
                  
                  <button className="w-full mt-4 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                    border border-purple-400/50 rounded-lg text-purple-200 transition-colors
                    flex items-center justify-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>View Collection</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NFT Detail Modal */}
      <AnimatePresence>
        {selectedNFT && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedNFT(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-4xl 
                max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* NFT Image */}
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 
                  rounded-xl p-8 flex items-center justify-center h-96">
                  {categoryInfo[selectedNFT.type].icon && (
                    (() => {
                      const IconComponent = categoryInfo[selectedNFT.type].icon;
                      return <IconComponent className="w-32 h-32 text-purple-400/30" />;
                    })()
                  )}
                </div>

                {/* NFT Details */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-3 py-1 bg-${categoryInfo[selectedNFT.type].color}-500/20 
                        text-${categoryInfo[selectedNFT.type].color}-300 rounded-full text-sm`}>
                        {categoryInfo[selectedNFT.type].name}
                      </span>
                      {selectedNFT.royalty && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 
                          rounded-full text-sm">
                          {selectedNFT.royalty}% Royalty
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">{selectedNFT.name}</h3>
                    <p className="text-white/60">{selectedNFT.description}</p>
                  </div>

                  {selectedNFT.price && (
                    <div className="bg-white/10 rounded-lg p-4">
                      <p className="text-white/60 text-sm mb-1">Current Price</p>
                      <p className="text-3xl font-bold text-white">{formatPrice(selectedNFT.price)}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-white font-medium mb-3">Properties</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNFT.metadata.attributes.map((attr, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-3 text-center">
                          <p className="text-white/60 text-xs">{attr.traitType}</p>
                          <p className="text-white font-medium">{attr.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedNFT.metadata.culturalSignificance && (
                    <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                      <h4 className="text-purple-300 font-medium mb-2">Cultural Significance</h4>
                      <p className="text-white/80 text-sm">
                        {selectedNFT.metadata.culturalSignificance}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    {selectedNFT.price && (
                      <button className="flex-1 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                        border border-purple-400/50 rounded-lg text-purple-200 transition-colors
                        flex items-center justify-center space-x-2">
                        <ShoppingCart className="w-4 h-4" />
                        <span>Buy Now</span>
                      </button>
                    )}
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 
                      border border-white/20 rounded-lg text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedNFT.history.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-3">Transaction History</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedNFT.history.map((tx, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-white/60 capitalize">{tx.type}</span>
                            <span className="text-white">
                              {tx.price ? formatPrice(tx.price) : 'Transfer'}
                            </span>
                            <span className="text-white/60">
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}