'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Award, Star, Trophy, Target, Flame, Gift, 
  TrendingUp, Calendar, Users, Sparkles 
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import type { GamificationState, UserProfile } from '../types'

interface GamificationPanelProps {
  gamificationState: GamificationState
  userProfile: UserProfile
}

export function GamificationPanel({ gamificationState, userProfile }: GamificationPanelProps) {
  const nextLevelPoints = (gamificationState.level + 1) * 100
  const currentLevelPoints = gamificationState.level * 100
  const progressToNextLevel = ((gamificationState.points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100

  const getLevelTitle = (level: number) => {
    const titles = {
      1: 'Explorer',
      2: 'Navigator', 
      3: 'Pathfinder',
      4: 'Pioneer',
      5: 'Trailblazer',
      6: 'Master',
      7: 'Legend'
    }
    return titles[Math.min(level, 7) as keyof typeof titles] || 'Legend'
  }

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥'
    if (streak >= 14) return '⚡'
    if (streak >= 7) return '✨'
    return '💫'
  }

  const badgeColors = {
    'first-feature': 'from-green-500/20 to-blue-500/20 text-green-400',
    'explorer': 'from-blue-500/20 to-purple-500/20 text-blue-400',
    'early-adopter': 'from-purple-500/20 to-pink-500/20 text-purple-400',
    'power-user': 'from-orange-500/20 to-red-500/20 text-orange-400',
    'mentor': 'from-yellow-500/20 to-orange-500/20 text-yellow-400'
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Panel */}
      <GlassPanel className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Level Progress */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Level {gamificationState.level}
                </h2>
                <p className="text-blue-400 font-medium">
                  {getLevelTitle(gamificationState.level)}
                </p>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Progress to Level {gamificationState.level + 1}</span>
                <span className="text-white">
                  {gamificationState.points - currentLevelPoints} / {nextLevelPoints - currentLevelPoints} XP
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNextLevel}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {gamificationState.points}
              </div>
              <div className="text-sm text-white/60">Total Points</div>
            </div>
            
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-orange-400 flex items-center justify-center gap-1">
                {getStreakEmoji(gamificationState.streak)}
                {gamificationState.streak}
              </div>
              <div className="text-sm text-white/60">Day Streak</div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Achievements */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-400" />
            Achievements
          </h2>
          <span className="text-white/60 text-sm">
            {gamificationState.achievements.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gamificationState.achievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 bg-gradient-to-br ${
                badgeColors[achievement.id as keyof typeof badgeColors] || 
                'from-gray-500/20 to-gray-600/20 text-gray-400'
              } rounded-lg border border-current/30`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-current/20 rounded-lg flex items-center justify-center">
                  {achievement.icon === 'star' && <Star className="w-5 h-5" />}
                  {achievement.icon === 'compass' && <Target className="w-5 h-5" />}
                  {achievement.icon === 'trophy' && <Trophy className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-current">
                    {achievement.name}
                  </h3>
                  <p className="text-xs text-white/60">
                    {achievement.description}
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/50">
                Unlocked {achievement.unlockedAt.toLocaleDateString()}
              </p>
            </motion.div>
          ))}

          {/* Locked Achievement Placeholder */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg opacity-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white/40" />
              </div>
              <div>
                <h3 className="font-semibold text-white/60">
                  Feature Explorer
                </h3>
                <p className="text-xs text-white/40">
                  Try 5 different features
                </p>
              </div>
            </div>
            <p className="text-xs text-white/30">
              🔒 Locked
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Badges */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-green-400" />
            Badges
          </h2>
          <span className="text-white/60 text-sm">
            {gamificationState.badges.length} collected
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {gamificationState.badges.map((badge, index) => (
            <motion.div
              key={badge}  
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1, type: "spring" }}
              className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border-2 border-blue-400/30"
            >
              <Star className="w-8 h-8 text-blue-400" />
            </motion.div>
          ))}
        </div>
      </GlassPanel>

      {/* Recent Activity */}
      <GlassPanel className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-400" />
          Recent Activity
        </h2>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <Star className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">
                Earned <span className="font-semibold text-green-400">+50 XP</span> for trying AI Bid Assistant
              </p>
              <p className="text-white/50 text-xs">2 hours ago</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Award className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">
                Unlocked achievement: <span className="font-semibold text-blue-400">First Steps</span>
              </p>
              <p className="text-white/50 text-xs">1 day ago</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Flame className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">
                Started a <span className="font-semibold text-purple-400">3-day streak</span>
              </p>
              <p className="text-white/50 text-xs">3 days ago</p>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Challenges */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-400" />
            Weekly Challenges
          </h2>
          <span className="text-white/60 text-sm">
            2 days left
          </span>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">Feature Explorer</h3>
              <span className="text-purple-400 text-sm">1/3 complete</span>
            </div>
            <p className="text-white/60 text-sm mb-3">
              Try 3 different features this week
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-blue-500" />
              </div>
              <span className="text-purple-400 text-sm font-medium">+200 XP</span>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-400/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">Community Helper</h3>
              <span className="text-green-400 text-sm">0/1 complete</span>
            </div>
            <p className="text-white/60 text-sm mb-3">
              Share a success story or help another user
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-gradient-to-r from-green-500 to-blue-500" />
              </div>
              <span className="text-green-400 text-sm font-medium">+150 XP</span>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}