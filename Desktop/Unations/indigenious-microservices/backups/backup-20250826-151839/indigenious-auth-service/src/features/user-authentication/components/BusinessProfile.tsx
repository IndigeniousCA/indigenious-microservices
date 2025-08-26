// Business Profile Component
// Comprehensive business information and capabilities management

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Building, MapPin, Phone, Mail, Globe, Users, 
  DollarSign, Shield, Award, FileText, Edit3, Save,
  X, Plus, Trash2, Calendar, Star, Info
} from 'lucide-react'
import type { BusinessProfile as BusinessProfileType } from '../types/auth.types'

interface BusinessProfileProps {
  businessProfile: BusinessProfileType
  onUpdate: (data: Partial<BusinessProfileType>) => void
  isEditable?: boolean
}

export function BusinessProfile({ businessProfile, onUpdate, isEditable = false }: BusinessProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<BusinessProfileType>(businessProfile)
  const [newServiceCategory, setNewServiceCategory] = useState('')
  const [newCapability, setNewCapability] = useState('')

  const handleSave = () => {
    onUpdate(editedProfile)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedProfile(businessProfile)
    setIsEditing(false)
  }

  const addServiceCategory = () => {
    if (newServiceCategory.trim()) {
      setEditedProfile(prev => ({
        ...prev,
        serviceCategories: [...(prev.serviceCategories || []), newServiceCategory.trim()]
      }))
      setNewServiceCategory('')
    }
  }

  const removeServiceCategory = (index: number) => {
    setEditedProfile(prev => ({
      ...prev,
      serviceCategories: prev.serviceCategories?.filter((_, i) => i !== index) || []
    }))
  }

  const addCapability = () => {
    if (newCapability.trim()) {
      setEditedProfile(prev => ({
        ...prev,
        capabilities: [...(prev.capabilities || []), newCapability.trim()]
      }))
      setNewCapability('')
    }
  }

  const removeCapability = (index: number) => {
    setEditedProfile(prev => ({
      ...prev,
      capabilities: prev.capabilities?.filter((_, i) => i !== index) || []
    }))
  }

  const businessTypes = [
    { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'corporation', label: 'Corporation' },
    { value: 'cooperative', label: 'Cooperative' },
    { value: 'non_profit', label: 'Non-Profit' }
  ]

  const commonIndustries = [
    'Construction', 'Engineering', 'Consulting', 'Technology', 'Healthcare',
    'Education', 'Transportation', 'Manufacturing', 'Agriculture', 'Tourism',
    'Arts & Culture', 'Environmental Services', 'Financial Services'
  ]

  const provinces = [
    'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Business Profile</h2>
          <p className="text-white/60 mt-1">
            Comprehensive business information and capabilities
          </p>
        </div>
        
        {isEditable && (
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                    rounded-lg text-white transition-colors flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-blue-600 
                    hover:from-emerald-700 hover:to-blue-700 rounded-lg text-white 
                    transition-all duration-200 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                  border-blue-400/50 rounded-lg text-blue-200 transition-colors 
                  flex items-center"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Building className="w-5 h-5 mr-2 text-blue-400" />
          Company Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Legal Business Name *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.legalName}
                onChange={(e) => setEditedProfile(prev => ({
                  ...prev,
                  legalName: e.target.value
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-blue-400"
                placeholder="Enter legal business name"
              />
            ) : (
              <p className="text-white">{businessProfile.legalName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Trade Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.tradeName || ''}
                onChange={(e) => setEditedProfile(prev => ({
                  ...prev,
                  tradeName: e.target.value
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-blue-400"
                placeholder="Enter trade name (if different)"
              />
            ) : (
              <p className="text-white">{businessProfile.tradeName || 'Not specified'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Business Type *
            </label>
            {isEditing ? (
              <select
                value={editedProfile.businessType}
                onChange={(e) => setEditedProfile(prev => ({
                  ...prev,
                  businessType: e.target.value as unknown
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {businessTypes.map(type => (
                  <option key={type.value} value={type.value} className="bg-gray-800">
                    {type.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-white capitalize">
                {businessProfile.businessType?.replace('_', ' ')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Business Number
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.businessNumber || ''}
                onChange={(e) => setEditedProfile(prev => ({
                  ...prev,
                  businessNumber: e.target.value
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-blue-400"
                placeholder="Enter business number"
              />
            ) : (
              <p className="text-white">{businessProfile.businessNumber || 'Not provided'}</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-white/80 mb-2">
            Business Description *
          </label>
          {isEditing ? (
            <textarea
              rows={4}
              value={editedProfile.description}
              onChange={(e) => setEditedProfile(prev => ({
                ...prev,
                description: e.target.value
              }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:outline-none focus:ring-2 
                focus:ring-blue-400 resize-none"
              placeholder="Describe your business, services, and key strengths"
            />
          ) : (
            <p className="text-white">{businessProfile.description}</p>
          )}
        </div>
      </div>

      {/* Service Categories & Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Categories */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-emerald-400" />
            Service Categories
          </h3>
          
          <div className="space-y-3">
            {(isEditing ? editedProfile.serviceCategories : businessProfile.serviceCategories)?.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 
                bg-white/5 rounded-lg">
                <span className="text-white">{category}</span>
                {isEditing && (
                  <button
                    onClick={() => removeServiceCategory(index)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            
            {isEditing && (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addServiceCategory()}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-blue-400"
                  placeholder="Add service category"
                />
                <button
                  onClick={addServiceCategory}
                  className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                    border-emerald-400/50 rounded-lg text-emerald-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {isEditing && (
              <div className="mt-4">
                <p className="text-sm text-white/60 mb-2">Common Industries:</p>
                <div className="flex flex-wrap gap-2">
                  {commonIndustries.map((industry) => (
                    <button
                      key={industry}
                      onClick={() => {
                        if (!editedProfile.serviceCategories?.includes(industry)) {
                          setEditedProfile(prev => ({
                            ...prev,
                            serviceCategories: [...(prev.serviceCategories || []), industry]
                          }))
                        }
                      }}
                      className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 
                        text-blue-300 text-xs rounded transition-colors"
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Capabilities */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-purple-400" />
            Key Capabilities
          </h3>
          
          <div className="space-y-3">
            {(isEditing ? editedProfile.capabilities : businessProfile.capabilities)?.map((capability, index) => (
              <div key={index} className="flex items-center justify-between p-3 
                bg-white/5 rounded-lg">
                <span className="text-white">{capability}</span>
                {isEditing && (
                  <button
                    onClick={() => removeCapability(index)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            
            {isEditing && (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCapability}
                  onChange={(e) => setNewCapability(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCapability()}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-blue-400"
                  placeholder="Add capability"
                />
                <button
                  onClick={addCapability}
                  className="p-2 bg-purple-500/20 hover:bg-purple-500/30 border 
                    border-purple-400/50 rounded-lg text-purple-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Information */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-amber-400" />
          Location Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Street Address *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.headquarters?.street || ''}
                onChange={(e) => setEditedProfile(prev => ({
                  ...prev,
                  headquarters: {
                    ...prev.headquarters,
                    street: e.target.value
                  }
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-blue-400"
                placeholder="Enter street address"
              />
            ) : (
              <p className="text-white">{businessProfile.headquarters?.street}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              City *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.headquarters?.city || ''}
                onChange={(e) => setEditedProfile(prev => ({
                  ...prev,
                  headquarters: {
                    ...prev.headquarters,
                    city: e.target.value
                  }
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-blue-400"
                placeholder="Enter city"
              />
            ) : (
              <p className="text-white">{businessProfile.headquarters?.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Province *
            </label>
            {isEditing ? (
              <select
                value={editedProfile.headquarters?.province || ''}
                onChange={(e) => setEditedProfile(prev => ({
                  ...prev,
                  headquarters: {
                    ...prev.headquarters,
                    province: e.target.value
                  }
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Province</option>
                {provinces.map(province => (
                  <option key={province} value={province} className="bg-gray-800">
                    {province}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-white">{businessProfile.headquarters?.province}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Postal Code *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.headquarters?.postalCode || ''}
                onChange={(e) => setEditedProfile(prev => ({
                  ...prev,
                  headquarters: {
                    ...prev.headquarters,
                    postalCode: e.target.value.toUpperCase()
                  }
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-blue-400"
                placeholder="A1A 1A1"
              />
            ) : (
              <p className="text-white">{businessProfile.headquarters?.postalCode}</p>
            )}
          </div>
        </div>
      </div>

      {/* Indigenous Business Information */}
      {businessProfile.indigenousOwnership !== undefined && (
        <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-purple-200 mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Indigenous Business Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-purple-200/80 mb-2">
                Indigenous Ownership Percentage
              </label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editedProfile.indigenousOwnership || ''}
                  onChange={(e) => setEditedProfile(prev => ({
                    ...prev,
                    indigenousOwnership: parseInt(e.target.value) || 0
                  }))}
                  className="w-full px-4 py-3 bg-white/5 border border-purple-400/30 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-purple-400"
                  placeholder="Enter percentage"
                />
              ) : (
                <p className="text-purple-100">{businessProfile.indigenousOwnership}%</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200/80 mb-2">
                Total Employees
              </label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={editedProfile.totalEmployees || ''}
                  onChange={(e) => setEditedProfile(prev => ({
                    ...prev,
                    totalEmployees: parseInt(e.target.value) || 0
                  }))}
                  className="w-full px-4 py-3 bg-white/5 border border-purple-400/30 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-purple-400"
                  placeholder="Enter total employees"
                />
              ) : (
                <p className="text-purple-100">{businessProfile.totalEmployees || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200/80 mb-2">
                Indigenous Employees
              </label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={editedProfile.indigenousEmployees || ''}
                  onChange={(e) => setEditedProfile(prev => ({
                    ...prev,
                    indigenousEmployees: parseInt(e.target.value) || 0
                  }))}
                  className="w-full px-4 py-3 bg-white/5 border border-purple-400/30 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-purple-400"
                  placeholder="Enter Indigenous employees"
                />
              ) : (
                <p className="text-purple-100">{businessProfile.indigenousEmployees || 'Not specified'}</p>
              )}
            </div>

            <div className="flex items-center">
              <div>
                <p className="text-sm text-purple-200/80">Indigenous Workforce</p>
                <p className="text-lg font-semibold text-purple-100">
                  {businessProfile.totalEmployees && businessProfile.indigenousEmployees
                    ? Math.round((businessProfile.indigenousEmployees / businessProfile.totalEmployees) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Notice */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-200 font-medium mb-1">
              Profile Visibility
            </p>
            <p className="text-blue-100/80">
              Your business profile information is used to match you with relevant opportunities 
              and help government buyers find qualified Indigenous suppliers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}