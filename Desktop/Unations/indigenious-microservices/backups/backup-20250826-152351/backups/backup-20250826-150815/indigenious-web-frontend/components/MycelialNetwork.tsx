'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useElemental } from '../contexts/ElementalContext'

interface NetworkMessage {
  id: string
  from: string
  to: string
  content: string
  timestamp: Date
  type: 'pulse' | 'broadcast' | 'whisper' | 'emergency'
  strength: number
}

interface NetworkNode {
  id: string
  name: string
  x: number
  y: number
  connections: string[]
  activity: number
  lastPulse: number
}

// Spore particle for network activity
class Spore {
  x: number
  y: number
  targetX: number
  targetY: number
  size: number
  color: string
  speed: number
  life: number
  trail: { x: number, y: number }[]

  constructor(startX: number, startY: number, endX: number, endY: number, type: string) {
    this.x = startX
    this.y = startY
    this.targetX = endX
    this.targetY = endY
    this.size = 3
    this.speed = 0.02
    this.life = 100
    this.trail = []
    
    // Color based on message type
    const colors = {
      pulse: '#FBBF24',      // Yellow
      broadcast: '#3B82F6',   // Blue
      whisper: '#A78BFA',     // Purple
      emergency: '#EF4444'    // Red
    }
    this.color = colors[type as keyof typeof colors] || colors.pulse
  }

  update() {
    // Move towards target
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    
    this.x += dx * this.speed
    this.y += dy * this.speed
    
    // Add to trail
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > 10) {
      this.trail.shift()
    }
    
    this.life--
    
    // Check if reached target
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance > 2 && this.life > 0
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw trail
    ctx.save()
    ctx.strokeStyle = this.color
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.3
    
    if (this.trail.length > 1) {
      ctx.beginPath()
      ctx.moveTo(this.trail[0].x, this.trail[0].y)
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y)
      }
      ctx.stroke()
    }
    
    // Draw spore
    ctx.globalAlpha = (this.life / 100) * 0.8
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    
    // Glow effect
    ctx.globalAlpha = (this.life / 100) * 0.2
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
}

export const MycelialNetwork: React.FC = () => {
  const { socket, isConnected, emitRipple } = useElemental()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<NetworkMessage[]>([])
  const [nodes, setNodes] = useState<NetworkNode[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [networkHealth, setNetworkHealth] = useState(100)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sporesRef = useRef<Spore[]>([])
  const animationRef = useRef<number>(0)
  const pulseTimeRef = useRef(0)

  // Initialize network nodes
  useEffect(() => {
    // Create network topology
    const initialNodes: NetworkNode[] = [
      { id: 'hub', name: 'Central Hub', x: 200, y: 200, connections: ['n1', 'n2', 'n3', 'n4'], activity: 100, lastPulse: Date.now() },
      { id: 'n1', name: 'North Node', x: 200, y: 100, connections: ['hub', 'n2', 'n4'], activity: 80, lastPulse: Date.now() },
      { id: 'n2', name: 'East Node', x: 300, y: 200, connections: ['hub', 'n1', 'n3'], activity: 75, lastPulse: Date.now() },
      { id: 'n3', name: 'South Node', x: 200, y: 300, connections: ['hub', 'n2', 'n4'], activity: 90, lastPulse: Date.now() },
      { id: 'n4', name: 'West Node', x: 100, y: 200, connections: ['hub', 'n1', 'n3'], activity: 70, lastPulse: Date.now() },
    ]
    setNodes(initialNodes)
  }, [])

  // Socket listeners for real-time messages
  useEffect(() => {
    if (!socket) return

    const handleNetworkMessage = (msg: NetworkMessage) => {
      setMessages(prev => [msg, ...prev].slice(0, 50)) // Keep last 50 messages
      
      // Create spore animation
      const fromNode = nodes.find(n => n.id === msg.from)
      const toNode = nodes.find(n => n.id === msg.to)
      
      if (fromNode && toNode) {
        sporesRef.current.push(
          new Spore(fromNode.x, fromNode.y, toNode.x, toNode.y, msg.type)
        )
      }
      
      // Emit ripple for emergency messages
      if (msg.type === 'emergency') {
        emitRipple(window.innerWidth / 2, window.innerHeight / 2, 3)
      }
    }

    const handleNodeUpdate = (nodeUpdate: { id: string, activity: number }) => {
      setNodes(prev => prev.map(node => 
        node.id === nodeUpdate.id 
          ? { ...node, activity: nodeUpdate.activity, lastPulse: Date.now() }
          : node
      ))
    }

    const handleNetworkHealth = (health: number) => {
      setNetworkHealth(health)
    }

    socket.on('network-message', handleNetworkMessage)
    socket.on('node-update', handleNodeUpdate)
    socket.on('network-health', handleNetworkHealth)

    return () => {
      socket.off('network-message', handleNetworkMessage)
      socket.off('node-update', handleNodeUpdate)
      socket.off('network-health', handleNetworkHealth)
    }
  }, [socket, nodes, emitRipple])

  // Canvas animation for network visualization
  useEffect(() => {
    if (!isOpen) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = 400
    canvas.height = 400
    
    const animate = () => {
      pulseTimeRef.current += 0.02
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw connections (mycelium strands)
      nodes.forEach(node => {
        node.connections.forEach(targetId => {
          const target = nodes.find(n => n.id === targetId)
          if (!target) return
          
          ctx.save()
          ctx.strokeStyle = '#F59E0B'
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.2 + Math.sin(pulseTimeRef.current + node.x) * 0.1
          ctx.setLineDash([5, 5])
          ctx.lineDashOffset = pulseTimeRef.current * 10
          
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
          ctx.restore()
        })
      })
      
      // Draw nodes
      nodes.forEach(node => {
        const pulse = Math.sin(pulseTimeRef.current * 2 + node.x) * 0.3 + 0.7
        const isSelected = node.id === selectedNode
        
        // Node glow
        ctx.save()
        ctx.globalAlpha = (node.activity / 100) * pulse * 0.3
        ctx.fillStyle = isSelected ? '#10B981' : '#F59E0B'
        ctx.beginPath()
        ctx.arc(node.x, node.y, 20 * pulse, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        
        // Node core
        ctx.save()
        ctx.globalAlpha = node.activity / 100
        ctx.fillStyle = isSelected ? '#10B981' : '#F59E0B'
        ctx.beginPath()
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2)
        ctx.fill()
        
        // Activity ring
        ctx.strokeStyle = '#FBBF24'
        ctx.lineWidth = 2
        ctx.globalAlpha = pulse
        ctx.beginPath()
        ctx.arc(node.x, node.y, 12, 0, (Math.PI * 2) * (node.activity / 100))
        ctx.stroke()
        ctx.restore()
        
        // Node label
        ctx.save()
        ctx.fillStyle = 'white'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.globalAlpha = 0.8
        ctx.fillText(node.name, node.x, node.y + 25)
        ctx.restore()
      })
      
      // Update and draw spores
      sporesRef.current = sporesRef.current.filter(spore => {
        const alive = spore.update()
        if (alive) spore.draw(ctx)
        return alive
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isOpen, nodes, selectedNode])

  const sendMessage = useCallback((type: NetworkMessage['type']) => {
    if (!inputMessage.trim() || !selectedNode || !socket) return
    
    const message: NetworkMessage = {
      id: Date.now().toString(),
      from: 'user',
      to: selectedNode,
      content: inputMessage,
      timestamp: new Date(),
      type,
      strength: type === 'emergency' ? 100 : type === 'broadcast' ? 75 : 50
    }
    
    // Send via socket
    socket.emit('network-message', message)
    
    // Add to local messages
    setMessages(prev => [message, ...prev].slice(0, 50))
    
    // Create spore animation
    const userX = 200 // Center
    const userY = 350 // Bottom
    const targetNode = nodes.find(n => n.id === selectedNode)
    if (targetNode) {
      sporesRef.current.push(
        new Spore(userX, userY, targetNode.x, targetNode.y, type)
      )
    }
    
    setInputMessage('')
  }, [inputMessage, selectedNode, socket, nodes])

  const getMessageIcon = (type: NetworkMessage['type']) => {
    switch (type) {
      case 'pulse': return '⚡'
      case 'broadcast': return '📢'
      case 'whisper': return '🤫'
      case 'emergency': return '🚨'
      default: return '💬'
    }
  }

  return (
    <>
      {/* Floating trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-8 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 z-40 flex items-center space-x-2 group"
          aria-label="Open Mycelial Network"
        >
          <span className="text-lg">🍄</span>
          <span className="font-semibold">Mycelial Network</span>
          {messages.length > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center animate-pulse">
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Network Interface */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl mx-4 h-[600px] bg-gradient-to-br from-gray-900 to-orange-900/30 rounded-2xl border border-orange-500/30 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-orange-500/20">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🍄</span>
                <h2 className="text-xl font-bold text-white">Mycelial Network</h2>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-xs text-white/60">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex h-[calc(100%-80px)]">
              {/* Network Visualization */}
              <div className="w-1/2 p-4">
                <div className="mb-2 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-white/80">Network Topology</h3>
                  <div className="text-xs text-white/60">
                    Health: <span className={`font-bold ${networkHealth > 80 ? 'text-green-400' : networkHealth > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {networkHealth}%
                    </span>
                  </div>
                </div>
                <div className="relative bg-black/30 rounded-lg overflow-hidden">
                  <canvas 
                    ref={canvasRef}
                    className="w-full h-full"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = (e.clientX - rect.left) * (400 / rect.width)
                      const y = (e.clientY - rect.top) * (400 / rect.height)
                      
                      // Find closest node
                      let closest = nodes[0]
                      let minDist = Infinity
                      nodes.forEach(node => {
                        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2)
                        if (dist < minDist) {
                          minDist = dist
                          closest = node
                        }
                      })
                      
                      if (minDist < 30) {
                        setSelectedNode(closest.id)
                        emitRipple(e.clientX, e.clientY, 1)
                      }
                    }}
                  />
                </div>
                {selectedNode && (
                  <div className="mt-2 p-2 bg-white/10 rounded text-xs text-white">
                    Selected: {nodes.find(n => n.id === selectedNode)?.name}
                  </div>
                )}
              </div>

              {/* Messages & Controls */}
              <div className="w-1/2 p-4 flex flex-col">
                <h3 className="text-sm font-semibold text-white/80 mb-2">Network Activity</h3>
                
                {/* Messages list */}
                <div className="flex-1 overflow-y-auto space-y-2 mb-4 bg-black/20 rounded-lg p-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-white/40 py-8">
                      <span className="text-3xl">🌙</span>
                      <p className="mt-2">The network is quiet...</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div 
                        key={msg.id}
                        className={`p-2 rounded-lg bg-white/10 border-l-2 ${
                          msg.type === 'emergency' ? 'border-red-500' :
                          msg.type === 'broadcast' ? 'border-blue-500' :
                          msg.type === 'whisper' ? 'border-purple-500' :
                          'border-yellow-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <span>{getMessageIcon(msg.type)}</span>
                            <span className="text-xs text-white/60">
                              {msg.from} → {msg.to}
                            </span>
                          </div>
                          <span className="text-xs text-white/40">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-white mt-1">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Input controls */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage('pulse')}
                    placeholder={selectedNode ? `Send signal to ${nodes.find(n => n.id === selectedNode)?.name}...` : 'Select a node first...'}
                    disabled={!selectedNode}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 disabled:opacity-50"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => sendMessage('pulse')}
                      disabled={!selectedNode || !inputMessage}
                      className="flex-1 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded disabled:opacity-50"
                    >
                      ⚡ Pulse
                    </button>
                    <button
                      onClick={() => sendMessage('broadcast')}
                      disabled={!selectedNode || !inputMessage}
                      className="flex-1 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded disabled:opacity-50"
                    >
                      📢 Broadcast
                    </button>
                    <button
                      onClick={() => sendMessage('whisper')}
                      disabled={!selectedNode || !inputMessage}
                      className="flex-1 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded disabled:opacity-50"
                    >
                      🤫 Whisper
                    </button>
                    <button
                      onClick={() => sendMessage('emergency')}
                      disabled={!selectedNode || !inputMessage}
                      className="flex-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded disabled:opacity-50"
                    >
                      🚨 Emergency
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}