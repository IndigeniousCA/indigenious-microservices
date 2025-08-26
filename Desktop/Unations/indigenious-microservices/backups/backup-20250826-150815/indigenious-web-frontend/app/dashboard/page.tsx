'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useElemental } from '@/contexts/ElementalContext'
import { ExactElementalCards } from '@/components/ExactElementalCards'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  businessId?: string
}

interface Business {
  id: string
  name: string
  revenue: number
  connections: number
  health: number
  type: string
}

interface DashboardStats {
  totalRFQs: number
  activeBids: number
  wonBids: number
  totalRevenue: number
  pendingTasks: number
  newMessages: number
  businesses: Business[]
}

// Tree class for business visualization
class Tree {
  x: number
  y: number
  size: number
  health: number
  type: string
  swayOffset: number
  swaySpeed: number
  data: Business | null

  constructor(x: number, y: number, business: Business | null = null) {
    this.x = x
    this.y = y
    this.data = business
    this.size = business ? Math.min(business.revenue / 1000, 50) + 20 : 30
    this.health = business ? business.health : 100
    this.type = business ? business.type : 'oak'
    this.swayOffset = Math.random() * Math.PI * 2
    this.swaySpeed = 0.02 + Math.random() * 0.02
  }

  update(time: number) {
    // Gentle swaying animation
    const sway = Math.sin(time * this.swaySpeed + this.swayOffset) * 2
    return sway
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    const sway = this.update(time)
    
    ctx.save()
    ctx.translate(this.x + sway, this.y)
    
    // Tree trunk
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(-this.size / 8, 0, this.size / 4, this.size / 2)
    
    // Tree canopy (health affects color)
    const greenValue = Math.floor(100 + (this.health * 1.55))
    ctx.fillStyle = `rgb(34, ${greenValue}, 34)`
    ctx.beginPath()
    ctx.arc(0, -this.size / 4, this.size / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // Inner canopy for depth
    ctx.fillStyle = `rgba(34, ${greenValue - 20}, 34, 0.7)`
    ctx.beginPath()
    ctx.arc(-this.size / 6, -this.size / 3, this.size / 3, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
}

// Raindrop class for RFQs
class RainDrop {
  x: number
  y: number
  speed: number
  length: number
  opacity: number

  constructor(canvasWidth: number) {
    this.x = Math.random() * canvasWidth
    this.y = -10
    this.speed = Math.random() * 3 + 2
    this.length = Math.random() * 10 + 5
    this.opacity = Math.random() * 0.5 + 0.3
  }

  fall(canvasHeight: number) {
    this.y += this.speed
    return this.y < canvasHeight + 10
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = this.opacity
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(this.x, this.y + this.length)
    ctx.stroke()
    ctx.restore()
  }
}

// Mycelium connection class
class MyceliumConnection {
  startX: number
  startY: number
  endX: number
  endY: number
  progress: number
  opacity: number
  pulseSpeed: number

  constructor(x1: number, y1: number, x2: number, y2: number) {
    this.startX = x1
    this.startY = y1
    this.endX = x2
    this.endY = y2
    this.progress = 0
    this.opacity = 0.3
    this.pulseSpeed = 0.01 + Math.random() * 0.02
  }

  update() {
    this.progress += this.pulseSpeed
    if (this.progress > 1) this.progress = 0
    this.opacity = 0.2 + Math.sin(this.progress * Math.PI) * 0.3
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = this.opacity
    ctx.strokeStyle = '#F59E0B'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(this.startX, this.startY)
    
    // Curved connection for organic feel
    const cx = (this.startX + this.endX) / 2
    const cy = (this.startY + this.endY) / 2 + 50
    ctx.quadraticCurveTo(cx, cy, this.endX, this.endY)
    ctx.stroke()
    
    // Pulse point
    const t = this.progress
    const px = (1 - t) * (1 - t) * this.startX + 2 * (1 - t) * t * cx + t * t * this.endX
    const py = (1 - t) * (1 - t) * this.startY + 2 * (1 - t) * t * cy + t * t * this.endY
    
    ctx.fillStyle = '#FBBF24'
    ctx.beginPath()
    ctx.arc(px, py, 3, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const { theme, emitRipple } = useElemental()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalRFQs: 0,
    activeBids: 0,
    wonBids: 0,
    totalRevenue: 0,
    pendingTasks: 0,
    newMessages: 0,
    businesses: []
  })
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const treesRef = useRef<Tree[]>([])
  const rainRef = useRef<RainDrop[]>([])
  const myceliumRef = useRef<MyceliumConnection[]>([])
  const animationRef = useRef<number>(0)
  const timeRef = useRef(0)

  useEffect(() => {
    checkAuth()
    fetchDashboardData()
  }, [])

  // Forest floor animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    
    // Initialize trees (businesses)
    if (stats.businesses && stats.businesses.length > 0 && treesRef.current.length === 0) {
      treesRef.current = stats.businesses.map((business, index) => {
        const x = 100 + (index * 150) % (canvas.width - 200)
        const y = canvas.height - 150 - Math.random() * 100
        return new Tree(x, y, business)
      })
      
      // Create mycelium connections between trees
      for (let i = 0; i < treesRef.current.length - 1; i++) {
        if (Math.random() < 0.6) {
          const tree1 = treesRef.current[i]
          const tree2 = treesRef.current[i + 1]
          myceliumRef.current.push(
            new MyceliumConnection(tree1.x, tree1.y, tree2.x, tree2.y)
          )
        }
      }
    }
    
    // Add rain for RFQs
    for (let i = 0; i < stats.totalRFQs; i++) {
      setTimeout(() => {
        rainRef.current.push(new RainDrop(canvas.width))
      }, i * 100)
    }
    
    const animate = () => {
      timeRef.current += 0.016 // ~60fps
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw ground gradient
      const groundGradient = ctx.createLinearGradient(0, canvas.height - 200, 0, canvas.height)
      groundGradient.addColorStop(0, 'rgba(34, 197, 94, 0.1)')
      groundGradient.addColorStop(1, 'rgba(101, 67, 33, 0.2)')
      ctx.fillStyle = groundGradient
      ctx.fillRect(0, canvas.height - 200, canvas.width, 200)
      
      // Draw mycelium network
      myceliumRef.current.forEach(connection => {
        connection.update()
        connection.draw(ctx)
      })
      
      // Draw trees
      treesRef.current.forEach(tree => {
        tree.draw(ctx, timeRef.current)
      })
      
      // Draw rain
      rainRef.current = rainRef.current.filter(drop => {
        const alive = drop.fall(canvas.height)
        if (alive) drop.draw(ctx)
        return alive
      })
      
      // Add new rain occasionally
      if (Math.random() < 0.05) {
        rainRef.current.push(new RainDrop(canvas.width))
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [stats])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth/login')
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Simulated data - replace with actual API calls
      setStats({
        totalRFQs: 12,
        activeBids: 5,
        wonBids: 3,
        totalRevenue: 450000,
        pendingTasks: 7,
        newMessages: 4,
        businesses: [
          { id: '1', name: 'Eagle Construction', revenue: 50000, connections: 12, health: 95, type: 'oak' },
          { id: '2', name: 'Bear Services', revenue: 35000, connections: 8, health: 80, type: 'pine' },
          { id: '3', name: 'Wolf Consulting', revenue: 75000, connections: 15, health: 100, type: 'cedar' },
          { id: '4', name: 'Raven Tech', revenue: 45000, connections: 10, health: 70, type: 'birch' },
        ]
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'text-green-400'
    if (health >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getHealthIcon = (health: number) => {
    if (health >= 80) return '🌳'
    if (health >= 50) return '🌲'
    return '🍂'
  }

  return (
    <div className="min-h-screen relative">
      {/* Forest floor canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
        style={{ zIndex: 0 }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🌲 Forest Floor Dashboard
          </h1>
          <p className="text-white/80">
            Welcome back, {user?.name || user?.email}. Your ecosystem is {stats.businesses.length > 0 ? 'thriving' : 'growing'}.
          </p>
        </div>

        {/* Ecosystem Health Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Forest Health */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Forest Health</h2>
              <span className="text-2xl">🌲</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Ecosystem Vitality</span>
                  <span className="text-green-400">85%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Growth Rate</span>
                  <span className="text-yellow-400">+12%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Rain Activity (RFQs) */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Rain Activity</h2>
              <span className="text-2xl">🌧️</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-blue-400">{stats.totalRFQs}</p>
                <p className="text-xs text-white/60">Active RFQs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.activeBids}</p>
                <p className="text-xs text-white/60">Growing Bids</p>
              </div>
            </div>
            <Link 
              href="/rfqs"
              className="mt-4 block text-center px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
            >
              View River Flow →
            </Link>
          </div>

          {/* Mycelium Network */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Mycelium Network</h2>
              <span className="text-2xl">🕸️</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-orange-400">{stats.newMessages}</p>
                <p className="text-xs text-white/60">New Messages</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{stats.pendingTasks}</p>
                <p className="text-xs text-white/60">Active Tasks</p>
              </div>
            </div>
            <button 
              className="mt-4 w-full px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors"
              onClick={() => emitRipple(window.innerWidth / 2, window.innerHeight / 2, 2)}
            >
              Send Signal 📡
            </button>
          </div>
        </div>

        {/* Elemental Components - Periodic Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🔬 Elemental Ecosystem</h2>
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <ExactElementalCards />
          </div>
        </div>

        {/* Trees (Businesses) Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🌳 Business Trees</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.businesses.map((business) => (
              <div 
                key={business.id}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 hover:bg-white/15 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{business.name}</h3>
                  <span className={getHealthColor(business.health)}>
                    {getHealthIcon(business.health)}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Growth</span>
                    <span className="text-green-400">${(business.revenue / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Connections</span>
                    <span className="text-orange-400">{business.connections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Health</span>
                    <span className={getHealthColor(business.health)}>{business.health}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/rfqs/create"
            className="flex flex-col items-center p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl border border-blue-500/30 transition-all group"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">💧</span>
            <span className="text-white text-sm">Create RFQ</span>
          </Link>
          <Link 
            href="/businesses"
            className="flex flex-col items-center p-4 bg-green-500/20 hover:bg-green-500/30 rounded-xl border border-green-500/30 transition-all group"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🌱</span>
            <span className="text-white text-sm">Plant Business</span>
          </Link>
          <Link 
            href="/analytics"
            className="flex flex-col items-center p-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl border border-purple-500/30 transition-all group"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</span>
            <span className="text-white text-sm">Growth Rings</span>
          </Link>
          <Link 
            href="/messages"
            className="flex flex-col items-center p-4 bg-orange-500/20 hover:bg-orange-500/30 rounded-xl border border-orange-500/30 transition-all group"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🍄</span>
            <span className="text-white text-sm">Mycelium Chat</span>
          </Link>
        </div>
      </div>
    </div>
  )
}