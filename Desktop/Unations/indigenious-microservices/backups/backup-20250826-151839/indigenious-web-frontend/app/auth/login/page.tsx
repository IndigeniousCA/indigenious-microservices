'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useElemental } from '@/contexts/ElementalContext'

export default function LoginPage() {
  const router = useRouter()
  const { theme, emitRipple } = useElemental()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rootDepth, setRootDepth] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  // Root system animation
  class Root {
    x: number
    y: number
    targetY: number
    branches: { x: number, y: number }[]
    thickness: number
    opacity: number

    constructor(x: number, startY: number, targetY: number) {
      this.x = x
      this.y = startY
      this.targetY = targetY
      this.branches = []
      this.thickness = Math.random() * 3 + 2
      this.opacity = 0
    }

    grow() {
      if (this.y < this.targetY) {
        this.y += 2
        this.opacity = Math.min(1, this.opacity + 0.02)
        
        // Add random branches
        if (Math.random() < 0.05 && this.branches.length < 5) {
          this.branches.push({
            x: this.x + (Math.random() - 0.5) * 50,
            y: this.y
          })
        }
      }
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      ctx.globalAlpha = this.opacity * 0.6
      ctx.strokeStyle = '#8B4513'
      ctx.lineWidth = this.thickness
      
      // Main root
      ctx.beginPath()
      ctx.moveTo(this.x, 0)
      ctx.lineTo(this.x, this.y)
      ctx.stroke()
      
      // Branches
      this.branches.forEach(branch => {
        ctx.beginPath()
        ctx.moveTo(this.x, branch.y)
        ctx.lineTo(branch.x, branch.y + 20)
        ctx.stroke()
      })
      
      ctx.restore()
    }
  }

  const rootsRef = useRef<Root[]>([])

  // Initialize and animate roots based on password strength
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    
    // Calculate root depth based on password length
    const depth = Math.min(password.length * 20, canvas.height)
    setRootDepth(depth)
    
    // Create roots
    if (password.length > 0 && rootsRef.current.length === 0) {
      const rootCount = Math.min(password.length, 10)
      rootsRef.current = Array.from({ length: rootCount }, (_, i) => 
        new Root(
          canvas.width / 2 + (i - rootCount / 2) * 30,
          0,
          depth
        )
      )
    } else if (password.length === 0) {
      rootsRef.current = []
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw soil gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(1, 'rgba(101, 67, 33, 0.1)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Update and draw roots
      rootsRef.current.forEach(root => {
        root.grow()
        root.draw(ctx)
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Emit ripple from form
    const form = e.currentTarget as HTMLFormElement
    const rect = form.getBoundingClientRect()
    emitRipple(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.5)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/dashboard')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStrengthMessage = () => {
    if (password.length === 0) return 'Plant your roots...'
    if (password.length < 6) return 'Roots growing shallow...'
    if (password.length < 10) return 'Roots reaching deeper...'
    return 'Deep roots, strong foundation!'
  }

  const getStrengthColor = () => {
    if (password.length === 0) return 'text-gray-400'
    if (password.length < 6) return 'text-yellow-500'
    if (password.length < 10) return 'text-green-500'
    return 'text-green-700'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Root system visualization */}
        <div className="relative h-64 rounded-lg overflow-hidden bg-gradient-to-b from-transparent to-amber-900/10">
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                Deep Roots Access
              </h2>
              <p className={`text-sm ${getStrengthColor()} transition-colors`}>
                {getStrengthMessage()}
              </p>
            </div>
          </div>
        </div>

        {/* Test credentials info */}
        <div className="mb-6 p-4 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg">
          <p className="text-sm font-semibold text-green-200 mb-2">Test Credentials:</p>
          <div className="text-sm text-green-100 space-y-1">
            <p><strong>Buyer:</strong> buyer@gov.ca / buyer123</p>
            <p><strong>Supplier:</strong> supplier1@indigenous.ca / supplier123</p>
          </div>
        </div>

        {/* Login form */}
        <form 
          onSubmit={handleSubmit} 
          className="mt-8 space-y-6 bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80">
                Earth Email (Grounding Identity)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="your.identity@earth.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80">
                Root Password (Nutrient Key)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="Deep secret nutrients..."
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/20 backdrop-blur-sm p-4 border border-red-500/30">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Roots Connecting...
                </div>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2">🌱</span>
                  Plant Your Roots
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link
              href="/auth/register"
              className="font-medium text-green-400 hover:text-green-300 transition-colors"
            >
              Grow New Roots →
            </Link>
            <Link
              href="/auth/forgot-password"
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgotten Nutrients?
            </Link>
          </div>
        </form>

        {/* Root depth indicator */}
        <div className="mt-4 bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60">Root Depth</span>
            <span className="text-xs text-white/60">{rootDepth}px</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((rootDepth / 200) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}