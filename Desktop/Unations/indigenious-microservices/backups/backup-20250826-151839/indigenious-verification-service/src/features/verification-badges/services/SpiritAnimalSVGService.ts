import { AnimalSpirit } from '../types';

interface AnimalSVGConfig {
  viewBox: string;
  paths: {
    main: string;
    details?: string[];
  };
  animationKeyframes?: Record<string, string>;
}

export class SpiritAnimalSVGService {
  private static animalConfigs: Record<AnimalSpirit, AnimalSVGConfig> = {
    [AnimalSpirit.BEAVER]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 25 C35 25 25 30 20 40 L15 50 C15 65 25 75 40 78 L45 85 C48 87 52 87 55 85 L60 78 C75 75 85 65 85 50 L80 40 C75 30 65 25 50 25 Z',
        details: [
          // Tail
          'M50 75 C45 78 40 82 35 85 C30 88 28 90 30 92 C32 94 38 92 45 88 L50 85 L55 88 C62 92 68 94 70 92 C72 90 70 88 65 85 C60 82 55 78 50 75 Z',
          // Eyes
          'M40 40 C38 40 36 42 36 44 C36 46 38 48 40 48 C42 48 44 46 44 44 C44 42 42 40 40 40 Z',
          'M60 40 C58 40 56 42 56 44 C56 46 58 48 60 48 C62 48 64 46 64 44 C64 42 62 40 60 40 Z',
          // Teeth
          'M48 55 L48 60 L52 60 L52 55 Z'
        ]
      }
    },
    [AnimalSpirit.EAGLE]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 20 L45 25 L40 35 L35 40 L25 45 L15 50 L20 55 L30 53 L40 50 L35 60 L30 70 L35 72 L45 65 L50 60 L55 65 L65 72 L70 70 L65 60 L60 50 L70 53 L80 55 L85 50 L75 45 L65 40 L60 35 L55 25 Z',
        details: [
          // Head
          'M50 20 C48 18 47 18 45 20 L43 25 L50 30 L57 25 L55 20 C53 18 52 18 50 20 Z',
          // Eyes
          'M46 24 C45 24 44 25 44 26 C44 27 45 28 46 28 C47 28 48 27 48 26 C48 25 47 24 46 24 Z',
          'M54 24 C53 24 52 25 52 26 C52 27 53 28 54 28 C55 28 56 27 56 26 C56 25 55 24 54 24 Z',
          // Beak
          'M50 28 L48 32 L50 34 L52 32 Z'
        ]
      }
    },
    [AnimalSpirit.FOX]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 30 C45 25 40 25 35 28 L30 35 L28 45 L30 55 L35 65 L40 70 L45 72 L50 75 L55 72 L60 70 L65 65 L70 55 L72 45 L70 35 L65 28 C60 25 55 25 50 30 Z',
        details: [
          // Ears
          'M35 28 L30 20 L32 18 L38 25 Z',
          'M65 28 L62 25 L68 18 L70 20 Z',
          // Eyes
          'M42 40 C40 40 38 42 38 44 C38 46 40 48 42 48 C44 48 46 46 46 44 C46 42 44 40 42 40 Z',
          'M58 40 C56 40 54 42 54 44 C54 46 56 48 58 48 C60 48 62 46 62 44 C62 42 60 40 58 40 Z',
          // Nose
          'M50 52 C48 52 46 54 46 56 C46 58 48 60 50 60 C52 60 54 58 54 56 C54 54 52 52 50 52 Z',
          // Tail
          'M50 70 L45 75 L40 80 L35 85 L33 88 L35 90 L40 88 L45 85 L50 82 L55 85 L60 88 L65 90 L67 88 L65 85 L60 80 L55 75 Z'
        ]
      }
    },
    [AnimalSpirit.WOLF]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 25 C45 20 40 20 35 23 L30 28 L25 35 L23 45 L25 55 L30 65 L35 70 L40 73 L45 75 L50 78 L55 75 L60 73 L65 70 L70 65 L75 55 L77 45 L75 35 L70 28 L65 23 C60 20 55 20 50 25 Z',
        details: [
          // Ears
          'M35 23 L30 15 L28 13 L27 15 L30 25 L35 28 Z',
          'M65 23 L70 25 L73 15 L72 13 L70 15 Z',
          // Eyes
          'M40 38 C38 38 36 40 36 42 C36 44 38 46 40 46 C42 46 44 44 44 42 C44 40 42 38 40 38 Z',
          'M60 38 C58 38 56 40 56 42 C56 44 58 46 60 46 C62 46 64 44 64 42 C64 40 62 38 60 38 Z',
          // Snout
          'M50 48 L45 52 L43 56 L45 58 L50 60 L55 58 L57 56 L55 52 Z',
          // Mouth
          'M50 60 L48 62 L45 65 L50 63 L55 65 L52 62 Z'
        ]
      }
    },
    [AnimalSpirit.BEAR]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 30 C40 30 30 35 25 45 L23 55 L25 65 L30 72 L40 77 L50 80 L60 77 L70 72 L75 65 L77 55 L75 45 C70 35 60 30 50 30 Z',
        details: [
          // Ears
          'M35 35 C33 30 30 28 27 30 C24 32 24 36 27 40 L35 42 Z',
          'M65 35 L73 40 C76 36 76 32 73 30 C70 28 67 30 65 35 Z',
          // Eyes
          'M40 45 C38 45 36 47 36 49 C36 51 38 53 40 53 C42 53 44 51 44 49 C44 47 42 45 40 45 Z',
          'M60 45 C58 45 56 47 56 49 C56 51 58 53 60 53 C62 53 64 51 64 49 C64 47 62 45 60 45 Z',
          // Nose
          'M50 55 C47 55 45 57 45 60 C45 63 47 65 50 65 C53 65 55 63 55 60 C55 57 53 55 50 55 Z'
        ]
      }
    },
    [AnimalSpirit.TURTLE]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 30 C35 30 25 40 25 50 C25 60 35 70 50 70 C65 70 75 60 75 50 C75 40 65 30 50 30 Z',
        details: [
          // Shell pattern
          'M50 35 L40 40 L35 50 L40 60 L50 65 L60 60 L65 50 L60 40 Z',
          'M50 45 L45 47 L45 53 L50 55 L55 53 L55 47 Z',
          // Head
          'M50 30 L48 25 L46 23 L44 25 L45 30 Z',
          // Legs
          'M35 40 L30 38 L28 40 L30 42 L35 42 Z',
          'M65 40 L70 38 L72 40 L70 42 L65 42 Z',
          'M35 60 L30 62 L28 60 L30 58 L35 58 Z',
          'M65 60 L70 62 L72 60 L70 58 L65 58 Z'
        ]
      }
    },
    [AnimalSpirit.OTTER]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 25 C45 25 40 28 35 32 L30 40 L28 50 L30 60 L35 68 L40 72 L45 75 L50 77 L55 75 L60 72 L65 68 L70 60 L72 50 L70 40 L65 32 C60 28 55 25 50 25 Z',
        details: [
          // Whiskers
          'M35 45 L25 43 M35 47 L25 47 M35 49 L25 51',
          'M65 45 L75 43 M65 47 L75 47 M65 49 L75 51',
          // Eyes
          'M42 40 C40 40 38 42 38 44 C38 46 40 48 42 48 C44 48 46 46 46 44 C46 42 44 40 42 40 Z',
          'M58 40 C56 40 54 42 54 44 C54 46 56 48 58 48 C60 48 62 46 62 44 C62 42 60 40 58 40 Z',
          // Nose
          'M50 48 C48 48 46 50 46 52 C46 54 48 56 50 56 C52 56 54 54 54 52 C54 50 52 48 50 48 Z',
          // Tail
          'M50 72 L48 75 L45 80 L43 85 L45 87 L50 85 L55 87 L57 85 L55 80 L52 75 Z'
        ]
      }
    },
    [AnimalSpirit.WOLVERINE]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 28 C45 25 40 25 35 28 L30 33 L25 40 L23 50 L25 60 L30 67 L35 72 L40 75 L45 77 L50 78 L55 77 L60 75 L65 72 L70 67 L75 60 L77 50 L75 40 L70 33 L65 28 C60 25 55 25 50 28 Z',
        details: [
          // Ears
          'M35 28 L32 22 L30 20 L28 22 L30 28 Z',
          'M65 28 L70 28 L72 22 L70 20 L68 22 Z',
          // Eyes
          'M40 40 C38 40 36 42 36 44 C36 46 38 48 40 48 C42 48 44 46 44 44 C44 42 42 40 40 40 Z',
          'M60 40 C58 40 56 42 56 44 C56 46 58 48 60 48 C62 48 64 46 64 44 C64 42 60 40 60 40 Z',
          // Claws
          'M35 70 L32 73 L30 75 M40 72 L38 75 L36 77 M45 73 L43 76 L42 78',
          'M65 70 L68 73 L70 75 M60 72 L62 75 L64 77 M55 73 L57 76 L58 78'
        ]
      }
    },
    [AnimalSpirit.MARTEN]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 30 C45 28 40 28 35 30 L32 35 L30 45 L32 55 L35 65 L40 70 L45 73 L50 75 L55 73 L60 70 L65 65 L68 55 L70 45 L68 35 L65 30 C60 28 55 28 50 30 Z',
        details: [
          // Ears
          'M35 30 L32 25 L30 23 L28 25 L30 30 Z',
          'M65 30 L70 30 L72 25 L70 23 L68 25 Z',
          // Eyes
          'M42 42 C40 42 38 44 38 46 C38 48 40 50 42 50 C44 50 46 48 46 46 C46 44 44 42 42 42 Z',
          'M58 42 C56 42 54 44 54 46 C54 48 56 50 58 50 C60 50 62 48 62 46 C62 44 60 42 58 42 Z',
          // Nose
          'M50 52 C48 52 46 54 46 56 C46 58 48 60 50 60 C52 60 54 58 54 56 C54 54 52 52 50 52 Z'
        ]
      }
    },
    [AnimalSpirit.RAVEN]: {
      viewBox: '0 0 100 100',
      paths: {
        main: 'M50 20 L45 22 L40 25 L35 30 L32 35 L30 42 L30 50 L32 58 L35 65 L40 70 L45 73 L50 75 L55 73 L60 70 L65 65 L68 58 L70 50 L70 42 L68 35 L65 30 L60 25 L55 22 Z',
        details: [
          // Beak
          'M50 35 L45 38 L40 40 L38 42 L40 44 L45 42 L50 40 L55 42 L60 44 L62 42 L60 40 L55 38 Z',
          // Eyes
          'M43 32 C41 32 39 34 39 36 C39 38 41 40 43 40 C45 40 47 38 47 36 C47 34 45 32 43 32 Z',
          'M57 32 C55 32 53 34 53 36 C53 38 55 40 57 40 C59 40 61 38 61 36 C61 34 59 32 57 32 Z',
          // Wings
          'M35 45 L25 40 L20 42 L18 45 L20 48 L25 50 L35 52 Z',
          'M65 45 L75 40 L80 42 L82 45 L80 48 L75 50 L65 52 Z',
          // Tail feathers
          'M50 70 L48 73 L45 75 L42 77 L45 78 L48 76 L50 74 L52 76 L55 78 L58 77 L55 75 L52 73 Z'
        ]
      }
    }
  };

  static getSVGConfig(animal: AnimalSpirit): AnimalSVGConfig {
    return this.animalConfigs[animal];
  }

  static generateSVG(
    animal: AnimalSpirit,
    colors: { primary: string; secondary: string; accent: string },
    size: number = 200
  ): string {
    const config = this.getSVGConfig(animal);
    const { paths } = config;

    let svgContent = `
      <svg width="${size}" height="${size}" viewBox="${config.viewBox}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="animalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Main animal shape -->
        <path d="${paths.main}" fill="url(#animalGradient)" stroke="${colors.accent}" stroke-width="1" filter="url(#glow)" />
        
        <!-- Details -->
        ${paths.details?.map((detail, index) => 
          `<path d="${detail}" fill="${colors.accent}" opacity="0.8" />`
        ).join('')}
      </svg>
    `;

    return svgContent.trim();
  }

  static getAnimationKeyframes(animal: AnimalSpirit, animation: 'idle' | 'hover' | 'click' | 'evolution'): string {
    const animationMap: Record<string, string> = {
      'idle': `
        @keyframes ${animal}-idle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
      `,
      'hover': `
        @keyframes ${animal}-hover {
          0% { transform: scale(1) rotate(0deg); }
          100% { transform: scale(1.1) rotate(5deg); }
        }
      `,
      'click': `
        @keyframes ${animal}-click {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(0.9) rotate(-10deg); }
          100% { transform: scale(1) rotate(360deg); }
        }
      `,
      'evolution': `
        @keyframes ${animal}-evolution {
          0% { 
            transform: scale(1) rotate(0deg);
            filter: brightness(1) hue-rotate(0deg);
          }
          50% { 
            transform: scale(1.5) rotate(180deg);
            filter: brightness(2) hue-rotate(180deg);
          }
          100% { 
            transform: scale(1) rotate(360deg);
            filter: brightness(1) hue-rotate(360deg);
          }
        }
      `
    };

    return animationMap[animation] || '';
  }
}