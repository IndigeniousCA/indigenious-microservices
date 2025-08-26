// Indigenous Verification Component
// Nation membership and ownership verification with cultural sensitivity

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, Upload, FileText, Check, Clock, AlertCircle, 
  Info, Star, Shield, Eye, Download, X, Plus,
  Map, Users, Heart, Book, Award, Feather
} from 'lucide-react'
import type { User, IndigenousIdentity } from '../types/auth.types'

interface IndigenousVerificationProps {
  user: User
  onUpdate: (data: Partial<IndigenousIdentity>) => void
}

export function IndigenousVerification({ user, onUpdate }: IndigenousVerificationProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedIdentity, setEditedIdentity] = useState<IndigenousIdentity>(
    user.indigenousIdentity || {
      verificationStatus: 'pending',
      verificationDocuments: []
    }
  )
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [showCulturalInfo, setShowCulturalInfo] = useState(false)

  const handleSave = () => {
    onUpdate(editedIdentity)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedIdentity(user.indigenousIdentity || {
      verificationStatus: 'pending',
      verificationDocuments: []
    })
    setIsEditing(false)
  }

  const handleFileUpload = async (type: string, files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploadingFile(type)
    
    // Simulate file upload
    setTimeout(() => {
      const file = files[0]
      const newDocument = `${type}-${Date.now()}-${file.name}`
      
      setEditedIdentity(prev => ({
        ...prev,
        verificationDocuments: [...(prev.verificationDocuments || []), newDocument]
      }))
      
      setUploadingFile(null)
    }, 2000)
  }

  const removeDocument = (document: string) => {
    setEditedIdentity(prev => ({
      ...prev,
      verificationDocuments: prev.verificationDocuments?.filter(doc => doc !== document) || []
    }))
  }

  const getVerificationStatusColor = () => {
    switch (editedIdentity.verificationStatus) {
      case 'approved':
        return 'emerald'
      case 'pending':
        return 'amber'
      case 'in_review':
        return 'blue'
      case 'rejected':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getVerificationStatusIcon = () => {
    switch (editedIdentity.verificationStatus) {
      case 'approved':
        return <Check className="w-5 h-5" />
      case 'pending':
      case 'in_review':
        return <Clock className="w-5 h-5" />
      case 'rejected':
        return <AlertCircle className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const commonNations = [
    'Mikisew Cree First Nation',
    'Six Nations of the Grand River',
    'Mohawk Nation',
    'Ojibwe Nation',
    'Mi\'kmaq Nation',
    'Métis Nation of Alberta',
    'Inuit Tapiriit Kanatami',
    'Assembly of First Nations',
    'Congress of Aboriginal Peoples'
  ]

  const traditionalTerritories = [
    'Treaty 1', 'Treaty 2', 'Treaty 3', 'Treaty 4', 'Treaty 5', 'Treaty 6', 
    'Treaty 7', 'Treaty 8', 'Treaty 9', 'Treaty 10', 'Treaty 11',
    'Numbered Treaties', 'Robinson Treaties', 'Douglas Treaties',
    'Traditional Métis Territory', 'Inuit Nunangat'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Globe className="w-7 h-7 mr-3 text-purple-400" />
            Indigenous Identity Verification
          </h2>
          <p className="text-white/60 mt-1">
            Nation membership and cultural affiliation with respect for sovereignty
          </p>
        </div>
        
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
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 
                  hover:from-purple-700 hover:to-blue-700 rounded-lg text-white 
                  transition-all duration-200 flex items-center"
              >
                <Shield className="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border 
                border-purple-400/50 rounded-lg text-purple-200 transition-colors 
                flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Update Information
            </button>
          )}
        </div>
      </div>

      {/* Cultural Acknowledgment */}
      <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <Feather className="w-6 h-6 text-purple-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-purple-200 mb-2">
              Cultural Protocols and Data Sovereignty
            </h3>
            <p className="text-purple-100/80 text-sm mb-4">
              We recognize Indigenous peoples' inherent rights to control and govern their data. 
              This verification process respects traditional protocols and community governance structures.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-purple-400" />
                <span className="text-purple-200">Respectful data collection</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-purple-200">Community consent honored</span>
              </div>
              <div className="flex items-center space-x-2">
                <Book className="w-4 h-4 text-purple-400" />
                <span className="text-purple-200">Traditional knowledge protected</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-purple-200">Collective rights respected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status */}
      <div className={`bg-${getVerificationStatusColor()}-500/10 border border-${getVerificationStatusColor()}-400/30 rounded-xl p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`text-${getVerificationStatusColor()}-400`}>
              {getVerificationStatusIcon()}
            </div>
            <div>
              <h3 className={`text-lg font-semibold text-${getVerificationStatusColor()}-200`}>
                Verification Status: {editedIdentity.verificationStatus?.replace('_', ' ').toUpperCase()}
              </h3>
              <p className={`text-${getVerificationStatusColor()}-100/80 text-sm`}>
                {editedIdentity.verificationStatus === 'approved' && 'Your Indigenous identity has been verified'}
                {editedIdentity.verificationStatus === 'pending' && 'Awaiting document submission and review'}
                {editedIdentity.verificationStatus === 'in_review' && 'Documents under review by our verification team'}
                {editedIdentity.verificationStatus === 'rejected' && 'Verification unsuccessful - please contact support'}
              </p>
            </div>
          </div>
          
          {editedIdentity.verifiedAt && (
            <div className="text-right">
              <p className={`text-${getVerificationStatusColor()}-200 text-sm`}>
                Verified: {new Date(editedIdentity.verifiedAt).toLocaleDateString()}
              </p>
              {editedIdentity.verifiedBy && (
                <p className={`text-${getVerificationStatusColor()}-100/60 text-xs`}>
                  By: {editedIdentity.verifiedBy}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nation and Community Information */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Map className="w-5 h-5 mr-2 text-blue-400" />
          Nation and Community Affiliation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              First Nation / Tribe / Nation
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editedIdentity.firstNation || ''}
                  onChange={(e) => setEditedIdentity(prev => ({
                    ...prev,
                    firstNation: e.target.value
                  }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-purple-400"
                  placeholder="Enter your First Nation, Tribe, or Nation"
                />
                <div className="flex flex-wrap gap-2">
                  {commonNations.slice(0, 3).map((nation) => (
                    <button
                      key={nation}
                      onClick={() => setEditedIdentity(prev => ({
                        ...prev,
                        firstNation: nation
                      }))}
                      className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 
                        text-purple-300 text-xs rounded transition-colors"
                    >
                      {nation}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-white">{editedIdentity.firstNation || 'Not specified'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Traditional Territory
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editedIdentity.traditionalTerritory || ''}
                  onChange={(e) => setEditedIdentity(prev => ({
                    ...prev,
                    traditionalTerritory: e.target.value
                  }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-purple-400"
                  placeholder="Enter traditional territory"
                />
                <div className="flex flex-wrap gap-2">
                  {traditionalTerritories.slice(0, 4).map((territory) => (
                    <button
                      key={territory}
                      onClick={() => setEditedIdentity(prev => ({
                        ...prev,
                        traditionalTerritory: territory
                      }))}
                      className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 
                        text-blue-300 text-xs rounded transition-colors"
                    >
                      {territory}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-white">{editedIdentity.traditionalTerritory || 'Not specified'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Status Card Number
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedIdentity.statusCardNumber || ''}
                onChange={(e) => setEditedIdentity(prev => ({
                  ...prev,
                  statusCardNumber: e.target.value
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-purple-400"
                placeholder="Enter status card number"
              />
            ) : (
              <p className="text-white">
                {editedIdentity.statusCardNumber 
                  ? `****-****-${editedIdentity.statusCardNumber.slice(-4)}`
                  : 'Not provided'
                }
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Traditional Language
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedIdentity.traditionalLanguage || ''}
                onChange={(e) => setEditedIdentity(prev => ({
                  ...prev,
                  traditionalLanguage: e.target.value
                }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-purple-400"
                placeholder="Enter traditional language"
              />
            ) : (
              <p className="text-white">{editedIdentity.traditionalLanguage || 'Not specified'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Business Ownership Information */}
      {user.type === 'indigenous_business' && (
        <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-emerald-200 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Indigenous Business Ownership
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-emerald-200/80 mb-2">
                Indigenous Ownership Percentage
              </label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editedIdentity.indigenousOwnershipPercentage || ''}
                  onChange={(e) => setEditedIdentity(prev => ({
                    ...prev,
                    indigenousOwnershipPercentage: parseInt(e.target.value) || 0
                  }))}
                  className="w-full px-4 py-3 bg-white/5 border border-emerald-400/30 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-emerald-400"
                  placeholder="Enter ownership percentage"
                />
              ) : (
                <p className="text-emerald-100">
                  {editedIdentity.indigenousOwnershipPercentage || 0}%
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-200/80 mb-2">
                Ownership Documentation
              </label>
              <div className="space-y-2">
                {editedIdentity.ownershipDocumentation?.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 
                    bg-emerald-900/20 rounded-lg">
                    <span className="text-emerald-100 text-sm">{doc}</span>
                    {isEditing && (
                      <button
                        onClick={() => {
                          setEditedIdentity(prev => ({
                            ...prev,
                            ownershipDocumentation: prev.ownershipDocumentation?.filter((_, i) => i !== index)
                          }))
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Section */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-amber-400" />
          Verification Documents
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Card Upload */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-white/80">
              Status Card / Membership Card
            </label>
            <div className="border-2 border-dashed border-white/20 rounded-lg p-4 
              hover:border-white/40 transition-colors">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload('status_card', e.target.files)}
                className="hidden"
                id="status-card-upload"
                disabled={!isEditing}
              />
              <label
                htmlFor="status-card-upload"
                className={`cursor-pointer flex flex-col items-center space-y-2 
                  ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingFile === 'status_card' ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                ) : (
                  <Upload className="w-8 h-8 text-white/40" />
                )}
                <span className="text-white/60 text-sm text-center">
                  {uploadingFile === 'status_card' 
                    ? 'Uploading...' 
                    : 'Click to upload status card'
                  }
                </span>
              </label>
            </div>
          </div>

          {/* Ownership Documents Upload */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-white/80">
              Ownership Documents
            </label>
            <div className="border-2 border-dashed border-white/20 rounded-lg p-4 
              hover:border-white/40 transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                onChange={(e) => handleFileUpload('ownership_docs', e.target.files)}
                className="hidden"
                id="ownership-docs-upload"
                disabled={!isEditing}
              />
              <label
                htmlFor="ownership-docs-upload"
                className={`cursor-pointer flex flex-col items-center space-y-2 
                  ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingFile === 'ownership_docs' ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                ) : (
                  <Upload className="w-8 h-8 text-white/40" />
                )}
                <span className="text-white/60 text-sm text-center">
                  {uploadingFile === 'ownership_docs' 
                    ? 'Uploading...' 
                    : 'Click to upload ownership documents'
                  }
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Uploaded Documents List */}
        {editedIdentity.verificationDocuments && editedIdentity.verificationDocuments.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-white/80 mb-3">Uploaded Documents</h4>
            <div className="space-y-2">
              {editedIdentity.verificationDocuments.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 
                  bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-white/40" />
                    <span className="text-white text-sm">{doc}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-blue-500/20 rounded text-blue-400 
                      transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => removeDocument(doc)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400 
                          transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cultural Information Toggle */}
      <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-indigo-200 flex items-center">
            <Star className="w-5 h-5 mr-2" />
            Cultural Information (Optional)
          </h3>
          <button
            onClick={() => setShowCulturalInfo(!showCulturalInfo)}
            className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border 
              border-indigo-400/50 rounded text-indigo-200 text-sm transition-colors 
              flex items-center"
          >
            <Eye className="w-4 h-4 mr-1" />
            {showCulturalInfo ? 'Hide' : 'Show'}
          </button>
        </div>
        
        <AnimatePresence>
          {showCulturalInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <p className="text-indigo-100/80 text-sm">
                This section allows you to share cultural information that you're comfortable 
                sharing. All information is optional and will be handled with respect for 
                traditional protocols.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-200/80 mb-2">
                    Clan or Family
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedIdentity.clanOrFamily || ''}
                      onChange={(e) => setEditedIdentity(prev => ({
                        ...prev,
                        clanOrFamily: e.target.value
                      }))}
                      className="w-full px-4 py-3 bg-white/5 border border-indigo-400/30 rounded-lg 
                        text-white placeholder-white/40 focus:outline-none focus:ring-2 
                        focus:ring-indigo-400"
                      placeholder="Enter clan or family (optional)"
                    />
                  ) : (
                    <p className="text-indigo-100">{editedIdentity.clanOrFamily || 'Not shared'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200/80 mb-2">
                    Ceremonial Role
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedIdentity.ceremonialRole || ''}
                      onChange={(e) => setEditedIdentity(prev => ({
                        ...prev,
                        ceremonialRole: e.target.value
                      }))}
                      className="w-full px-4 py-3 bg-white/5 border border-indigo-400/30 rounded-lg 
                        text-white placeholder-white/40 focus:outline-none focus:ring-2 
                        focus:ring-indigo-400"
                      placeholder="Enter ceremonial role (optional)"
                    />
                  ) : (
                    <p className="text-indigo-100">{editedIdentity.ceremonialRole || 'Not shared'}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Data Sovereignty Notice */}
      <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-purple-200 font-medium mb-1">
              Indigenous Data Sovereignty
            </p>
            <p className="text-purple-100/80">
              Your Indigenous identity information is protected under Indigenous data 
              sovereignty principles. You retain control over your data and can request 
              its return or deletion at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}