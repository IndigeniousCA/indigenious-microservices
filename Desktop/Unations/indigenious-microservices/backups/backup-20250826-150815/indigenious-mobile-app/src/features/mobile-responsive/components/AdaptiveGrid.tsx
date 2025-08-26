// Adaptive Grid Component
// Responsive grid system with intelligent column adjustment

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useResponsive } from '../hooks/useResponsive'
import type { GridResponsiveProps, ResponsiveValue } from '../types/responsive.types'

interface AdaptiveGridProps extends GridResponsiveProps {
  children: React.ReactNode
  className?: string
  adaptive?: boolean
  minItemWidth?: number
  maxItemWidth?: number
  maintainAspectRatio?: boolean
  aspectRatio?: string
  equalHeight?: boolean
  animate?: boolean
  staggerChildren?: number
  itemClassName?: string
}

function getResponsiveValue<T>(
  value: ResponsiveValue<T>,
  breakpoint: string
): T {
  const responsiveValue = value as unknown
  
  // Try exact breakpoint match first
  if (responsiveValue[breakpoint] !== undefined) {
    return responsiveValue[breakpoint]
  }
  
  // Fallback cascade
  const fallbackOrder = ['desktop', 'tablet', 'phablet', 'mobile']
  for (const fallback of fallbackOrder) {
    if (responsiveValue[fallback] !== undefined) {
      return responsiveValue[fallback]
    }
  }
  
  return responsiveValue.default
}

export function AdaptiveGrid({
  children,
  columns,
  gap = { default: '1rem' },
  rows,
  areas,
  autoFlow = { default: 'row' },
  justify = { default: 'stretch' },
  align = { default: 'stretch' },
  className = '',
  adaptive = true,
  minItemWidth = 200,
  maxItemWidth = 400,
  maintainAspectRatio = false,
  aspectRatio = '1/1',
  equalHeight = false,
  animate = true,
  staggerChildren = 0.1,
  itemClassName = ''
}: AdaptiveGridProps) {
  const { viewport, isMobile, isTablet, preferences } = useResponsive()

  // Calculate adaptive columns based on container width and item constraints
  const adaptiveColumns = useMemo(() => {
    if (!adaptive) {
      return getResponsiveValue(columns, viewport.breakpoint)
    }

    const containerWidth = viewport.width
    const gapValue = parseFloat(getResponsiveValue(gap, viewport.breakpoint).toString()) || 16
    
    // Calculate optimal columns based on item width constraints
    const availableWidth = containerWidth - 32 // Account for padding
    const itemWidthWithGap = minItemWidth + gapValue
    const maxColumns = Math.floor(availableWidth / itemWidthWithGap)
    const minColumns = Math.floor(availableWidth / (maxItemWidth + gapValue))
    
    // Get preferred columns from responsive value
    const preferredColumns = getResponsiveValue(columns, viewport.breakpoint)
    
    // Use preferred if within constraints, otherwise use calculated
    if (preferredColumns <= maxColumns && preferredColumns >= minColumns) {
      return preferredColumns
    }
    
    return Math.max(1, Math.min(maxColumns, preferredColumns))
  }, [adaptive, columns, viewport.breakpoint, viewport.width, gap, minItemWidth, maxItemWidth])

  // Get all responsive values
  const responsiveGap = getResponsiveValue(gap, viewport.breakpoint)
  const responsiveRows = rows ? getResponsiveValue(rows, viewport.breakpoint) : undefined
  const responsiveAreas = areas ? getResponsiveValue(areas, viewport.breakpoint) : undefined
  const responsiveAutoFlow = getResponsiveValue(autoFlow, viewport.breakpoint)
  const responsiveJustify = getResponsiveValue(justify, viewport.breakpoint)
  const responsiveAlign = getResponsiveValue(align, viewport.breakpoint)

  // Generate grid styles
  const gridStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${adaptiveColumns}, 1fr)`,
      gap: responsiveGap,
      gridAutoFlow: responsiveAutoFlow,
      justifyItems: responsiveJustify,
      alignItems: responsiveAlign
    }

    if (responsiveRows) {
      styles.gridTemplateRows = `repeat(${responsiveRows}, 1fr)`
    }

    if (responsiveAreas) {
      styles.gridTemplateAreas = responsiveAreas
    }

    if (maintainAspectRatio) {
      styles.gridAutoRows = `minmax(0, 1fr)`
    }

    if (equalHeight) {
      styles.alignItems = 'stretch'
    }

    return styles
  }, [
    adaptiveColumns,
    responsiveGap,
    responsiveRows,
    responsiveAreas,
    responsiveAutoFlow,
    responsiveJustify,
    responsiveAlign,
    maintainAspectRatio,
    equalHeight
  ])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: preferences.reducedMotion ? 0 : staggerChildren,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: preferences.reducedMotion ? 0 : 20,
      scale: preferences.reducedMotion ? 1 : 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25
      }
    }
  }

  // Base classes
  const baseClasses = `
    w-full
    ${isMobile ? 'px-4' : isTablet ? 'px-6' : 'px-8'}
    ${className}
  `

  return (
    <motion.div
      className={baseClasses}
      style={gridStyles}
      variants={animate ? containerVariants : undefined}
      initial={animate ? 'hidden' : undefined}
      animate={animate ? 'visible' : undefined}
    >
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <motion.div
            key={index}
            className={`
              ${maintainAspectRatio ? `aspect-[${aspectRatio}]` : ''}
              ${equalHeight ? 'h-full' : ''}
              ${itemClassName}
            `}
            variants={animate ? itemVariants : undefined}
            style={{
              minWidth: adaptive ? minItemWidth : undefined,
              maxWidth: adaptive ? maxItemWidth : undefined
            }}
          >
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div
          className={`
            ${maintainAspectRatio ? `aspect-[${aspectRatio}]` : ''}
            ${equalHeight ? 'h-full' : ''}
            ${itemClassName}
          `}
          variants={animate ? itemVariants : undefined}
          style={{
            minWidth: adaptive ? minItemWidth : undefined,
            maxWidth: adaptive ? maxItemWidth : undefined
          }}
        >
          {children}
        </motion.div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-20 right-4 bg-black/80 text-white text-xs p-2 rounded font-mono z-50">
          <div>Columns: {adaptiveColumns}</div>
          <div>Breakpoint: {viewport.breakpoint}</div>
          <div>Width: {viewport.width}px</div>
        </div>
      )}
    </motion.div>
  )
}

// Specialized grid components for common patterns
export function BusinessGrid({ children, ...props }: Omit<AdaptiveGridProps, 'columns' | 'minItemWidth' | 'maxItemWidth'>) {
  return (
    <AdaptiveGrid
      columns={{
        mobile: 1,
        phablet: 1,
        tablet: 2,
        desktop: 3,
        wide: 4,
        ultra: 5,
        default: 3
      }}
      minItemWidth={280}
      maxItemWidth={400}
      aspectRatio="3/2"
      maintainAspectRatio={true}
      {...props}
    >
      {children}
    </AdaptiveGrid>
  )
}

export function DocumentGrid({ children, ...props }: Omit<AdaptiveGridProps, 'columns' | 'minItemWidth' | 'maxItemWidth'>) {
  return (
    <AdaptiveGrid
      columns={{
        mobile: 1,
        phablet: 2,
        tablet: 3,
        desktop: 4,
        wide: 5,
        ultra: 6,
        default: 4
      }}
      minItemWidth={200}
      maxItemWidth={300}
      aspectRatio="3/4"
      maintainAspectRatio={true}
      {...props}
    >
      {children}
    </AdaptiveGrid>
  )
}

export function CardGrid({ children, ...props }: Omit<AdaptiveGridProps, 'columns' | 'minItemWidth' | 'maxItemWidth'>) {
  return (
    <AdaptiveGrid
      columns={{
        mobile: 1,
        phablet: 1,
        tablet: 2,
        desktop: 3,
        wide: 4,
        ultra: 5,
        default: 3
      }}
      minItemWidth={300}
      maxItemWidth={450}
      equalHeight={true}
      {...props}
    >
      {children}
    </AdaptiveGrid>
  )
}

export function IconGrid({ children, ...props }: Omit<AdaptiveGridProps, 'columns' | 'minItemWidth' | 'maxItemWidth'>) {
  return (
    <AdaptiveGrid
      columns={{
        mobile: 3,
        phablet: 4,
        tablet: 6,
        desktop: 8,
        wide: 10,
        ultra: 12,
        default: 6
      }}
      minItemWidth={80}
      maxItemWidth={120}
      aspectRatio="1/1"
      maintainAspectRatio={true}
      gap={{ default: '0.5rem' }}
      {...props}
    >
      {children}
    </AdaptiveGrid>
  )
}