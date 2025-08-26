import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SpiritAnimalSVGService } from '@/features/verification-badges/services/SpiritAnimalSVGService';
import sharp from 'sharp';

// GET /api/badges/[badgeId]/image - Generate badge image
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ badgeId: string }> }
) {
  try {
    const params = await context.params;
    const { badgeId } = params;
    const { searchParams } = new URL(request.url);
    
    const size = parseInt(searchParams.get('size') || '200');
    const platform = searchParams.get('platform') || 'website';
    const format = searchParams.get('format') || 'png';

    // Validate size
    const maxSize = 1000;
    const validSize = Math.min(Math.max(size, 50), maxSize);

    // Fetch badge data
    const badge = await (prisma as any).badge.findUnique({
      where: { id: badgeId },
      include: {
        business: {
          select: {
            name: true
          }
        }
      }
    });

    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    // Get colors for the badge
    const colors = getAnimalColors(badge.animalSpirit, badge.evolutionStage);

    // Generate SVG
    const svg = SpiritAnimalSVGService.generateSVG(
      badge.animalSpirit as any,
      colors,
      validSize
    );

    // Add badge frame and stage indicators
    const fullSvg = `
      <svg width="${validSize}" height="${validSize}" viewBox="0 0 ${validSize} ${validSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="badge-bg">
            <stop offset="0%" stop-color="${colors.accent}" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="${colors.primary}" stop-opacity="0.1"/>
          </radialGradient>
          <filter id="stage-glow">
            <feGaussianBlur stdDeviation="${badge.evolutionStage * 2}" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Background circle -->
        <circle cx="${validSize/2}" cy="${validSize/2}" r="${validSize/2 - 5}" 
                fill="url(#badge-bg)" stroke="${colors.accent}" stroke-width="2"/>
        
        <!-- Animal SVG -->
        <g transform="translate(${validSize * 0.1}, ${validSize * 0.1}) scale(0.8)">
          ${svg.replace(/<svg[^>]*>|<\/svg>/g, '')}
        </g>
        
        <!-- Stage indicators -->
        ${Array.from({ length: 4 }, (_, i) => `
          <circle cx="${validSize * 0.2 + i * validSize * 0.15}" 
                  cy="${validSize * 0.9}" 
                  r="${validSize * 0.02}" 
                  fill="${i < badge.evolutionStage ? colors.accent : 'rgba(255,255,255,0.3)'}"/>
        `).join('')}
        
        <!-- Platform-specific additions -->
        ${platform === 'linkedin' || platform === 'email' ? `
          <text x="${validSize/2}" y="${validSize * 0.05}" 
                text-anchor="middle" 
                font-family="Arial, sans-serif" 
                font-size="${validSize * 0.04}" 
                fill="${colors.primary}"
                font-weight="bold">
            Indigenous Verified
          </text>
        ` : ''}
      </svg>
    `;

    // Convert SVG to buffer
    const svgBuffer = Buffer.from(fullSvg);

    // Convert to requested format using sharp
    let imageBuffer: Buffer;
    let contentType: string;

    if (format === 'png') {
      imageBuffer = await sharp(svgBuffer)
        .png()
        .toBuffer();
      contentType = 'image/png';
    } else if (format === 'jpg' || format === 'jpeg') {
      imageBuffer = await sharp(svgBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();
      contentType = 'image/jpeg';
    } else if (format === 'webp') {
      imageBuffer = await sharp(svgBuffer)
        .webp({ quality: 90 })
        .toBuffer();
      contentType = 'image/webp';
    } else {
      // Return SVG
      imageBuffer = svgBuffer;
      contentType = 'image/svg+xml';
    }

    // Set cache headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Badge-Id': badgeId,
      'X-Badge-Business': badge.business.name
    });

    return new NextResponse(imageBuffer, { headers });
  } catch (error) {
    console.error('Badge image generation error:', error);
    
    // Return a fallback image
    const fallbackSvg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f3f4f6"/>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="14" fill="#6b7280">
          Badge Unavailable
        </text>
      </svg>
    `;
    
    return new NextResponse(Buffer.from(fallbackSvg), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Helper function to get animal colors
function getAnimalColors(animal: string, stage: number) {
  const animalColors: Record<string, { primary: string; secondary: string }> = {
    beaver: { primary: '#8B4513', secondary: '#D2691E' },
    eagle: { primary: '#FFD700', secondary: '#FFA500' },
    fox: { primary: '#FF6347', secondary: '#FF4500' },
    wolf: { primary: '#708090', secondary: '#696969' },
    bear: { primary: '#654321', secondary: '#8B4513' },
    turtle: { primary: '#228B22', secondary: '#32CD32' },
    otter: { primary: '#4682B4', secondary: '#5F9EA0' },
    wolverine: { primary: '#2F4F4F', secondary: '#483D8B' },
    marten: { primary: '#8B7355', secondary: '#A0522D' }
  };

  const stageEffects: Record<number, { accent: string; glow: string }> = {
    1: { accent: '#C0C0C0', glow: 'rgba(192, 192, 192, 0.3)' },
    2: { accent: '#00FF00', glow: 'rgba(0, 255, 0, 0.5)' },
    3: { accent: '#FFD700', glow: 'rgba(255, 215, 0, 0.7)' },
    4: { accent: '#FF00FF', glow: 'rgba(255, 0, 255, 0.9)' }
  };

  return {
    ...animalColors[animal],
    ...stageEffects[stage]
  };
}