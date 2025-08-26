/**
 * Cultural Context Component
 * Provides cultural information and respectful usage guidelines
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Info, 
  Heart, 
  Users, 
  MapPin, 
  AlertTriangle,
  BookOpen,
  Feather,
  Star
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n/translation-provider'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'

interface CulturalContextProps {
  languageCode: string
  showDetails?: boolean
  className?: string
}

export default function CulturalContext({
  languageCode,
  showDetails = false,
  className = ''
}: CulturalContextProps) {
  const { languages, t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(showDetails)
  
  const lang = languages[languageCode]
  if (!lang || languageCode === 'en') return null

  const culturalInfo = getCulturalInformation(languageCode)

  return (
    <GlassPanel className={`${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Feather className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {lang.nativeName}
            </h3>
            <p className="text-sm text-gray-400">
              Cultural & Language Information
            </p>
          </div>
        </div>
        
        <GlassButton
          variant="secondary"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Info className="h-4 w-4" />
          {isExpanded ? 'Less' : 'More'}
        </GlassButton>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
          <div className="text-white font-medium">
            {formatNumber(lang.speakers)}
          </div>
          <div className="text-xs text-gray-400">Speakers</div>
        </div>
        
        <div className="text-center">
          <MapPin className="h-6 w-6 text-green-400 mx-auto mb-2" />
          <div className="text-white font-medium">
            {lang.region.length}
          </div>
          <div className="text-xs text-gray-400">Regions</div>
        </div>
        
        <div className="text-center">
          <BookOpen className="h-6 w-6 text-purple-400 mx-auto mb-2" />
          <div className="text-white font-medium">
            {lang.writing === 'both' ? 'Both' : lang.writing}
          </div>
          <div className="text-xs text-gray-400">Writing System</div>
        </div>
        
        <div className="text-center">
          {lang.endangered ? (
            <>
              <AlertTriangle className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <div className="text-orange-400 font-medium">
                Endangered
              </div>
            </>
          ) : (
            <>
              <Star className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <div className="text-green-400 font-medium">
                Stable
              </div>
            </>
          )}
          <div className="text-xs text-gray-400">Status</div>
        </div>
      </div>

      {/* Expanded Cultural Information */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 border-t border-white/10 pt-6"
          >
            {/* Cultural Guidelines */}
            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center">
                <Heart className="h-4 w-4 text-red-400 mr-2" />
                Respectful Usage Guidelines
              </h4>
              <div className="space-y-2 text-sm text-gray-300">
                {culturalInfo.guidelines.map((guideline, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                    <span>{guideline}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Traditional Territories */}
            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center">
                <MapPin className="h-4 w-4 text-green-400 mr-2" />
                Traditional Territories
              </h4>
              <div className="flex flex-wrap gap-2">
                {lang.region.map((region, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>

            {/* Cultural Significance */}
            {culturalInfo.significance && (
              <div>
                <h4 className="text-white font-semibold mb-3">
                  Cultural Significance
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {culturalInfo.significance}
                </p>
              </div>
            )}

            {/* Language Revitalization */}
            {culturalInfo.revitalization && (
              <div>
                <h4 className="text-white font-semibold mb-3">
                  Revitalization Efforts
                </h4>
                <div className="space-y-2 text-sm text-gray-300">
                  {culturalInfo.revitalization.map((effort, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="h-1.5 w-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                      <span>{effort}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Resources */}
            {culturalInfo.resources && (
              <div>
                <h4 className="text-white font-semibold mb-3">
                  Learning Resources
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {culturalInfo.resources.map((resource, index) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                    >
                      <div className="font-medium text-white">
                        {resource.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {resource.type}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Land Acknowledgment */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-amber-300 font-semibold mb-2">
                Land Acknowledgment
              </h4>
              <p className="text-sm text-amber-200 leading-relaxed">
                {culturalInfo.landAcknowledgment}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  )
}

// Cultural information data
function getCulturalInformation(languageCode: string) {
  const culturalData: Record<string, any> = {
    'cr': {
      guidelines: [
        'Cree is a sacred language with deep spiritual significance',
        'Many words have multiple layers of meaning rooted in cultural practices',
        'Syllabics writing system is considered culturally significant',
        'Elder speakers should be consulted for important translations',
        'Traditional protocols apply when using ceremonial language'
      ],
      significance: 'The Cree language (Nêhiyawêwin) is one of the most widely spoken Indigenous languages in Canada. It carries thousands of years of cultural knowledge, traditional ecological wisdom, and spiritual teachings. The language is deeply connected to the land and reflects a worldview centered on relationships and reciprocity.',
      revitalization: [
        'Immersion schools in Cree communities',
        'Online learning platforms and mobile apps',
        'University degree programs in Cree language',
        'Community-led language nests for children',
        'Elder-youth mentorship programs'
      ],
      resources: [
        { name: 'Cree Literacy Network', type: 'Educational', url: 'https://www.creeliteracy.org' },
        { name: 'Miyo Wahkohtowin', type: 'Community', url: 'https://miyowahkohtowin.ca' },
        { name: 'Cree Dictionary', type: 'Reference', url: 'https://dictionary.cree.ca' }
      ],
      landAcknowledgment: 'We acknowledge that Cree peoples have been stewards of these lands since time immemorial, from the boreal forests of the north to the prairies of the south. Their traditional knowledge and relationship with the land continues to guide sustainable practices today.'
    },
    'oj': {
      guidelines: [
        'Ojibwe language embodies Indigenous ways of knowing and being',
        'Many concepts cannot be directly translated and require cultural context',
        'Clan and ceremonial language requires special protocols',
        'Seasonal and directional concepts are central to the language',
        'Traditional stories and teachings are held in sacred trust'
      ],
      significance: 'Anishinaabemowin (Ojibwe language) is the heart of Anishinaabe culture, carrying forward the teachings of the Seven Fires and traditional ecological knowledge. The language embodies a relationship-based worldview where all beings are considered relatives.',
      revitalization: [
        'Language immersion camps and programs',
        'Anishinaabe language teacher training',
        'Digital storytelling projects',
        'Traditional knowledge keeper programs',
        'Youth language circles and cultural camps'
      ],
      resources: [
        { name: 'Gakina-awiiya', type: 'Language Learning', url: 'https://gakina-awiiya.com' },
        { name: 'Ojibwe People\'s Dictionary', type: 'Reference', url: 'https://ojibwe.lib.umn.edu' },
        { name: 'Anishinaabe Language Institute', type: 'Educational', url: 'https://anishinaabelanguage.ca' }
      ],
      landAcknowledgment: 'We honor the Anishinaabe peoples as the original inhabitants of this land, whose deep relationship with Aki (the Earth) and all her beings guides us toward living in balance and reciprocity.'
    },
    'iu': {
      guidelines: [
        'Inuktitut reflects a unique Arctic worldview and relationship with the land',
        'Many words describe specific ice, snow, and weather conditions',
        'Traditional knowledge about hunting and survival is embedded in the language',
        'Elders are the keepers of specialized vocabulary and cultural protocols',
        'Respectful use honors Inuit sovereignty and self-determination'
      ],
      significance: 'Inuktitut is the living embodiment of thousands of years of Inuit knowledge and adaptation to the Arctic environment. The language carries essential traditional ecological knowledge about ice, weather, animals, and survival that continues to guide Inuit communities today.',
      revitalization: [
        'Inuktitut immersion programs in schools',
        'Digital archiving of elder stories and knowledge',
        'Community radio and media in Inuktitut',
        'Traditional skills programs taught in Inuktitut',
        'Youth cultural camps and land-based learning'
      ],
      resources: [
        { name: 'Inuktitut Tusaalanga', type: 'Language Learning', url: 'https://tusaalanga.ca' },
        { name: 'Inuit Tapiriit Kanatami', type: 'Cultural Organization', url: 'https://itk.ca' },
        { name: 'Living Dictionary', type: 'Reference', url: 'https://livingdictionary.com' }
      ],
      landAcknowledgment: 'We acknowledge Inuit as the Indigenous peoples of the Arctic, whose knowledge and stewardship of the land and ice continues to guide understanding of our changing world.'
    }
  }

  return culturalData[languageCode] || {}
}

// Helper function to format numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`
  }
  return num.toString()
}