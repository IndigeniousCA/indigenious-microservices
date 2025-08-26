// Report Builder Component
// Custom report creation interface with drag-and-drop

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Settings, Download, Calendar, Clock,
  Mail, Filter, BarChart3, PieChart, LineChart, Table,
  Map, TrendingUp, Users, DollarSign, Target, Award,
  X, Save, Play, Pause, Edit, Copy, Trash2, ChevronRight,
  Grid, Layers, Type, Image as ImageIcon, ChevronDown
} from 'lucide-react'
import { Report, ReportType, ReportFormat, ReportParameters, WidgetType } from '../types/analytics.types'
import { useReporting } from '../hooks/useReporting'

interface ReportBuilderProps {
  report?: Report
  onSave?: (report: Report) => void
  onCancel?: () => void
}

interface ReportSection {
  id: string
  type: 'widget' | 'text' | 'divider'
  widget?: {
    type: WidgetType
    title: string
    config: Record<string, unknown>
  }
  text?: {
    content: string
    style: 'heading' | 'paragraph' | 'caption'
  }
}

export function ReportBuilder({
  report,
  onSave,
  onCancel
}: ReportBuilderProps) {
  const { generateReport, scheduleReport, templates } = useReporting()
  
  const [reportName, setReportName] = useState(report?.name || '')
  const [reportType, setReportType] = useState<ReportType>(report?.type || 'custom')
  const [description, setDescription] = useState(report?.description || '')
  const [sections, setSections] = useState<ReportSection[]>([])
  const [selectedFormats, setSelectedFormats] = useState<ReportFormat[]>(
    report?.format || ['pdf']
  )
  const [parameters, setParameters] = useState<ReportParameters>(
    report?.parameters || {}
  )
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [draggedWidget, setDraggedWidget] = useState<WidgetType | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Available widgets
  const availableWidgets = [
    { type: 'metric' as WidgetType, icon: TrendingUp, label: 'KPI Metric' },
    { type: 'chart' as WidgetType, icon: BarChart3, label: 'Chart' },
    { type: 'table' as WidgetType, icon: Table, label: 'Data Table' },
    { type: 'map' as WidgetType, icon: Map, label: 'Geographic Map' },
    { type: 'gauge' as WidgetType, icon: Target, label: 'Progress Gauge' },
    { type: 'timeline' as WidgetType, icon: Clock, label: 'Timeline' }
  ]

  // Report templates
  const reportTemplates = [
    {
      id: 'compliance',
      name: 'Compliance Report',
      type: 'compliance' as ReportType,
      description: 'Federal 5% target tracking',
      sections: [
        { type: 'metric', title: 'Overall Compliance Rate' },
        { type: 'chart', title: 'Department Breakdown' },
        { type: 'table', title: 'Detailed Metrics' }
      ]
    },
    {
      id: 'executive',
      name: 'Executive Summary',
      type: 'executive' as ReportType,
      description: 'High-level KPIs and insights',
      sections: [
        { type: 'metric', title: 'Key Performance Indicators' },
        { type: 'chart', title: 'Trend Analysis' },
        { type: 'text', content: 'Executive insights' }
      ]
    },
    {
      id: 'impact',
      name: 'Community Impact',
      type: 'impact' as ReportType,
      description: 'Economic and social impact metrics',
      sections: [
        { type: 'map', title: 'Geographic Distribution' },
        { type: 'metric', title: 'Economic Flow' },
        { type: 'chart', title: 'Employment Impact' }
      ]
    }
  ]

  // Handle drag start
  const handleDragStart = (widgetType: WidgetType) => {
    setDraggedWidget(widgetType)
  }

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedWidget) return

    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      type: 'widget',
      widget: {
        type: draggedWidget,
        title: `New ${draggedWidget} widget`,
        config: {}
      }
    }

    setSections([...sections, newSection])
    setDraggedWidget(null)
  }, [draggedWidget, sections])

  // Add text section
  const addTextSection = (style: 'heading' | 'paragraph' | 'caption') => {
    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      type: 'text',
      text: {
        content: '',
        style
      }
    }
    setSections([...sections, newSection])
  }

  // Remove section
  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId))
  }

  // Update section
  const updateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ))
  }

  // Load template
  const loadTemplate = (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId)
    if (!template) return

    setReportName(template.name)
    setReportType(template.type)
    setDescription(template.description)
    
    const newSections: ReportSection[] = template.sections.map((section, index) => ({
      id: `section-${Date.now()}-${index}`,
      type: section.type === 'text' ? 'text' : 'widget',
      widget: section.type !== 'text' ? {
        type: section.type as WidgetType,
        title: section.title || '',
        config: {}
      } : undefined,
      text: section.type === 'text' ? {
        content: section.content || '',
        style: 'paragraph' as const
      } : undefined
    }))
    
    setSections(newSections)
  }

  // Generate preview
  const handlePreview = async () => {
    setShowPreview(true)
    // Preview generation logic would go here
  }

  // Save report
  const handleSave = () => {
    const newReport: Report = {
      id: report?.id || `report-${Date.now()}`,
      name: reportName,
      type: reportType,
      description,
      createdAt: report?.createdAt || new Date().toISOString(),
      createdBy: 'current-user', // Would get from auth context
      format: selectedFormats,
      parameters,
      status: 'active'
    }

    onSave?.(newReport)
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Widgets */}
      <div className="w-80 bg-white/5 border-r border-white/10 p-6 space-y-6">
        <div>
          <h3 className="text-white font-semibold mb-4">Report Details</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-white/80 text-sm mb-1 block">Report Name</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter report name"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 
                  rounded-lg text-white placeholder-white/50 focus:outline-none 
                  focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="text-white/80 text-sm mb-1 block">Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 
                  rounded-lg text-white focus:outline-none focus:ring-2 
                  focus:ring-purple-400"
              >
                <option value="custom" className="bg-gray-800">Custom Report</option>
                <option value="compliance" className="bg-gray-800">Compliance Report</option>
                <option value="executive" className="bg-gray-800">Executive Summary</option>
                <option value="performance" className="bg-gray-800">Performance Report</option>
                <option value="impact" className="bg-gray-800">Impact Report</option>
                <option value="financial" className="bg-gray-800">Financial Report</option>
              </select>
            </div>

            <div>
              <label className="text-white/80 text-sm mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                rows={3}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 
                  rounded-lg text-white placeholder-white/50 focus:outline-none 
                  focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Templates</h3>
          <div className="space-y-2">
            {reportTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template.id)}
                className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 
                  border border-white/10 rounded-lg text-left transition-colors"
              >
                <p className="text-white text-sm font-medium">{template.name}</p>
                <p className="text-white/60 text-xs">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Add Widgets</h3>
          <div className="grid grid-cols-2 gap-2">
            {availableWidgets.map(widget => {
              const Icon = widget.icon
              return (
                <div
                  key={widget.type}
                  draggable
                  onDragStart={() => handleDragStart(widget.type)}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 
                    rounded-lg cursor-move transition-colors"
                >
                  <Icon className="w-6 h-6 text-white/60 mb-1" />
                  <p className="text-white/80 text-xs">{widget.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Add Text</h3>
          <div className="space-y-2">
            <button
              onClick={() => addTextSection('heading')}
              className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 
                border border-white/10 rounded-lg text-white/80 text-sm 
                transition-colors flex items-center space-x-2"
            >
              <Type className="w-4 h-4" />
              <span>Add Heading</span>
            </button>
            <button
              onClick={() => addTextSection('paragraph')}
              className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 
                border border-white/10 rounded-lg text-white/80 text-sm 
                transition-colors flex items-center space-x-2"
            >
              <Type className="w-4 h-4" />
              <span>Add Paragraph</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Report Builder */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Report Builder</h2>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePreview}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                  border-white/20 rounded-lg text-white transition-colors 
                  flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Preview</span>
              </button>
              
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                  border border-purple-400/50 rounded-lg text-purple-200 
                  transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Report</span>
              </button>
              
              <button
                onClick={onCancel}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Report Canvas */}
          <div
            className="min-h-[600px] bg-white/5 border-2 border-dashed 
              border-white/20 rounded-xl p-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {sections.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center 
                text-white/40">
                <Layers className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium mb-2">Start building your report</p>
                <p className="text-sm">Drag widgets from the sidebar or use a template</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section, index) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative"
                  >
                    {section.type === 'widget' && section.widget && (
                      <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <input
                            type="text"
                            value={section.widget.title}
                            onChange={(e) => updateSection(section.id, {
                              widget: { ...section.widget!, title: e.target.value }
                            })}
                            className="bg-transparent text-white font-medium 
                              focus:outline-none focus:ring-1 focus:ring-purple-400 
                              rounded px-2 py-1"
                          />
                          
                          <div className="flex items-center space-x-2 opacity-0 
                            group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1 hover:bg-white/10 rounded"
                              onClick={() => {/* Configure widget */}}
                            >
                              <Settings className="w-4 h-4 text-white/60" />
                            </button>
                            <button
                              className="p-1 hover:bg-white/10 rounded"
                              onClick={() => removeSection(section.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Widget preview */}
                        <div className="h-48 bg-white/5 rounded flex items-center 
                          justify-center text-white/40">
                          <BarChart3 className="w-8 h-8" />
                        </div>
                      </div>
                    )}

                    {section.type === 'text' && section.text && (
                      <div className="group">
                        {section.text.style === 'heading' ? (
                          <input
                            type="text"
                            value={section.text.content}
                            onChange={(e) => updateSection(section.id, {
                              text: { ...section.text!, content: e.target.value }
                            })}
                            placeholder="Enter heading..."
                            className="w-full bg-transparent text-2xl font-bold 
                              text-white placeholder-white/40 focus:outline-none 
                              focus:ring-1 focus:ring-purple-400 rounded px-2 py-1"
                          />
                        ) : (
                          <textarea
                            value={section.text.content}
                            onChange={(e) => updateSection(section.id, {
                              text: { ...section.text!, content: e.target.value }
                            })}
                            placeholder="Enter text..."
                            rows={3}
                            className="w-full bg-transparent text-white 
                              placeholder-white/40 focus:outline-none focus:ring-1 
                              focus:ring-purple-400 rounded px-2 py-1 resize-none"
                          />
                        )}
                        
                        <button
                          className="absolute -right-2 top-0 p-1 bg-red-500/20 
                            hover:bg-red-500/30 rounded opacity-0 
                            group-hover:opacity-100 transition-opacity"
                          onClick={() => removeSection(section.id)}
                        >
                          <X className="w-3 h-3 text-red-300" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Export Options */}
          <div className="mt-6 bg-white/10 backdrop-blur-md border border-white/20 
            rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Export Options</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/80 text-sm mb-2 block">Format</label>
                <div className="flex items-center space-x-3">
                  {(['pdf', 'excel', 'csv', 'powerpoint'] as ReportFormat[]).map(format => (
                    <label key={format} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFormats.includes(format)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFormats([...selectedFormats, format])
                          } else {
                            setSelectedFormats(selectedFormats.filter(f => f !== format))
                          }
                        }}
                        className="w-4 h-4 bg-white/10 border-white/20 rounded 
                          text-purple-500 focus:ring-purple-400"
                      />
                      <span className="text-white/80 text-sm uppercase">{format}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="w-4 h-4 bg-white/10 border-white/20 rounded 
                      text-purple-500 focus:ring-purple-400"
                  />
                  <span className="text-white/80">Schedule automatic generation</span>
                </label>
                
                <AnimatePresence>
                  {scheduleEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pl-7 space-y-3"
                    >
                      <select className="px-3 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white text-sm focus:outline-none 
                        focus:ring-2 focus:ring-purple-400">
                        <option value="daily" className="bg-gray-800">Daily</option>
                        <option value="weekly" className="bg-gray-800">Weekly</option>
                        <option value="monthly" className="bg-gray-800">Monthly</option>
                        <option value="quarterly" className="bg-gray-800">Quarterly</option>
                      </select>
                      
                      <input
                        type="email"
                        placeholder="Recipients (comma separated)"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 
                          rounded-lg text-white text-sm placeholder-white/50 
                          focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 
              flex items-center justify-center p-6"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl 
                w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 
                border-b border-white/10">
                <h3 className="text-xl font-semibold text-white">Report Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
              
              <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
                <div className="bg-white p-8 rounded-lg text-gray-900">
                  <h1 className="text-3xl font-bold mb-6">{reportName}</h1>
                  {/* Preview content would be rendered here */}
                  <p className="text-gray-600">Report preview will be displayed here...</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}