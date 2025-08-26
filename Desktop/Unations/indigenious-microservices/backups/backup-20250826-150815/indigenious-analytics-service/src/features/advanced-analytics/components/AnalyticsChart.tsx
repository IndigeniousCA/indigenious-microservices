// Analytics Chart Component
// Reusable chart component with multiple visualization types

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, LineChart, PieChart, TrendingUp, Calendar,
  Download, Maximize2, Settings, Info, Filter
} from 'lucide-react'
import { VisualizationConfig } from '../types/analytics.types'

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
    backgroundColor?: string
    borderColor?: string
  }[]
}

interface AnalyticsChartProps {
  title: string
  description?: string
  data: ChartData
  type?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter'
  config?: VisualizationConfig
  height?: number
  onExport?: () => void
  onFullscreen?: () => void
  onConfigure?: () => void
}

export function AnalyticsChart({
  title,
  description,
  data,
  type = 'bar',
  config,
  height = 300,
  onExport,
  onFullscreen,
  onConfigure
}: AnalyticsChartProps) {
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{
    datasetIndex: number
    index: number
    value: number
    label: string
  } | null>(null)

  // Calculate chart dimensions
  const chartDimensions = useMemo(() => {
    const margin = { top: 20, right: 30, bottom: 40, left: 60 }
    const width = 800
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom
    
    return { width, height, margin, innerWidth, innerHeight }
  }, [height])

  // Calculate scales
  const scales = useMemo(() => {
    const maxValue = Math.max(
      ...data.datasets.flatMap(dataset => dataset.data)
    )
    
    const xScale = (index: number) => 
      (index / (data.labels.length - 1)) * chartDimensions.innerWidth
    
    const yScale = (value: number) => 
      chartDimensions.innerHeight - (value / maxValue) * chartDimensions.innerHeight
    
    return { xScale, yScale, maxValue }
  }, [data, chartDimensions])

  // Get chart icon
  const getChartIcon = () => {
    switch (type) {
      case 'line':
      case 'area':
        return LineChart
      case 'pie':
      case 'donut':
        return PieChart
      default:
        return BarChart3
    }
  }

  const ChartIcon = getChartIcon()

  // Render bar chart
  const renderBarChart = () => {
    const barWidth = chartDimensions.innerWidth / (data.labels.length * data.datasets.length) * 0.8
    
    return (
      <g transform={`translate(${chartDimensions.margin.left}, ${chartDimensions.margin.top})`}>
        {/* Grid lines */}
        {config?.gridLines !== false && (
          <g className="grid-lines">
            {[0, 0.25, 0.5, 0.75, 1].map(tick => (
              <line
                key={tick}
                x1={0}
                y1={scales.yScale(scales.maxValue * tick)}
                x2={chartDimensions.innerWidth}
                y2={scales.yScale(scales.maxValue * tick)}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeDasharray="4,4"
              />
            ))}
          </g>
        )}

        {/* Bars */}
        {data.datasets.map((dataset, datasetIndex) => (
          <g key={datasetIndex}>
            {dataset.data.map((value, index) => {
              const x = scales.xScale(index) + (datasetIndex * barWidth)
              const barHeight = (value / scales.maxValue) * chartDimensions.innerHeight
              const y = chartDimensions.innerHeight - barHeight
              
              return (
                <motion.rect
                  key={index}
                  x={x}
                  y={chartDimensions.innerHeight}
                  width={barWidth}
                  height={0}
                  fill={dataset.backgroundColor || `rgba(139, 92, 246, ${0.8 - datasetIndex * 0.2})`}
                  animate={{ y, height: barHeight }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredDataPoint({
                    datasetIndex,
                    index,
                    value,
                    label: data.labels[index]
                  })}
                  onMouseLeave={() => setHoveredDataPoint(null)}
                  className="cursor-pointer hover:opacity-80"
                />
              )
            })}
          </g>
        ))}

        {/* X-axis labels */}
        {data.labels.map((label, index) => (
          <text
            key={index}
            x={scales.xScale(index) + (barWidth * data.datasets.length) / 2}
            y={chartDimensions.innerHeight + 20}
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="12"
          >
            {label}
          </text>
        ))}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(tick => (
          <text
            key={tick}
            x={-10}
            y={scales.yScale(scales.maxValue * tick) + 5}
            textAnchor="end"
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="12"
          >
            {Math.round(scales.maxValue * tick)}
          </text>
        ))}
      </g>
    )
  }

  // Render line chart
  const renderLineChart = () => {
    return (
      <g transform={`translate(${chartDimensions.margin.left}, ${chartDimensions.margin.top})`}>
        {/* Grid lines */}
        {config?.gridLines !== false && (
          <g className="grid-lines">
            {[0, 0.25, 0.5, 0.75, 1].map(tick => (
              <line
                key={tick}
                x1={0}
                y1={scales.yScale(scales.maxValue * tick)}
                x2={chartDimensions.innerWidth}
                y2={scales.yScale(scales.maxValue * tick)}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeDasharray="4,4"
              />
            ))}
          </g>
        )}

        {/* Lines */}
        {data.datasets.map((dataset, datasetIndex) => {
          const pathData = dataset.data
            .map((value, index) => {
              const x = scales.xScale(index)
              const y = scales.yScale(value)
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
            })
            .join(' ')

          return (
            <g key={datasetIndex}>
              {/* Area fill for area charts */}
              {type === 'area' && (
                <motion.path
                  d={`${pathData} L ${chartDimensions.innerWidth} ${chartDimensions.innerHeight} L 0 ${chartDimensions.innerHeight} Z`}
                  fill={`${dataset.borderColor || 'rgba(139, 92, 246, 0.2)'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
              )}

              {/* Line */}
              <motion.path
                d={pathData}
                fill="none"
                stroke={dataset.borderColor || `rgba(139, 92, 246, ${1 - datasetIndex * 0.2})`}
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />

              {/* Data points */}
              {dataset.data.map((value, index) => (
                <circle
                  key={index}
                  cx={scales.xScale(index)}
                  cy={scales.yScale(value)}
                  r="4"
                  fill={dataset.borderColor || 'rgba(139, 92, 246, 1)'}
                  className="cursor-pointer hover:r-6"
                  onMouseEnter={() => setHoveredDataPoint({
                    datasetIndex,
                    index,
                    value,
                    label: data.labels[index]
                  })}
                  onMouseLeave={() => setHoveredDataPoint(null)}
                />
              ))}
            </g>
          )
        })}

        {/* X-axis labels */}
        {data.labels.map((label, index) => (
          <text
            key={index}
            x={scales.xScale(index)}
            y={chartDimensions.innerHeight + 20}
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="12"
          >
            {label}
          </text>
        ))}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(tick => (
          <text
            key={tick}
            x={-10}
            y={scales.yScale(scales.maxValue * tick) + 5}
            textAnchor="end"
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="12"
          >
            {Math.round(scales.maxValue * tick)}
          </text>
        ))}
      </g>
    )
  }

  // Render pie chart
  const renderPieChart = () => {
    const centerX = chartDimensions.width / 2
    const centerY = chartDimensions.height / 2
    const radius = Math.min(centerX, centerY) - 40
    const innerRadius = type === 'donut' ? radius * 0.6 : 0

    // Calculate angles
    const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0)
    let currentAngle = -Math.PI / 2

    const segments = data.datasets[0].data.map((value, index) => {
      const startAngle = currentAngle
      const angle = (value / total) * Math.PI * 2
      currentAngle += angle
      
      return {
        value,
        startAngle,
        endAngle: currentAngle,
        label: data.labels[index],
        color: `hsl(${(index * 360) / data.labels.length}, 70%, 50%)`
      }
    })

    return (
      <g transform={`translate(${centerX}, ${centerY})`}>
        {segments.map((segment, index) => {
          const outerX1 = Math.cos(segment.startAngle) * radius
          const outerY1 = Math.sin(segment.startAngle) * radius
          const outerX2 = Math.cos(segment.endAngle) * radius
          const outerY2 = Math.sin(segment.endAngle) * radius
          
          const innerX1 = Math.cos(segment.startAngle) * innerRadius
          const innerY1 = Math.sin(segment.startAngle) * innerRadius
          const innerX2 = Math.cos(segment.endAngle) * innerRadius
          const innerY2 = Math.sin(segment.endAngle) * innerRadius
          
          const largeArcFlag = segment.endAngle - segment.startAngle > Math.PI ? 1 : 0
          
          const pathData = [
            `M ${innerX1} ${innerY1}`,
            `L ${outerX1} ${outerY1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerX2} ${outerY2}`,
            `L ${innerX2} ${innerY2}`,
            innerRadius > 0 ? `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}` : '',
            'Z'
          ].join(' ')

          return (
            <motion.path
              key={index}
              d={pathData}
              fill={segment.color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="cursor-pointer hover:opacity-80"
              onMouseEnter={() => setHoveredDataPoint({
                datasetIndex: 0,
                index,
                value: segment.value,
                label: segment.label
              })}
              onMouseLeave={() => setHoveredDataPoint(null)}
            />
          )
        })}

        {/* Labels */}
        {segments.map((segment, index) => {
          const labelAngle = (segment.startAngle + segment.endAngle) / 2
          const labelX = Math.cos(labelAngle) * (radius + 20)
          const labelY = Math.sin(labelAngle) * (radius + 20)
          
          return (
            <text
              key={index}
              x={labelX}
              y={labelY}
              textAnchor={labelX > 0 ? 'start' : 'end'}
              dominantBaseline="middle"
              fill="rgba(255, 255, 255, 0.8)"
              fontSize="12"
            >
              {segment.label} ({((segment.value / total) * 100).toFixed(1)}%)
            </text>
          )
        })}
      </g>
    )
  }

  // Render appropriate chart type
  const renderChart = () => {
    switch (type) {
      case 'line':
      case 'area':
        return renderLineChart()
      case 'pie':
      case 'donut':
        return renderPieChart()
      default:
        return renderBarChart()
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <ChartIcon className="w-6 h-6 text-purple-400 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-white/60 text-sm mt-1">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onConfigure && (
            <button
              onClick={onConfigure}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-white/60" />
            </button>
          )}
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-white/60" />
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 text-white/60" />
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          width={chartDimensions.width}
          height={chartDimensions.height}
          className="w-full"
          viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
        >
          {renderChart()}
        </svg>

        {/* Tooltip */}
        {hoveredDataPoint && config?.tooltips !== false && (
          <div
            className="absolute bg-gray-900 border border-white/20 rounded-lg 
              px-3 py-2 pointer-events-none z-10"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <p className="text-white/80 text-sm">{hoveredDataPoint.label}</p>
            <p className="text-white font-medium">
              {data.datasets[hoveredDataPoint.datasetIndex].label}: {hoveredDataPoint.value}
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      {config?.legend !== false && data.datasets.length > 1 && (
        <div className="mt-4 flex items-center justify-center space-x-4">
          {data.datasets.map((dataset, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ 
                  backgroundColor: dataset.backgroundColor || 
                    `rgba(139, 92, 246, ${0.8 - index * 0.2})` 
                }}
              />
              <span className="text-white/60 text-sm">{dataset.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}