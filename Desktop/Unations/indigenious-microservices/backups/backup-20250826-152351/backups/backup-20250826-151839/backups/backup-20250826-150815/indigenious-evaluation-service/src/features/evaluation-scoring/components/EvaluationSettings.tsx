// Evaluation Settings Component
// Configure evaluation parameters and criteria

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, X, Save, Plus, Trash2, GripVertical,
  Eye, EyeOff, Users, Shield, Clock, Calculator
} from 'lucide-react'
import type { Evaluation, EvaluationCriterion } from '../types/evaluation.types'

interface EvaluationSettingsProps {
  evaluation: Evaluation
  onClose: () => void
}

export function EvaluationSettings({ evaluation, onClose }: EvaluationSettingsProps) {
  const [settings, setSettings] = useState(evaluation.settings)
  const [criteria, setCriteria] = useState(evaluation.criteria)
  const [activeTab, setActiveTab] = useState<'general' | 'criteria' | 'permissions'>('general')
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Update setting
  const updateSetting = (key: string, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setUnsavedChanges(true)
  }

  // Add criterion
  const addCriterion = () => {
    const newCriterion: EvaluationCriterion = {
      id: Date.now().toString(),
      name: 'New Criterion',
      category: 'other',
      weight: 10,
      maxPoints: 10,
      description: ''
    }
    setCriteria([...criteria, newCriterion])
    setUnsavedChanges(true)
  }

  // Update criterion
  const updateCriterion = (id: string, updates: Partial<EvaluationCriterion>) => {
    setCriteria(prev => 
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    )
    setUnsavedChanges(true)
  }

  // Delete criterion
  const deleteCriterion = (id: string) => {
    setCriteria(prev => prev.filter(c => c.id !== id))
    setUnsavedChanges(true)
  }

  // Reorder criteria
  const reorderCriteria = (fromIndex: number, toIndex: number) => {
    const reordered = [...criteria]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setCriteria(reordered)
    setUnsavedChanges(true)
  }

  // Save changes
  const saveChanges = () => {
    // Would save to backend
    setUnsavedChanges(false)
    onClose()
  }

  // Calculate total weight
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-white" />
              <h2 className="text-xl font-semibold text-white">Evaluation Settings</h2>
            </div>
            <div className="flex items-center space-x-3">
              {unsavedChanges && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={saveChanges}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                    border-blue-400/50 rounded-lg text-blue-100 font-medium 
                    transition-all duration-200 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </motion.button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 p-1 bg-white/5 m-6 mb-0 rounded-xl">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'general'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('criteria')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'criteria'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Criteria
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'permissions'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Permissions
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <AnimatePresence mode="wait">
              {activeTab === 'general' && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Evaluation Type */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Evaluation Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'individual', label: 'Individual', icon: Users },
                        { value: 'consensus', label: 'Consensus', icon: Users },
                        { value: 'committee', label: 'Committee', icon: Users }
                      ].map(type => (
                        <button
                          key={type.value}
                          onClick={() => updateSetting('evaluationType', type.value)}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            settings.evaluationType === type.value
                              ? 'bg-blue-500/20 border-blue-400/50 text-blue-100'
                              : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <type.icon className="w-6 h-6 mx-auto mb-2" />
                          <p className="text-sm font-medium">{type.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blind Evaluation */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <EyeOff className="w-5 h-5 text-white/60" />
                        <div>
                          <p className="font-medium text-white">Blind Evaluation</p>
                          <p className="text-sm text-white/60">
                            Hide bidder names during evaluation
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.blindEvaluation}
                        onChange={(e) => updateSetting('blindEvaluation', e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                  </div>

                  {/* Show Bidder Names */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <Eye className="w-5 h-5 text-white/60" />
                        <div>
                          <p className="font-medium text-white">Show Bidder Names</p>
                          <p className="text-sm text-white/60">
                            Display company names in evaluation interface
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.showBidderNames}
                        onChange={(e) => updateSetting('showBidderNames', e.target.checked)}
                        disabled={settings.blindEvaluation}
                        className="w-5 h-5 rounded disabled:opacity-30"
                      />
                    </label>
                  </div>

                  {/* Scoring Method */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Scoring Method
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'points', label: 'Points-based', desc: 'Score each criterion with points' },
                        { value: 'ranking', label: 'Ranking', desc: 'Rank bids from best to worst' },
                        { value: 'pass-fail', label: 'Pass/Fail', desc: 'Binary evaluation for each criterion' }
                      ].map(method => (
                        <label
                          key={method.value}
                          className="flex items-center p-3 bg-white/5 hover:bg-white/10 
                            rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="radio"
                            name="scoringMethod"
                            value={method.value}
                            checked={settings.scoringMethod === method.value}
                            onChange={(e) => updateSetting('scoringMethod', e.target.value)}
                            className="mr-3"
                          />
                          <div>
                            <p className="font-medium text-white">{method.label}</p>
                            <p className="text-sm text-white/60">{method.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Evaluation Deadline */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Evaluation Deadline
                    </label>
                    <input
                      type="datetime-local"
                      value={settings.evaluationDeadline || ''}
                      onChange={(e) => updateSetting('evaluationDeadline', e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                        text-white placeholder-white/40 focus:border-blue-400/50 
                        focus:outline-none transition-colors"
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'criteria' && (
                <motion.div
                  key="criteria"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Weight Summary */}
                  <div className={`p-4 rounded-xl ${
                    totalWeight === 100
                      ? 'bg-emerald-500/10 border border-emerald-400/30'
                      : 'bg-amber-500/10 border border-amber-400/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calculator className="w-5 h-5 text-white/60" />
                        <span className="font-medium text-white">Total Weight</span>
                      </div>
                      <span className={`text-lg font-bold ${
                        totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {totalWeight}%
                      </span>
                    </div>
                    {totalWeight !== 100 && (
                      <p className="text-sm text-amber-300 mt-1">
                        Weights must total 100%
                      </p>
                    )}
                  </div>

                  {/* Criteria List */}
                  <div className="space-y-3">
                    {criteria.map((criterion, index) => (
                      <motion.div
                        key={criterion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white/5 rounded-xl p-4"
                      >
                        <div className="flex items-start space-x-3">
                          {/* Drag Handle */}
                          <button className="p-1 hover:bg-white/10 rounded cursor-move">
                            <GripVertical className="w-4 h-4 text-white/40" />
                          </button>

                          {/* Criterion Details */}
                          <div className="flex-1 space-y-3">
                            {/* Name and Category */}
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={criterion.name}
                                onChange={(e) => updateCriterion(criterion.id, { name: e.target.value })}
                                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                                  text-white placeholder-white/40 focus:border-blue-400/50 
                                  focus:outline-none transition-colors"
                                placeholder="Criterion name"
                              />
                              <select
                                value={criterion.category}
                                onChange={(e) => updateCriterion(criterion.id, { category: e.target.value as unknown })}
                                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                                  text-white focus:border-blue-400/50 focus:outline-none 
                                  transition-colors appearance-none"
                              >
                                <option value="price" className="bg-gray-800">Price</option>
                                <option value="technical" className="bg-gray-800">Technical</option>
                                <option value="experience" className="bg-gray-800">Experience</option>
                                <option value="indigenous_content" className="bg-gray-800">Indigenous Content</option>
                                <option value="sustainability" className="bg-gray-800">Sustainability</option>
                                <option value="local_benefit" className="bg-gray-800">Local Benefit</option>
                                <option value="innovation" className="bg-gray-800">Innovation</option>
                                <option value="other" className="bg-gray-800">Other</option>
                              </select>
                            </div>

                            {/* Weight and Max Points */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-white/60">Weight (%)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={criterion.weight}
                                  onChange={(e) => updateCriterion(criterion.id, { weight: parseInt(e.target.value) || 0 })}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                                    text-white placeholder-white/40 focus:border-blue-400/50 
                                    focus:outline-none transition-colors"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-white/60">Max Points</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={criterion.maxPoints}
                                  onChange={(e) => updateCriterion(criterion.id, { maxPoints: parseInt(e.target.value) || 1 })}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                                    text-white placeholder-white/40 focus:border-blue-400/50 
                                    focus:outline-none transition-colors"
                                />
                              </div>
                            </div>

                            {/* Description */}
                            <textarea
                              value={criterion.description || ''}
                              onChange={(e) => updateCriterion(criterion.id, { description: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                                text-white placeholder-white/40 focus:border-blue-400/50 
                                focus:outline-none transition-colors resize-none text-sm"
                              placeholder="Description (optional)"
                            />
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => deleteCriterion(criterion.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400 
                              hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Add Criterion */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addCriterion}
                    className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border 
                      border-white/20 rounded-xl text-white font-medium 
                      transition-all duration-200 flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Criterion
                  </motion.button>
                </motion.div>
              )}

              {activeTab === 'permissions' && (
                <motion.div
                  key="permissions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-amber-400" />
                      <p className="text-amber-100">
                        Permission management is only available to evaluation leads
                      </p>
                    </div>
                  </div>

                  {/* Mock Permissions List */}
                  <div className="space-y-3">
                    {[
                      { name: 'John Smith', role: 'Lead Evaluator', canEdit: true },
                      { name: 'Jane Doe', role: 'Evaluator', canEdit: false },
                      { name: 'Bob Johnson', role: 'Observer', canEdit: false }
                    ].map((user, index) => (
                      <div
                        key={index}
                        className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-white/60">{user.role}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center space-x-2 text-sm text-white/60">
                            <input
                              type="checkbox"
                              checked={user.canEdit}
                              disabled={user.role === 'Lead Evaluator'}
                              className="rounded"
                            />
                            <span>Can edit</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}