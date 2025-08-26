'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  Building2, 
  Shield, 
  TrendingUp, 
  Users, 
  FileText, 
  DollarSign,
  Briefcase,
  Award,
  Globe,
  ArrowRight,
  CheckCircle,
  Target,
  Zap,
  Heart
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse delay-300" />
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full blur-3xl opacity-20 animate-pulse delay-700" />
        </div>

        {/* Navigation */}
        <nav className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <Globe className="h-8 w-8 text-white" />
                <span className="text-2xl font-bold text-white">Indigenous Procurement</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
              >
                <Link href="/auth/login">
                  <GlassButton variant="secondary" size="sm">
                    Sign In
                  </GlassButton>
                </Link>
                <Link href="/auth/register">
                  <GlassButton variant="primary" size="sm">
                    Get Started
                  </GlassButton>
                </Link>
              </motion.div>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Empowering Indigenous
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Economic Sovereignty
              </span>
            </h1>
            <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto">
              Connect Indigenous businesses with procurement opportunities. 
              Meet the 5% target. Build stronger communities together.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <GlassButton size="lg" className="group">
                  <span>Start Your Journey</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </GlassButton>
              </Link>
              <Link href="/demo">
                <GlassButton variant="secondary" size="lg">
                  View Demo
                </GlassButton>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { label: 'Indigenous Businesses', value: '3,847+', icon: Building2, color: 'blue' },
              { label: 'Active RFQs', value: '$2.3B', icon: FileText, color: 'purple' },
              { label: 'Communities Served', value: '630+', icon: Users, color: 'green' },
              { label: 'Jobs Created', value: '12,500+', icon: Briefcase, color: 'amber' }
            ].map((stat, index) => (
              <GlassCard 
                key={index} 
                delay={index * 100}
                glowColor={stat.color as any}
                intensity="prominent"
                className="h-full"
              >
                <div className="p-6 text-center">
                  <stat.icon className="h-8 w-8 text-white/80 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/70 mt-1">{stat.label}</div>
                </div>
              </GlassCard>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for Success
            </h2>
            <p className="text-xl text-white/70">
              Everything you need to thrive in the procurement ecosystem
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: 'Smart Matching',
                description: 'AI-powered RFQ matching connects you with the right opportunities',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Shield,
                title: 'Verified Network',
                description: 'Secure, verified Indigenous business directory with cultural protocols',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: TrendingUp,
                title: 'Growth Analytics',
                description: 'Track your progress, measure impact, and grow your business',
                color: 'from-green-500 to-emerald-500'
              },
              {
                icon: Users,
                title: 'Community First',
                description: 'Band-controlled procurement weights honor community values',
                color: 'from-orange-500 to-red-500'
              },
              {
                icon: Zap,
                title: 'Fast & Simple',
                description: 'Streamlined processes designed for busy business owners',
                color: 'from-yellow-500 to-orange-500'
              },
              {
                icon: Heart,
                title: 'Cultural Respect',
                description: 'Built with Indigenous values and protocols at the core',
                color: 'from-pink-500 to-rose-500'
              }
            ].map((feature, index) => (
              <GlassCard
                key={index}
                delay={index * 100}
                glowColor={
                  feature.color.includes('blue') ? 'blue' :
                  feature.color.includes('purple') ? 'purple' :
                  feature.color.includes('green') ? 'green' :
                  feature.color.includes('orange') ? 'amber' :
                  'pink'
                }
                intensity="regular"
                className="h-full"
              >
                <div className="p-8">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} p-3 mb-4`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/70">{feature.description}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <GlassCard intensity="intense" glowColor="purple" floating={true}>
            <div className="p-12 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <Award className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4">
                  Join 3,847+ Indigenous Businesses
                </h2>
                <p className="text-xl text-white/80 mb-8">
                  Free for Indigenous SMEs. Start winning contracts today.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <Link href="/auth/register">
                    <GlassButton size="lg" variant="primary">
                      Register Your Business
                    </GlassButton>
                  </Link>
                  <div className="flex items-center gap-2 text-white/70">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span>No credit card required</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-6 w-6 text-white" />
                <span className="font-semibold text-white">Indigenous Procurement</span>
              </div>
              <p className="text-white/60 text-sm">
                Building economic sovereignty through procurement
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/security" className="hover:text-white">Security</Link></li>
                <li><Link href="/api" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><Link href="/guides" className="hover:text-white">Guides</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/support" className="hover:text-white">Support</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/accessibility" className="hover:text-white">Accessibility</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/60 text-sm">
            <p>© 2025 Indigenous Procurement Platform. All rights reserved.</p>
            <p className="mt-2">Built with respect on Treaty territories across Turtle Island</p>
          </div>
        </div>
      </footer>
    </div>
  );
}