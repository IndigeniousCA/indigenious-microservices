'use client'

import React, { useEffect, useState } from 'react'

interface ElementCard {
  symbol: string
  weight: string | number
  ecosystem: string
  name: string
  description: string
  role: string
  category: string
}

export const IndigenousElementalCards: React.FC = () => {
  const [ecosystemHealth, setEcosystemHealth] = useState(87)
  const [currentSeason, setCurrentSeason] = useState('Spring')
  const [growthStage, setGrowthStage] = useState('Seeds Taking Root')

  // Complete 16-element system from your HTML
  const elements: ElementCard[] = [
    // Core Operations
    {
      symbol: 'Au',
      weight: '7',
      ecosystem: 'ROOTS',
      name: 'Authentication',
      description: '7-factor authentication. Deep roots of trust connecting the entire forest.',
      role: 'Deep Root System',
      category: 'core'
    },
    {
      symbol: 'Ve',
      weight: '48',
      ecosystem: 'SOIL',
      name: 'Verification',
      description: '48-second verification. Healthy soil for authentic growth.',
      role: 'Soil Health Layer',
      category: 'verification'
    },
    {
      symbol: 'Pa',
      weight: '24',
      ecosystem: 'RIVER',
      name: 'Payment',
      description: '24-hour payment flow. Rivers of prosperity through territories.',
      role: 'River System',
      category: 'financial'
    },
    {
      symbol: 'Ma',
      weight: '∞',
      ecosystem: 'POLLEN',
      name: 'Matching',
      description: 'Infinite pollination. Opportunities spread like pollen on wind.',
      role: 'Pollination Network',
      category: 'matching'
    },
    // Intelligence & Environment
    {
      symbol: 'Ca',
      weight: 'CO₂',
      ecosystem: 'BALANCE',
      name: 'Carbon Justice',
      description: 'Environmental accountability. Making carbon crimes visible.',
      role: 'Environmental Balance',
      category: 'environmental'
    },
    {
      symbol: 'Ai',
      weight: '87',
      ecosystem: 'SUN',
      name: 'AI Assistant',
      description: '87% win rate. Photosynthetic intelligence converting light to growth.',
      role: 'Solar Energy',
      category: 'intelligence'
    },
    {
      symbol: 'Ne',
      weight: '²',
      ecosystem: 'WEB',
      name: 'Network',
      description: 'N² growth. Mycelial networks sharing resources underground.',
      role: 'Mycelial Network',
      category: 'network'
    },
    {
      symbol: 'In',
      weight: '∞',
      ecosystem: 'OWL',
      name: 'Intelligence',
      description: 'Infinite wisdom. Owl vision seeing opportunities in darkness.',
      role: 'Night Vision',
      category: 'wisdom'
    },
    // Governance & Knowledge
    {
      symbol: 'Da',
      weight: '∞',
      ecosystem: 'CEDAR',
      name: 'Data Sovereignty',
      description: 'Eternal protection. Cedar trees guarding sacred knowledge.',
      role: 'Sacred Knowledge',
      category: 'knowledge'
    },
    {
      symbol: 'Go',
      weight: '7G',
      ecosystem: 'CANOPY',
      name: 'Governance',
      description: '7 generations thinking. Old growth canopy protecting all.',
      role: 'Forest Canopy',
      category: 'governance'
    },
    {
      symbol: 'Co',
      weight: '33',
      ecosystem: 'HIVE',
      name: 'Collaboration',
      description: '33-person circles. Hive minds working in perfect harmony.',
      role: 'Hive Mind System',
      category: 'collaboration'
    },
    {
      symbol: 'Ed',
      weight: '7',
      ecosystem: 'SEEDS',
      name: 'Education',
      description: '7-generation knowledge. Seeds of wisdom for tomorrow\'s forest.',
      role: 'Knowledge Seeds',
      category: 'education'
    },
    // Operations & Compliance
    {
      symbol: 'Su',
      weight: '24',
      ecosystem: 'TRAILS',
      name: 'Supply Chain',
      description: '24-hour trails. Ancient trade routes reimagined digitally.',
      role: 'Trade Routes',
      category: 'supply'
    },
    {
      symbol: 'Em',
      weight: '111',
      ecosystem: 'SIGNAL',
      name: 'Emergency',
      description: '111-second response. Smoke signals uniting communities in crisis.',
      role: 'Smoke Signals',
      category: 'emergency'
    },
    {
      symbol: 'Pr',
      weight: '5',
      ecosystem: 'HUNT',
      name: 'Procurement',
      description: '5% target achievement. Strategic hunting with patience.',
      role: 'Strategic Hunt',
      category: 'procurement'
    },
    {
      symbol: 'Re',
      weight: '∞',
      ecosystem: 'STORIES',
      name: 'Reporting',
      description: 'Infinite stories. Data preserved like oral traditions.',
      role: 'Story Keeping',
      category: 'reporting'
    }
  ]

  // Dynamic ecosystem health
  useEffect(() => {
    const interval = setInterval(() => {
      setEcosystemHealth(prev => {
        const target = 87 + Math.floor(Math.random() * 10)
        if (prev < target) return Math.min(prev + 1, target)
        if (prev > target) return Math.max(prev - 1, target)
        return prev
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Ecosystem health indicator */}
      <div className="ecosystem-health">
        <div className="health-label">Ecosystem Health</div>
        <div className="health-value">{ecosystemHealth}%</div>
      </div>

      {/* Seasonal indicator */}
      <div className="seasonal-indicator">
        <div className="season-label">Current Season</div>
        <div className="season-value">{currentSeason}</div>
        <div className="growth-stage">{growthStage}</div>
      </div>

      {/* Medicine Wheel Navigator */}
      <div className="medicine-wheel">
        <div className="wheel-container">
          <div className="wheel-segment wheel-east"></div>
          <div className="wheel-segment wheel-south"></div>
          <div className="wheel-segment wheel-west"></div>
          <div className="wheel-segment wheel-north"></div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-16 relative z-10">
        <h1 className="text-6xl font-thin tracking-tight mb-2 opacity-95">
          <span className="bg-gradient-to-r from-white to-teal-400 bg-clip-text text-transparent">
            Complete Elemental Ecosystem
          </span>
        </h1>
        <p className="text-2xl font-extralight tracking-[0.2em] uppercase text-teal-400 opacity-80">
          Where Economics Meets The Land
        </p>
        <p className="text-sm opacity-60 mt-4 text-teal-300">
          16 Elements · 80 Features · ∞ Possibilities
        </p>
      </div>

      {/* Land Wisdom Introduction */}
      <div className="relative z-10 bg-gradient-to-br from-green-500/5 to-purple-500/5 backdrop-blur-xl border border-green-500/20 rounded-2xl p-10 mb-16 text-center">
        <div className="text-2xl font-extralight italic opacity-80 mb-5 leading-relaxed">
          "The Earth does not belong to us. We belong to the Earth.<br/>
          Now we encode this truth into digital infrastructure."
        </div>
        <div className="text-sm uppercase tracking-wider opacity-50">
          Ancient Wisdom × Modern Technology
        </div>
      </div>

      {/* Element cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 relative z-10">
        {elements.map((element, index) => (
          <div 
            key={index}
            className={`element-card ${element.category} relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 pt-28 transition-all duration-400 cursor-pointer hover:translate-y-[-5px] hover:bg-white/[0.05] hover:border-white/[0.15] overflow-hidden`}
            style={{ '--element-color': getCategoryColor(element.category) } as React.CSSProperties}
          >
            {/* Top gradient line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r opacity-50"
                 style={{ background: `linear-gradient(90deg, var(--element-color), transparent)` }} />
            
            {/* Periodic element box */}
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-[70px] h-[70px] bg-black/50 backdrop-blur-md border rounded-xl flex flex-col items-center justify-center shadow-2xl"
                 style={{ borderColor: 'var(--element-color)' }}>
              <span className="text-2xl font-semibold" style={{ color: 'var(--element-color)' }}>
                {element.symbol}
              </span>
              <span className="text-[8px] opacity-50 uppercase tracking-[0.5px] mt-0.5">
                {element.ecosystem}
              </span>
              <span className="absolute bottom-1.5 right-1.5 text-[10px] font-bold opacity-80"
                    style={{ color: 'var(--element-color)' }}>
                {element.weight}
              </span>
            </div>

            {/* Element name with badge */}
            <h3 className="text-xl font-normal mb-2.5 text-center flex justify-center items-center">
              <span className="inline-block px-2 py-0.5 rounded text-white font-semibold text-lg mr-0.5 shadow-lg"
                    style={{ background: `linear-gradient(135deg, var(--element-color), rgba(0, 0, 0, 0.3))` }}>
                {element.symbol}
                <sup className="text-[8px] ml-0.5 opacity-80">{element.weight}</sup>
              </span>
              <span className="opacity-90">{element.name}</span>
            </h3>

            {/* Description */}
            <p className="text-[13px] leading-relaxed opacity-60 text-center mb-4">
              {element.description}
            </p>

            {/* Ecosystem role */}
            <div className="text-[11px] uppercase tracking-wider opacity-40 text-center pt-4 border-t border-white/5">
              {element.role}
            </div>
          </div>
        ))}
      </div>

      {/* Natural Law Economics */}
      <div className="relative z-10 bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-10 mb-16 text-center">
        <h2 className="text-3xl font-extralight mb-8 opacity-90">Natural Law Economics</h2>
        <div className="flex justify-center items-center gap-5 text-lg mb-8">
          <div className="bg-white/5 px-5 py-2.5 rounded-lg border border-white/10">
            Land Rights
          </div>
          <span className="text-2xl opacity-50">+</span>
          <div className="bg-white/5 px-5 py-2.5 rounded-lg border border-white/10">
            Digital Infrastructure
          </div>
          <span className="text-2xl opacity-50">=</span>
          <div className="bg-gradient-to-r from-teal-500/20 to-blue-500/20 px-5 py-2.5 rounded-lg border border-teal-500/30 font-semibold">
            Economic Sovereignty
          </div>
        </div>
        <p className="opacity-50 text-sm mt-5">
          When traditional territories meet modern technology, prosperity flows naturally
        </p>
      </div>

      {/* Forest Growth Stages */}
      <div className="relative z-10 bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-10 mb-16 text-center">
        <h2 className="text-3xl font-extralight mb-8 opacity-90">Forest Growth Protocol</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
          <div className="bg-white/5 px-4 py-3 rounded-lg border border-white/10">
            <div className="font-semibold mb-1">Pioneer Species</div>
            <div className="text-xs opacity-60">First 50 businesses</div>
          </div>
          <div className="bg-white/5 px-4 py-3 rounded-lg border border-white/10">
            <div className="font-semibold mb-1">Understory</div>
            <div className="text-xs opacity-60">500 businesses</div>
          </div>
          <div className="bg-white/5 px-4 py-3 rounded-lg border border-white/10">
            <div className="font-semibold mb-1">Canopy</div>
            <div className="text-xs opacity-60">5,000 businesses</div>
          </div>
          <div className="bg-white/5 px-4 py-3 rounded-lg border border-white/10">
            <div className="font-semibold mb-1">Old Growth</div>
            <div className="text-xs opacity-60">Permanent infrastructure</div>
          </div>
        </div>
      </div>

      {/* Final wisdom */}
      <div className="relative z-10 bg-gradient-to-br from-green-500/5 to-purple-500/5 backdrop-blur-xl border border-green-500/20 rounded-2xl p-10 mb-16 text-center">
        <div className="text-2xl font-extralight italic opacity-80 mb-5 leading-relaxed">
          "We're not building software.<br/>
          We're growing a digital forest where economics and ecology become one."
        </div>
        <div className="text-sm uppercase tracking-wider opacity-50">
          The Revolution Has Roots
        </div>
      </div>
    </>
  )
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    // Core Operations
    core: '#EF4444',
    verification: '#3B82F6',
    financial: '#F59E0B',
    matching: '#8B5CF6',
    // Intelligence & Environment
    environmental: '#EC4899',
    intelligence: '#14B8A6',
    network: '#14B8A6',
    wisdom: '#1E3A8A',
    // Governance & Knowledge
    knowledge: '#94A3B8',
    governance: '#10B981',
    collaboration: '#8B5CF6',
    education: '#FFD700',
    // Operations & Compliance
    supply: '#8B4513',
    emergency: '#FF4500',
    procurement: '#4169E1',
    reporting: '#C0C0C0'
  }
  return colors[category] || '#94A3B8'
}