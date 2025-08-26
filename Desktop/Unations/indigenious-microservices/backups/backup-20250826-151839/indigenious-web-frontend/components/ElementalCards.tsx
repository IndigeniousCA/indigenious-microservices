'use client'

import React, { useEffect, useState } from 'react'
import { useElemental } from '../contexts/ElementalContext'

interface ElementCard {
  symbol: string
  name: string
  atomicNumber: number
  category: string
  meaning: string
  color: string
  element: string
  features?: string[]
}

export const ElementalCards: React.FC = () => {
  const { emitRipple } = useElemental()
  const [elements, setElements] = useState<ElementCard[]>([])
  const [selectedElement, setSelectedElement] = useState<ElementCard | null>(null)
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)

  useEffect(() => {
    // Fetch elements from design system
    fetchElements()
  }, [])

  const fetchElements = async () => {
    try {
      const response = await fetch('http://localhost:3007/api/elements')
      const data = await response.json()
      
      // Map to periodic table format with atomic numbers
      const mappedElements = data.components.map((comp: any, index: number) => ({
        ...comp,
        atomicNumber: index + 1,
        color: getCategoryColor(comp.category),
        features: getElementFeatures(comp.element)
      }))
      
      setElements(mappedElements)
    } catch (error) {
      console.error('Failed to fetch elements:', error)
      // Use fallback elements
      setElements(getDefaultElements())
    }
  }

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Foundation': 'from-blue-500 to-blue-700',
      'Growth': 'from-green-500 to-green-700',
      'Power': 'from-yellow-500 to-yellow-700',
      'Knowledge': 'from-purple-500 to-purple-700',
      'Social': 'from-pink-500 to-pink-700',
      'Economics': 'from-orange-500 to-orange-700',
      'Direction': 'from-red-500 to-red-700',
      'Wisdom': 'from-indigo-500 to-indigo-700',
      'Culture': 'from-teal-500 to-teal-700'
    }
    return colors[category] || 'from-gray-500 to-gray-700'
  }

  const getElementFeatures = (element: string): string[] => {
    const features: Record<string, string[]> = {
      water: ['Authentication', 'User Flows', 'Payment Streams'],
      earth: ['Data Storage', 'Foundations', 'Persistence'],
      fire: ['Real-time Updates', 'Analytics', 'Transformation'],
      air: ['Messaging', 'Notifications', 'Communication'],
      life: ['Growth Systems', 'Scaling', 'Evolution'],
      energy: ['Performance', 'Resources', 'Distribution'],
      information: ['Knowledge Base', 'Intelligence', 'Insights'],
      connection: ['Networking', 'Relationships', 'Community'],
      cycle: ['Circular Economy', 'Renewability', 'Loops'],
      flow: ['Value Streams', 'Economics', 'Circulation'],
      purpose: ['Mission', 'Goals', 'Alignment'],
      balance: ['Harmony', 'Sustainability', 'Equilibrium'],
      wisdom: ['Elder Knowledge', 'Traditional Systems', 'Guidance'],
      beauty: ['Design', 'Aesthetics', 'Expression'],
      harmony: ['Synchronization', 'Coherence', 'Unity'],
      spirit: ['Values', 'Culture', 'Essence']
    }
    return features[element] || []
  }

  const getDefaultElements = (): ElementCard[] => [
    { symbol: "🌊", name: "Re", atomicNumber: 1, category: "Foundation", meaning: "Water - User flows", color: "from-blue-500 to-blue-700", element: "water" },
    { symbol: "🌍", name: "Tu", atomicNumber: 2, category: "Foundation", meaning: "Earth - Data persistence", color: "from-blue-500 to-blue-700", element: "earth" },
    { symbol: "🔥", name: "Af", atomicNumber: 3, category: "Foundation", meaning: "Fire - Real-time processing", color: "from-blue-500 to-blue-700", element: "fire" },
    { symbol: "💨", name: "Ai", atomicNumber: 4, category: "Foundation", meaning: "Air - Communication", color: "from-blue-500 to-blue-700", element: "air" },
    { symbol: "🌱", name: "Li", atomicNumber: 5, category: "Growth", meaning: "Life - Growth systems", color: "from-green-500 to-green-700", element: "life" },
    { symbol: "⚡", name: "En", atomicNumber: 6, category: "Power", meaning: "Energy - Resource management", color: "from-yellow-500 to-yellow-700", element: "energy" },
    { symbol: "📊", name: "In", atomicNumber: 7, category: "Knowledge", meaning: "Information - Data intelligence", color: "from-purple-500 to-purple-700", element: "information" },
    { symbol: "🤝", name: "Co", atomicNumber: 8, category: "Social", meaning: "Connection - Relationships", color: "from-pink-500 to-pink-700", element: "connection" },
    { symbol: "🔄", name: "Cy", atomicNumber: 9, category: "Economics", meaning: "Cycle - Circular economy", color: "from-orange-500 to-orange-700", element: "cycle" },
    { symbol: "🌀", name: "Fl", atomicNumber: 10, category: "Economics", meaning: "Flow - Value streams", color: "from-orange-500 to-orange-700", element: "flow" },
    { symbol: "🎯", name: "Pu", atomicNumber: 11, category: "Direction", meaning: "Purpose - Mission alignment", color: "from-red-500 to-red-700", element: "purpose" },
    { symbol: "⚖️", name: "Ba", atomicNumber: 12, category: "Wisdom", meaning: "Balance - Harmony", color: "from-indigo-500 to-indigo-700", element: "balance" },
    { symbol: "🧠", name: "Wi", atomicNumber: 13, category: "Wisdom", meaning: "Wisdom - Elder knowledge", color: "from-indigo-500 to-indigo-700", element: "wisdom" },
    { symbol: "🎨", name: "Be", atomicNumber: 14, category: "Culture", meaning: "Beauty - Aesthetic design", color: "from-teal-500 to-teal-700", element: "beauty" },
    { symbol: "🎵", name: "Ha", atomicNumber: 15, category: "Culture", meaning: "Harmony - Synchronization", color: "from-teal-500 to-teal-700", element: "harmony" },
    { symbol: "🌟", name: "Sp", atomicNumber: 16, category: "Culture", meaning: "Spirit - Core values", color: "from-teal-500 to-teal-700", element: "spirit" }
  ]

  const handleElementClick = (element: ElementCard, event: React.MouseEvent) => {
    setSelectedElement(element)
    emitRipple(event.clientX, event.clientY, 2)
  }

  return (
    <div className="relative">
      {/* Periodic Table Grid */}
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 p-6">
        {elements.map((element) => (
          <div
            key={element.atomicNumber}
            className={`
              relative group cursor-pointer transform transition-all duration-300
              ${hoveredElement === element.name ? 'scale-110 z-20' : 'scale-100'}
              ${selectedElement?.name === element.name ? 'ring-4 ring-white ring-opacity-60' : ''}
            `}
            onMouseEnter={() => setHoveredElement(element.name)}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={(e) => handleElementClick(element, e)}
          >
            {/* Element Card */}
            <div className={`
              relative overflow-hidden rounded-lg bg-gradient-to-br ${element.color}
              backdrop-blur-md border border-white border-opacity-20
              shadow-lg hover:shadow-2xl transition-all duration-300
              aspect-square flex flex-col items-center justify-center p-2
            `}>
              {/* Atomic Number */}
              <div className="absolute top-1 left-1 text-xs text-white opacity-70">
                {element.atomicNumber}
              </div>
              
              {/* Symbol */}
              <div className="text-3xl mb-1">
                {element.symbol}
              </div>
              
              {/* Element Name */}
              <div className="text-sm font-bold text-white">
                {element.name}
              </div>
              
              {/* Category Badge */}
              <div className="absolute bottom-1 right-1 text-xs bg-black bg-opacity-30 px-1 rounded text-white opacity-70">
                {element.category}
              </div>
              
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              
              {/* Pulse Animation */}
              {hoveredElement === element.name && (
                <div className="absolute inset-0 animate-pulse bg-white opacity-10" />
              )}
            </div>
            
            {/* Tooltip on Hover */}
            {hoveredElement === element.name && (
              <div className="absolute z-30 bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                            bg-gray-900 bg-opacity-95 text-white p-3 rounded-lg 
                            min-w-[200px] pointer-events-none">
                <div className="text-sm font-semibold mb-1">{element.meaning}</div>
                {element.features && element.features.length > 0 && (
                  <div className="text-xs opacity-80">
                    {element.features.slice(0, 3).join(' • ')}
                  </div>
                )}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                              border-4 border-transparent border-t-gray-900 border-opacity-95" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Element Detail Modal */}
      {selectedElement && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedElement(null)}
        >
          <div 
            className={`bg-gradient-to-br ${selectedElement.color} 
                       rounded-2xl p-8 max-w-md w-full shadow-2xl
                       transform transition-all duration-300 scale-100`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-white">
              <div className="text-6xl mb-4">{selectedElement.symbol}</div>
              <h2 className="text-3xl font-bold mb-2">
                {selectedElement.name} - {selectedElement.element}
              </h2>
              <p className="text-lg mb-4 opacity-90">{selectedElement.meaning}</p>
              
              {selectedElement.features && selectedElement.features.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xl font-semibold mb-3">Platform Features:</h3>
                  <div className="space-y-2">
                    {selectedElement.features.map((feature, index) => (
                      <div key={index} className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setSelectedElement(null)}
                className="mt-6 px-6 py-2 bg-white bg-opacity-20 rounded-lg
                         hover:bg-opacity-30 transition-colors duration-200"
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