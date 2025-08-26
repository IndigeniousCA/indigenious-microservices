'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface RegionData {
  id: string;
  name: string;
  prosperity: number; // 0-100 score
  jobs: number;
  businesses: number;
  investment: number;
  indigenousPopulation: number;
  coordinates?: [number, number];
}

interface CanadaHeatMapProps {
  view: 'prosperity' | 'jobs' | 'investment' | 'business';
  data: {
    regions: RegionData[];
  };
  onRegionClick?: (region: RegionData) => void;
}

const CANADA_PROVINCES = {
  BC: { name: 'British Columbia', coordinates: [-123.1207, 54.7267] },
  AB: { name: 'Alberta', coordinates: [-113.4909, 53.9333] },
  SK: { name: 'Saskatchewan', coordinates: [-106.3468, 52.9399] },
  MB: { name: 'Manitoba', coordinates: [-98.7394, 53.7609] },
  ON: { name: 'Ontario', coordinates: [-85.3232, 51.2538] },
  QC: { name: 'Quebec', coordinates: [-71.2080, 53.1355] },
  NB: { name: 'New Brunswick', coordinates: [-66.1594, 46.5653] },
  NS: { name: 'Nova Scotia', coordinates: [-63.7443, 44.6820] },
  PE: { name: 'Prince Edward Island', coordinates: [-63.1311, 46.5107] },
  NL: { name: 'Newfoundland and Labrador', coordinates: [-53.1355, 53.1355] },
  YT: { name: 'Yukon', coordinates: [-135.0568, 64.0685] },
  NT: { name: 'Northwest Territories', coordinates: [-117.0542, 64.8255] },
  NU: { name: 'Nunavut', coordinates: [-85.9324, 70.2998] },
};

// Sample data for visualization
const SAMPLE_DATA: RegionData[] = [
  { id: 'BC', name: 'British Columbia', prosperity: 78, jobs: 12453, businesses: 567, investment: 234000000, indigenousPopulation: 270585 },
  { id: 'AB', name: 'Alberta', prosperity: 82, jobs: 8934, businesses: 423, investment: 189000000, indigenousPopulation: 220695 },
  { id: 'SK', name: 'Saskatchewan', prosperity: 71, jobs: 5678, businesses: 234, investment: 145000000, indigenousPopulation: 175015 },
  { id: 'MB', name: 'Manitoba', prosperity: 75, jobs: 4567, businesses: 198, investment: 98000000, indigenousPopulation: 223310 },
  { id: 'ON', name: 'Ontario', prosperity: 73, jobs: 15678, businesses: 789, investment: 456000000, indigenousPopulation: 374395 },
  { id: 'QC', name: 'Quebec', prosperity: 69, jobs: 8923, businesses: 445, investment: 234000000, indigenousPopulation: 182890 },
  { id: 'NB', name: 'New Brunswick', prosperity: 65, jobs: 2345, businesses: 123, investment: 67000000, indigenousPopulation: 25235 },
  { id: 'NS', name: 'Nova Scotia', prosperity: 68, jobs: 3456, businesses: 167, investment: 89000000, indigenousPopulation: 51485 },
  { id: 'PE', name: 'Prince Edward Island', prosperity: 72, jobs: 456, businesses: 23, investment: 12000000, indigenousPopulation: 2230 },
  { id: 'NL', name: 'Newfoundland and Labrador', prosperity: 63, jobs: 1234, businesses: 67, investment: 45000000, indigenousPopulation: 45725 },
  { id: 'YT', name: 'Yukon', prosperity: 89, jobs: 567, businesses: 45, investment: 23000000, indigenousPopulation: 8195 },
  { id: 'NT', name: 'Northwest Territories', prosperity: 85, jobs: 789, businesses: 67, investment: 34000000, indigenousPopulation: 20860 },
  { id: 'NU', name: 'Nunavut', prosperity: 91, jobs: 345, businesses: 34, investment: 18000000, indigenousPopulation: 30550 },
];

export default function CanadaHeatMap({ view, data, onRegionClick }: CanadaHeatMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Use sample data if no data provided
  const regions = data?.regions || SAMPLE_DATA;

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.parentElement?.getBoundingClientRect();
        if (rect) {
          setDimensions({ width: rect.width - 40, height: rect.height - 40 });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create projection for Canada
    const projection = d3.geoMercator()
      .center([-96, 60])
      .scale(dimensions.width / 8)
      .translate([dimensions.width / 2, dimensions.height / 2]);

    // Color scale based on view
    const getMetricValue = (region: RegionData) => {
      switch (view) {
        case 'prosperity': return region.prosperity;
        case 'jobs': return region.jobs;
        case 'investment': return region.investment / 1000000; // Convert to millions
        case 'business': return region.businesses;
        default: return region.prosperity;
      }
    };

    const maxValue = Math.max(...regions.map(getMetricValue));
    const minValue = Math.min(...regions.map(getMetricValue));

    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([minValue, maxValue]);

    // Create main group
    const g = svg.append('g');

    // Add provinces as circles (simplified representation)
    const circles = g.selectAll('circle')
      .data(regions)
      .enter()
      .append('circle')
      .attr('cx', (d) => {
        const coords = CANADA_PROVINCES[d.id as keyof typeof CANADA_PROVINCES]?.coordinates;
        return coords ? projection(coords as [number, number])?.[0] || 0 : 0;
      })
      .attr('cy', (d) => {
        const coords = CANADA_PROVINCES[d.id as keyof typeof CANADA_PROVINCES]?.coordinates;
        return coords ? projection(coords as [number, number])?.[1] || 0 : 0;
      })
      .attr('r', (d) => {
        // Size based on Indigenous population
        const scale = d3.scaleSqrt()
          .domain([0, Math.max(...regions.map(r => r.indigenousPopulation))])
          .range([10, 40]);
        return scale(d.indigenousPopulation);
      })
      .attr('fill', (d) => colorScale(getMetricValue(d)))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        setHoveredRegion(d);
        d3.select(event.currentTarget)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('stroke-width', 3);
      })
      .on('mouseout', (event) => {
        setHoveredRegion(null);
        d3.select(event.currentTarget)
          .transition()
          .duration(150)
          .attr('opacity', 0.8)
          .attr('stroke-width', 2);
      })
      .on('click', (event, d) => {
        setSelectedRegion(d);
        onRegionClick?.(d);
      });

    // Add province labels
    g.selectAll('text')
      .data(regions)
      .enter()
      .append('text')
      .attr('x', (d) => {
        const coords = CANADA_PROVINCES[d.id as keyof typeof CANADA_PROVINCES]?.coordinates;
        return coords ? projection(coords as [number, number])?.[0] || 0 : 0;
      })
      .attr('y', (d) => {
        const coords = CANADA_PROVINCES[d.id as keyof typeof CANADA_PROVINCES]?.coordinates;
        return coords ? (projection(coords as [number, number])?.[1] || 0) + 5 : 0;
      })
      .text(d => d.id)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    // Add legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legend = svg.append('g')
      .attr('transform', `translate(${dimensions.width - legendWidth - 20}, 20)`);

    // Create gradient for legend
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    gradient.selectAll('stop')
      .data(d3.range(0, 1.1, 0.1))
      .enter()
      .append('stop')
      .attr('offset', d => `${d * 100}%`)
      .attr('stop-color', d => colorScale(minValue + (maxValue - minValue) * d));

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);

    // Legend labels
    legend.append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 15)
      .text(formatValue(minValue, view))
      .attr('fill', 'white')
      .attr('font-size', '10px');

    legend.append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 15)
      .text(formatValue(maxValue, view))
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('text-anchor', 'end');

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .text(getViewTitle(view))
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle');

  }, [dimensions, regions, view]);

  const formatValue = (value: number, view: string): string => {
    switch (view) {
      case 'prosperity': return `${Math.round(value)}`;
      case 'jobs': return value >= 1000 ? `${Math.round(value / 1000)}K` : `${Math.round(value)}`;
      case 'investment': return `$${Math.round(value)}M`;
      case 'business': return `${Math.round(value)}`;
      default: return `${Math.round(value)}`;
    }
  };

  const getViewTitle = (view: string): string => {
    switch (view) {
      case 'prosperity': return 'Prosperity Score';
      case 'jobs': return 'Jobs Created';
      case 'investment': return 'Investment ($M)';
      case 'business': return 'Businesses';
      default: return 'Prosperity Score';
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Main visualization */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {/* Hover tooltip */}
      {hoveredRegion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute pointer-events-none z-10"
          style={{
            left: '50%',
            top: '10px',
            transform: 'translateX(-50%)',
          }}
        >
          <GlassPanel className="p-4 max-w-xs">
            <h4 className="text-white font-semibold mb-2">
              {hoveredRegion.name}
            </h4>
            <div className="space-y-1 text-sm text-white/80">
              <div className="flex justify-between">
                <span>Prosperity Score:</span>
                <span className="text-white font-medium">{hoveredRegion.prosperity}</span>
              </div>
              <div className="flex justify-between">
                <span>Jobs Created:</span>
                <span className="text-white font-medium">{hoveredRegion.jobs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Businesses:</span>
                <span className="text-white font-medium">{hoveredRegion.businesses}</span>
              </div>
              <div className="flex justify-between">
                <span>Investment:</span>
                <span className="text-white font-medium">${(hoveredRegion.investment / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span>Indigenous Pop:</span>
                <span className="text-white font-medium">{hoveredRegion.indigenousPopulation.toLocaleString()}</span>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* View selector */}
      <div className="absolute top-4 left-4 flex gap-2">
        {['prosperity', 'jobs', 'investment', 'business'].map((viewOption) => (
          <button
            key={viewOption}
            onClick={() => {/* This would be handled by parent */}}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              view === viewOption
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            {getViewTitle(viewOption)}
          </button>
        ))}
      </div>

      {/* Region details panel */}
      {selectedRegion && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-4 top-4 w-64"
        >
          <GlassPanel className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-white font-semibold">
                {selectedRegion.name}
              </h3>
              <button
                onClick={() => setSelectedRegion(null)}
                className="text-white/60 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-white/60 mb-1">Prosperity Score</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-blue-400 h-2 rounded-full"
                      style={{ width: `${selectedRegion.prosperity}%` }}
                    />
                  </div>
                  <span className="text-white font-medium">
                    {selectedRegion.prosperity}/100
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-white/60 text-xs">Jobs</div>
                  <div className="text-white font-semibold">
                    {selectedRegion.jobs.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-white/60 text-xs">Businesses</div>
                  <div className="text-white font-semibold">
                    {selectedRegion.businesses}
                  </div>
                </div>
                <div>
                  <div className="text-white/60 text-xs">Investment</div>
                  <div className="text-white font-semibold">
                    ${(selectedRegion.investment / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div>
                  <div className="text-white/60 text-xs">Population</div>
                  <div className="text-white font-semibold">
                    {(selectedRegion.indigenousPopulation / 1000).toFixed(0)}K
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}
    </div>
  );
}