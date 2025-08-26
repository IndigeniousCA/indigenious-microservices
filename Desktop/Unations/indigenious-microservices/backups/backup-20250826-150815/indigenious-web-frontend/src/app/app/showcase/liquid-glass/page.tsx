'use client'

import React from 'react'
import { BusinessDashboard } from '@/components/dashboards/BusinessDashboard'
import { LiquidGlass, LiquidGlassButton } from '@/components/ui/LiquidGlass'
import { Sparkles, Zap, TrendingUp } from 'lucide-react'

export default function LiquidGlassShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <LiquidGlass variant="aurora" intensity="strong" className="p-12 text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            <h1 className="text-5xl font-bold text-white">Liquid Glass UI</h1>
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
          <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
            Experience the future of UI design with physics-based glass effects. 
            Move your mouse to see real-time light refraction, specular highlights, and dynamic blur.
          </p>
          <div className="flex gap-4 justify-center">
            <LiquidGlassButton className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Apple iOS 26 Design, Today
            </LiquidGlassButton>
            <LiquidGlassButton className="border-2 border-green-400/30 bg-green-500/10">
              <TrendingUp className="w-4 h-4 inline mr-2" />
              5 Months Early
            </LiquidGlassButton>
          </div>
        </LiquidGlass>

        {/* Comparison Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">❌ Old Glass Components</h2>
            <div className="space-y-4 opacity-60">
              <div className="p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-2">Static Glass Panel</h3>
                <p className="text-white/60">Fixed blur, no interaction, basic transparency</p>
              </div>
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                <p className="text-white">Old Button Style</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">✅ New Liquid Glass</h2>
            <div className="space-y-4">
              <LiquidGlass variant="frost" intensity="medium" className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Dynamic Liquid Glass</h3>
                <p className="text-white/80">Physics-based animations, real-time refraction, edge distortion</p>
              </LiquidGlass>
              <LiquidGlassButton>
                Interactive Button with Physics
              </LiquidGlassButton>
            </div>
          </div>
        </div>

        {/* Variants Showcase */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Liquid Glass Variants</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <LiquidGlass variant="clear" intensity="medium" className="p-6 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Clear Variant</h3>
              <p className="text-white/70">Clean and minimal with subtle highlights</p>
            </LiquidGlass>

            <LiquidGlass variant="frost" intensity="medium" className="p-6 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Frost Variant</h3>
              <p className="text-white/70">Cool tones with icy appearance</p>
            </LiquidGlass>

            <LiquidGlass variant="aurora" intensity="medium" className="p-6 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Aurora Variant</h3>
              <p className="text-white/70">Northern lights inspired color shifts</p>
            </LiquidGlass>
          </div>
        </div>

        {/* Live Dashboard Demo */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Live Dashboard with Liquid Glass
          </h2>
          <LiquidGlass variant="clear" intensity="light" className="p-1">
            <BusinessDashboard businessType="indigenous-sme" experience="advanced" />
          </LiquidGlass>
        </div>

        {/* Migration Stats */}
        <div className="mt-12 text-center">
          <LiquidGlass variant="aurora" intensity="light" className="inline-block px-8 py-4">
            <p className="text-lg text-white">
              <strong className="text-2xl text-green-400">92</strong> components migrated • 
              <strong className="text-2xl text-blue-400 ml-2">100%</strong> physics-enabled • 
              <strong className="text-2xl text-purple-400 ml-2">0ms</strong> to Apple's release
            </p>
          </LiquidGlass>
        </div>
      </div>
    </div>
  )
}