// Forum Board Component
// Community discussion forums with categories and topics

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Pin, Lock, Bell, Search, Filter, Plus,
  TrendingUp, Clock, Users, ChevronRight, Tag, Paperclip,
  ThumbsUp, MessageCircle, Eye, AlertCircle, CheckCircle,
  Star, Bookmark, Share, MoreHorizontal, Edit, Trash2
} from 'lucide-react'
import { ForumCategory, ForumTopic, ForumPost } from '../types/community.types'

export function ForumBoard() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'unanswered'>('latest')

  // Mock categories
  const categories: ForumCategory[] = [
    {
      id: 'cat-1',
      name: 'Procurement Tips & Strategies',
      description: 'Share your experiences and learn from others about winning government contracts',
      icon: 'briefcase',
      slug: 'procurement-tips',
      order: 1,
      isPrivate: false,
      stats: {
        topics: 156,
        posts: 1234,
        lastActivity: '2 hours ago'
      }
    },
    {
      id: 'cat-2',
      name: 'Business Development',
      description: 'Growing your Indigenous business in the modern economy',
      icon: 'trending-up',
      slug: 'business-development',
      order: 2,
      isPrivate: false,
      stats: {
        topics: 89,
        posts: 567,
        lastActivity: '30 minutes ago'
      }
    },
    {
      id: 'cat-3',
      name: 'Cultural Protocols',
      description: 'Respecting traditions while conducting business',
      icon: 'feather',
      slug: 'cultural-protocols',
      order: 3,
      isPrivate: false,
      stats: {
        topics: 45,
        posts: 234,
        lastActivity: '1 day ago'
      }
    },
    {
      id: 'cat-4',
      name: 'Tech & Innovation',
      description: 'Digital transformation and technology adoption',
      icon: 'cpu',
      slug: 'tech-innovation',
      order: 4,
      isPrivate: false,
      stats: {
        topics: 67,
        posts: 432,
        lastActivity: '5 hours ago'
      }
    }
  ]

  // Mock topics
  const mockTopics: ForumTopic[] = [
    {
      id: 'topic-1',
      categoryId: 'cat-1',
      title: 'How to write a winning executive summary for government RFQs',
      content: 'I\'ve been struggling with executive summaries. What are your best practices?',
      authorId: 'user-1',
      authorName: 'Sarah Johnson',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      isPinned: true,
      isLocked: false,
      isAnnouncement: false,
      tags: ['rfq', 'tips', 'writing'],
      views: 234,
      replies: 12,
      lastReplyAt: '2024-01-15T14:30:00Z',
      lastReplyBy: 'Michael Red Eagle'
    },
    {
      id: 'topic-2',
      categoryId: 'cat-1',
      title: 'Indigenous set-aside opportunities - Where to find them?',
      content: 'Looking for resources to find Indigenous-specific procurement opportunities.',
      authorId: 'user-2',
      authorName: 'John Bear',
      createdAt: '2024-01-14T15:00:00Z',
      updatedAt: '2024-01-14T15:00:00Z',
      isPinned: false,
      isLocked: false,
      isAnnouncement: false,
      tags: ['opportunities', 'set-aside'],
      views: 156,
      replies: 8,
      lastReplyAt: '2024-01-15T09:00:00Z',
      lastReplyBy: 'Lisa White Feather'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md 
        border border-blue-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Community Forums</h2>
            <p className="text-white/70">
              Connect, share knowledge, and grow together
            </p>
          </div>
          
          <button
            onClick={() => setShowNewTopic(true)}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
              border-blue-400/50 rounded-lg text-blue-200 transition-colors 
              flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Topic</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search topics..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                rounded-lg text-white placeholder-white/50 focus:outline-none 
                focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as unknown)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="latest" className="bg-gray-800">Latest Activity</option>
            <option value="popular" className="bg-gray-800">Most Popular</option>
            <option value="unanswered" className="bg-gray-800">Unanswered</option>
          </select>

          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
            border-white/20 rounded-lg text-white transition-colors 
            flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {!selectedCategory ? (
        // Category List
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedCategory(category.id)}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                p-6 hover:bg-white/15 transition-all cursor-pointer hover:scale-105"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                    <p className="text-white/60 text-sm mt-1">{category.description}</p>
                  </div>
                </div>
                
                <ChevronRight className="w-5 h-5 text-white/40" />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-2xl font-bold text-white">{category.stats.topics}</p>
                  <p className="text-white/60 text-sm">Topics</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{category.stats.posts}</p>
                  <p className="text-white/60 text-sm">Posts</p>
                </div>
                <div>
                  <p className="text-white text-sm">{category.stats.lastActivity}</p>
                  <p className="text-white/60 text-sm">Last Activity</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : !selectedTopic ? (
        // Topic List
        <div className="space-y-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Back to Categories</span>
          </button>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-semibold text-white">
                {categories.find(c => c.id === selectedCategory)?.name}
              </h3>
              <p className="text-white/60 text-sm mt-1">
                {categories.find(c => c.id === selectedCategory)?.description}
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {mockTopics
                .filter(topic => topic.categoryId === selectedCategory)
                .map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {topic.isPinned && (
                            <Pin className="w-4 h-4 text-amber-400" />
                          )}
                          {topic.isLocked && (
                            <Lock className="w-4 h-4 text-red-400" />
                          )}
                          <h4 className="text-white font-medium hover:text-blue-300 transition-colors">
                            {topic.title}
                          </h4>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span>by {topic.authorName}</span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{topic.views}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>{topic.replies}</span>
                          </span>
                          <span>•</span>
                          <span>Last: {topic.lastReplyBy}</span>
                        </div>

                        {topic.tags.length > 0 && (
                          <div className="flex items-center space-x-2 mt-2">
                            {topic.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-blue-500/20 text-blue-300 
                                  text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-white/40 ml-4" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        // Topic View
        <div className="space-y-4">
          <button
            onClick={() => setSelectedTopic(null)}
            className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Back to Topics</span>
          </button>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{selectedTopic.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-white/60">
                  <span>by {selectedTopic.authorName}</span>
                  <span>•</span>
                  <span>{new Date(selectedTopic.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>{selectedTopic.views} views</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Bookmark className="w-4 h-4 text-white/60" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Share className="w-4 h-4 text-white/60" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Bell className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-white/80">{selectedTopic.content}</p>
            </div>

            {selectedTopic.tags.length > 0 && (
              <div className="flex items-center space-x-2 mt-4">
                <Tag className="w-4 h-4 text-white/60" />
                {selectedTopic.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Quick Reply */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="text-white font-medium mb-3">Quick Reply</h4>
              <textarea
                placeholder="Share your thoughts..."
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-white/50 focus:outline-none focus:ring-2 
                  focus:ring-blue-400 resize-none"
                rows={4}
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-white/10 rounded transition-colors">
                    <Paperclip className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-400/50 rounded-lg text-blue-200 transition-colors">
                  Post Reply
                </button>
              </div>
            </div>
          </div>

          {/* Mock Replies */}
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-purple-300 font-medium">MR</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white font-medium">Michael Red Eagle</span>
                      <span className="text-white/60 text-sm ml-2">2 hours ago</span>
                    </div>
                    <button className="p-1 hover:bg-white/10 rounded transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                  <p className="text-white/80">
                    Great question! I've found that starting with a clear value proposition 
                    works best. Focus on outcomes rather than just capabilities.
                  </p>
                  <div className="flex items-center space-x-4 mt-3">
                    <button className="flex items-center space-x-1 text-white/60 
                      hover:text-white transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">5</span>
                    </button>
                    <button className="text-white/60 hover:text-white transition-colors text-sm">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Topic Modal */}
      <AnimatePresence>
        {showNewTopic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewTopic(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Create New Topic</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-white/80 text-sm mb-1 block">Category</label>
                  <select className="w-full px-3 py-2 bg-white/10 border border-white/20 
                    rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-gray-800">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-1 block">Title</label>
                  <input
                    type="text"
                    placeholder="What's your topic about?"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-1 block">Content</label>
                  <textarea
                    placeholder="Share your thoughts, questions, or insights..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400 resize-none"
                    rows={6}
                  />
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-1 block">Tags</label>
                  <input
                    type="text"
                    placeholder="Add tags separated by commas"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewTopic(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                    border-white/20 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-400/50 rounded-lg text-blue-200 transition-colors">
                  Create Topic
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}