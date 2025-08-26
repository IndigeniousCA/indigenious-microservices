'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useElemental } from '@/contexts/ElementalContext'

interface RFQ {
  id: string
  title: string
  description: string
  budgetMin: number
  budgetMax: number
  deadline: string
  submissionDeadline: string
  status: string
  indigenousPreference: boolean
  buyer: {
    name: string
    email: string
  }
  _count: {
    bids: number
  }
}

interface User {
  id: string
  email: string
  name: string | null
  role: string
  businessId?: string
}

// Water droplet class for RFQ animations
class WaterDrop {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  data: RFQ | null
  rippleSize: number

  constructor(x: number, data: RFQ | null = null) {
    this.x = x
    this.y = -20
    this.size = Math.random() * 10 + 5
    this.speed = Math.random() * 2 + 1
    this.opacity = 0.7
    this.data = data
    this.rippleSize = 0
  }

  fall(canvasHeight: number) {
    this.y += this.speed
    this.speed += 0.05 // Gravity
    
    // Create ripple when hitting bottom
    if (this.y > canvasHeight - 20) {
      this.rippleSize += 2
      this.opacity = Math.max(0, this.opacity - 0.02)
    }
    
    return this.opacity > 0
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = this.opacity
    
    // Draw water drop
    ctx.fillStyle = '#3B82F6'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw ripple if hitting bottom
    if (this.rippleSize > 0) {
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.rippleSize, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    ctx.restore()
  }
}

export default function RFQsPage() {
  const router = useRouter()
  const { theme, emitRipple } = useElemental()
  const [user, setUser] = useState<User | null>(null)
  const [rfqs, setRFQs] = useState<RFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'OPEN',
    minBudget: '',
    maxBudget: '',
    category: ''
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropsRef = useRef<WaterDrop[]>([])
  const animationRef = useRef<number>(0)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchRFQs()
    }
  }, [user, filters])

  // Animate water drops for new RFQs
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    
    // Add new drops for RFQs
    if (rfqs.length > 0 && dropsRef.current.length === 0) {
      rfqs.forEach((rfq, index) => {
        setTimeout(() => {
          const x = Math.random() * canvas.width
          dropsRef.current.push(new WaterDrop(x, rfq))
        }, index * 200)
      })
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw river gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.05)')
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Update and draw drops
      dropsRef.current = dropsRef.current.filter(drop => {
        const alive = drop.fall(canvas.height)
        if (alive) drop.draw(ctx)
        return alive
      })
      
      // Add new random drops occasionally
      if (Math.random() < 0.02) {
        dropsRef.current.push(new WaterDrop(Math.random() * canvas.width))
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [rfqs])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth/login')
    }
  }

  const fetchRFQs = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.minBudget) queryParams.append('minBudget', filters.minBudget)
      if (filters.maxBudget) queryParams.append('maxBudget', filters.maxBudget)
      if (filters.category) queryParams.append('category', filters.category)

      const response = await fetch(`/api/rfqs?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setRFQs(data.rfqs || [])
      }
    } catch (error) {
      console.error('Failed to fetch RFQs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBidClick = (rfqId: string, e: React.MouseEvent) => {
    // Emit ripple effect from click position
    emitRipple(e.clientX, e.clientY, 1)
    router.push(`/rfqs/${rfqId}/bid`)
  }

  const getFlowDirection = (status: string) => {
    switch (status) {
      case 'OPEN': return 'animate-flow-down'
      case 'EVALUATION': return 'animate-flow-horizontal'
      case 'AWARDED': return 'animate-flow-up'
      default: return ''
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'from-blue-400 to-blue-600'
      case 'EVALUATION': return 'from-yellow-400 to-yellow-600'
      case 'AWARDED': return 'from-green-400 to-green-600'
      case 'CLOSED': return 'from-gray-400 to-gray-600'
      default: return 'from-gray-400 to-gray-600'
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* River background animation */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center">
            <span className="mr-3">🌊</span>
            Flowing Rivers of Opportunity
          </h1>
          <p className="text-white/80">RFQs cascade down like water, bids flow up like springs</p>
        </div>

        {/* Filters */}
        <div className="mb-8 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
          <h2 className="text-lg font-semibold text-white mb-4">Navigate the River</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Current</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Currents</option>
                <option value="OPEN">Flowing (Open)</option>
                <option value="EVALUATION">Swirling (Evaluation)</option>
                <option value="AWARDED">Spring (Awarded)</option>
                <option value="CLOSED">Still (Closed)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Min Depth ($)</label>
              <input
                type="number"
                value={filters.minBudget}
                onChange={(e) => setFilters({...filters, minBudget: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Max Depth ($)</label>
              <input
                type="number"
                value={filters.maxBudget}
                onChange={(e) => setFilters({...filters, maxBudget: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Stream Type</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Streams</option>
                <option value="construction">Construction Rapids</option>
                <option value="services">Service Flows</option>
                <option value="supplies">Supply Tributaries</option>
                <option value="consulting">Consulting Springs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Create RFQ button for buyers */}
        {user?.role === 'BUYER' && (
          <div className="mb-8 text-center">
            <Link
              href="/rfqs/create"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <span className="mr-2">💧</span>
              Release New RFQ into the River
            </Link>
          </div>
        )}

        {/* RFQs Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">💧</span>
              </div>
            </div>
          </div>
        ) : rfqs.length === 0 ? (
          <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <span className="text-4xl">🏞️</span>
            <p className="mt-4 text-white/60">The river is calm... No RFQs flowing at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {rfqs.map((rfq, index) => (
              <div
                key={rfq.id}
                className={`group relative bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 ${getFlowDirection(rfq.status)}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Status indicator as water flow */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${getStatusColor(rfq.status)} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`} />
                
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2 flex items-center">
                        {rfq.indigenousPreference && <span className="mr-2">🪶</span>}
                        {rfq.title}
                      </h3>
                      <p className="text-white/70 line-clamp-2">{rfq.description}</p>
                    </div>
                    <div className={`px-3 py-1 bg-gradient-to-r ${getStatusColor(rfq.status)} rounded-full text-white text-sm font-medium`}>
                      {rfq.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-white/60">River Depth (Budget)</p>
                      <p className="text-white font-medium">
                        ${rfq.budgetMin.toLocaleString()} - ${rfq.budgetMax.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Flow Deadline</p>
                      <p className="text-white font-medium">
                        {new Date(rfq.submissionDeadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Source</p>
                      <p className="text-white font-medium">{rfq.buyer.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Tributaries (Bids)</p>
                      <p className="text-white font-medium flex items-center">
                        <span className="mr-1">🌊</span>
                        {rfq._count.bids}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Link
                      href={`/rfqs/${rfq.id}`}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      View Details
                    </Link>
                    {user?.role === 'SUPPLIER' && rfq.status === 'OPEN' && (
                      <button
                        onClick={(e) => handleBidClick(rfq.id, e)}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all transform hover:scale-105"
                      >
                        <span className="mr-1">⬆️</span>
                        Send Bid Upstream
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes flow-down {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes flow-horizontal {
          0% { transform: translateX(-10px); }
          50% { transform: translateX(10px); }
          100% { transform: translateX(-10px); }
        }
        @keyframes flow-up {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-flow-down {
          animation: flow-down 1s ease-out;
        }
        .animate-flow-horizontal {
          animation: flow-horizontal 3s ease-in-out infinite;
        }
        .animate-flow-up {
          animation: flow-up 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}