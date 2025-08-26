'use client'

import React, { useState } from 'react'

interface Element {
  id: number
  symbol: string
  name: string
  type: string
  description: string
}

export const ExactElementalCards: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null)

  // EXACT elements from your HTML
  const elements: Element[] = [
    { id: 1, symbol: "Wt", name: "Water", type: "primary", description: "Authentication & User Flow - The flowing river of user journeys" },
    { id: 2, symbol: "Er", name: "Earth", type: "primary", description: "Data Persistence - Solid foundations of information storage" },
    { id: 3, symbol: "Fr", name: "Fire", type: "primary", description: "Analytics & Transformation - The spark of insight and change" },
    { id: 4, symbol: "Ar", name: "Air", type: "primary", description: "Communication - Messages carried on the wind" },
    { id: 5, symbol: "Lf", name: "Life", type: "growth", description: "Business Growth - Organic scaling and evolution" },
    { id: 6, symbol: "Sp", name: "Spirit", type: "sacred", description: "Cultural Values - The essence of Indigenous wisdom" },
    { id: 7, symbol: "Rt", name: "Root", type: "foundation", description: "Infrastructure - Deep connections that anchor the system" },
    { id: 8, symbol: "Fl", name: "Flow", type: "movement", description: "Payment Streams - Value circulating like water" },
    { id: 9, symbol: "Cy", name: "Cycle", type: "circular", description: "Circular Economy - Regenerative business models" },
    { id: 10, symbol: "Cn", name: "Connect", type: "network", description: "Relationships - The mycelial network of community" },
    { id: 11, symbol: "Bl", name: "Balance", type: "harmony", description: "Sustainability - Equilibrium between profit and planet" },
    { id: 12, symbol: "Gw", name: "Growth", type: "expansion", description: "Scaling - Natural expansion patterns" },
    { id: 13, symbol: "Tr", name: "Transform", type: "change", description: "Innovation - Metamorphosis and adaptation" },
    { id: 14, symbol: "Hn", name: "Honor", type: "respect", description: "Ethics - Respect for land and people" },
    { id: 15, symbol: "Ws", name: "Wisdom", type: "knowledge", description: "Elder Knowledge - Traditional ecological wisdom" },
    { id: 16, symbol: "Hm", name: "Harmony", type: "unity", description: "Integration - All elements working as one" }
  ]

  const getElementColor = (type: string): string => {
    const colors: Record<string, string> = {
      primary: 'from-blue-600 to-blue-800',
      growth: 'from-green-600 to-green-800',
      sacred: 'from-purple-600 to-purple-800',
      foundation: 'from-amber-700 to-amber-900',
      movement: 'from-cyan-600 to-cyan-800',
      circular: 'from-teal-600 to-teal-800',
      network: 'from-indigo-600 to-indigo-800',
      harmony: 'from-emerald-600 to-emerald-800',
      expansion: 'from-lime-600 to-lime-800',
      change: 'from-orange-600 to-orange-800',
      respect: 'from-rose-600 to-rose-800',
      knowledge: 'from-violet-600 to-violet-800',
      unity: 'from-sky-600 to-sky-800'
    }
    return colors[type] || 'from-gray-600 to-gray-800'
  }

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Elemental Business Ecosystem</h1>
        <p className="text-gray-300">Where Traditional Wisdom Meets Modern Commerce</p>
      </div>

      {/* Periodic Table Grid - EXACT layout */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 max-w-6xl mx-auto">
        {elements.map((element) => (
          <div
            key={element.id}
            onClick={() => setSelectedElement(element)}
            className={`
              relative group cursor-pointer
              bg-gradient-to-br ${getElementColor(element.type)}
              rounded-lg p-3 border border-white/20
              transform transition-all duration-300
              hover:scale-110 hover:z-10 hover:shadow-2xl
              backdrop-blur-sm bg-opacity-80
            `}
          >
            <div className="text-center">
              <div className="text-xs text-white/60 mb-1">{element.id}</div>
              <div className="text-2xl font-bold text-white mb-1">{element.symbol}</div>
              <div className="text-xs text-white/80">{element.name}</div>
            </div>
            
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          </div>
        ))}
      </div>

      {/* Element Detail Modal - Clean and Simple */}
      {selectedElement && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedElement(null)}
        >
          <div 
            className={`bg-gradient-to-br ${getElementColor(selectedElement.type)} 
                       rounded-xl p-6 max-w-md w-full border border-white/20
                       transform transition-all duration-300`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{selectedElement.symbol}</div>
              <h2 className="text-2xl font-semibold text-white mb-4">{selectedElement.name}</h2>
              <p className="text-white/90 leading-relaxed">{selectedElement.description}</p>
              <button
                onClick={() => setSelectedElement(null)}
                className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 
                         text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}