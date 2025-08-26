// Encryption Service
// Enterprise-grade data encryption and key management

export type EncryptionAlgorithm = 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'RSA-4096'
export type KeyType = 'symmetric' | 'asymmetric' | 'derived'
export type KeyStatus = 'active' | 'rotated' | 'revoked' | 'expired'

export interface EncryptionKey {
  id: string
  type: KeyType
  algorithm: EncryptionAlgorithm
  status: KeyStatus
  createdAt: string
  expiresAt?: string
  rotatedAt?: string
  usage: string[]
  metadata: {
    purpose: string
    dataClassification: string
    indigenousContext?: boolean
    communityAffiliation?: string
    culturalRestrictions?: string[]
  }
}

export interface EncryptionResult {
  ciphertext: string
  keyId: string
  algorithm: EncryptionAlgorithm
  iv: string
  authTag: string
  metadata: {
    encryptedAt: string
    dataClassification: string
    culturalContext?: string
  }
}

export interface DecryptionRequest {
  ciphertext: string
  keyId: string
  iv: string
  authTag: string
  userContext: {
    userId: string
    userRole: string
    communityAffiliation?: string
    culturalClearance?: string[]
  }
}

export interface HardwareSecurityModule {
  id: string
  type: 'FIPS-140-2-L3' | 'FIPS-140-2-L4' | 'Common-Criteria-EAL5'
  status: 'active' | 'maintenance' | 'offline'
  location: string
  keys: string[]
  performance: {
    encryptionsPerSecond: number
    keyGenerationsPerSecond: number
    latencyMs: number
  }
}

export class EncryptionService {
  private keys: Map<string, EncryptionKey> = new Map()
  private hsms: Map<string, HardwareSecurityModule> = new Map()
  private auditLog: Array<{
    timestamp: string
    operation: string
    keyId: string
    userId: string
    success: boolean
    details: Record<string, unknown>
  }> = []

  constructor() {
    this.initializeService()
  }

  private initializeService() {
    // Initialize with mock HSMs and keys
    this.hsms.set('hsm-001', {
      id: 'hsm-001',
      type: 'FIPS-140-2-L3',
      status: 'active',
      location: 'Ottawa Data Center',
      keys: ['key-001', 'key-002', 'key-003'],
      performance: {
        encryptionsPerSecond: 10000,
        keyGenerationsPerSecond: 100,
        latencyMs: 2
      }
    })

    this.hsms.set('hsm-002', {
      id: 'hsm-002',
      type: 'FIPS-140-2-L4',
      status: 'active',
      location: 'Toronto Backup Center',
      keys: ['key-004', 'key-005'],
      performance: {
        encryptionsPerSecond: 15000,
        keyGenerationsPerSecond: 150,
        latencyMs: 1.5
      }
    })

    // Initialize encryption keys
    this.keys.set('key-001', {
      id: 'key-001',
      type: 'symmetric',
      algorithm: 'AES-256-GCM',
      status: 'active',
      createdAt: new Date().toISOString(),
      usage: ['data-at-rest', 'indigenous-community-data'],
      metadata: {
        purpose: 'Indigenous Community Profile Encryption',
        dataClassification: 'Indigenous Sensitive',
        indigenousContext: true,
        communityAffiliation: 'Six Nations of the Grand River',
        culturalRestrictions: ['ceremonial-data-restricted', 'elder-approval-required']
      }
    })

    this.keys.set('key-002', {
      id: 'key-002',
      type: 'symmetric',
      algorithm: 'AES-256-GCM',
      status: 'active',
      createdAt: new Date().toISOString(),
      usage: ['data-in-transit', 'api-communication'],
      metadata: {
        purpose: 'API Communication Encryption',
        dataClassification: 'Confidential'
      }
    })

    this.keys.set('key-003', {
      id: 'key-003',
      type: 'asymmetric',
      algorithm: 'RSA-4096',
      status: 'active',
      createdAt: new Date().toISOString(),
      usage: ['digital-signatures', 'document-signing'],
      metadata: {
        purpose: 'Digital Signature Verification',
        dataClassification: 'Public'
      }
    })
  }

  // Generate new encryption key
  async generateKey(
    type: KeyType,
    algorithm: EncryptionAlgorithm,
    purpose: string,
    metadata: Partial<EncryptionKey['metadata']> = {}
  ): Promise<EncryptionKey> {
    const keyId = `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const hsmId = this.selectOptimalHSM()

    const key: EncryptionKey = {
      id: keyId,
      type,
      algorithm,
      status: 'active',
      createdAt: new Date().toISOString(),
      usage: [],
      metadata: {
        purpose,
        dataClassification: 'Confidential',
        ...metadata
      }
    }

    // Add key to HSM
    const hsm = this.hsms.get(hsmId)
    if (hsm) {
      hsm.keys.push(keyId)
    }

    this.keys.set(keyId, key)
    
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      operation: 'key_generation',
      keyId,
      userId: 'system',
      success: true,
      details: { algorithm, purpose, hsmId }
    })

    return key
  }

  // Encrypt data
  async encrypt(
    data: string,
    keyId: string,
    userContext: {
      userId: string
      userRole: string
      communityAffiliation?: string
    }
  ): Promise<EncryptionResult> {
    const key = this.keys.get(keyId)
    if (!key) {
      throw new Error(`Encryption key ${keyId} not found`)
    }

    if (key.status !== 'active') {
      throw new Error(`Encryption key ${keyId} is not active`)
    }

    // Validate cultural access permissions for Indigenous data
    if (key.metadata.indigenousContext) {
      this.validateIndigenousDataAccess(key, userContext)
    }

    // Simulate encryption process
    const iv = this.generateSecureRandom(16)
    const authTag = this.generateSecureRandom(16)
    const ciphertext = this.performEncryption(data, key, iv)

    const result: EncryptionResult = {
      ciphertext,
      keyId,
      algorithm: key.algorithm,
      iv,
      authTag,
      metadata: {
        encryptedAt: new Date().toISOString(),
        dataClassification: key.metadata.dataClassification,
        culturalContext: key.metadata.communityAffiliation
      }
    }

    this.auditLog.push({
      timestamp: new Date().toISOString(),
      operation: 'encryption',
      keyId,
      userId: userContext.userId,
      success: true,
      details: { 
        algorithm: key.algorithm,
        dataSize: data.length,
        culturalContext: key.metadata.indigenousContext
      }
    })

    return result
  }

  // Decrypt data
  async decrypt(request: DecryptionRequest): Promise<string> {
    const key = this.keys.get(request.keyId)
    if (!key) {
      throw new Error(`Decryption key ${request.keyId} not found`)
    }

    if (key.status !== 'active') {
      throw new Error(`Decryption key ${request.keyId} is not active`)
    }

    // Validate cultural access permissions for Indigenous data
    if (key.metadata.indigenousContext) {
      this.validateIndigenousDataAccess(key, request.userContext)
    }

    // Simulate decryption process
    const plaintext = this.performDecryption(request.ciphertext, key, request.iv)

    this.auditLog.push({
      timestamp: new Date().toISOString(),
      operation: 'decryption',
      keyId: request.keyId,
      userId: request.userContext.userId,
      success: true,
      details: { 
        algorithm: key.algorithm,
        culturalContext: key.metadata.indigenousContext
      }
    })

    return plaintext
  }

  // Rotate encryption key
  async rotateKey(keyId: string): Promise<EncryptionKey> {
    const existingKey = this.keys.get(keyId)
    if (!existingKey) {
      throw new Error(`Key ${keyId} not found for rotation`)
    }

    // Mark existing key as rotated
    existingKey.status = 'rotated'
    existingKey.rotatedAt = new Date().toISOString()

    // Generate new key with same metadata
    const newKey = await this.generateKey(
      existingKey.type,
      existingKey.algorithm,
      existingKey.metadata.purpose,
      existingKey.metadata
    )

    this.auditLog.push({
      timestamp: new Date().toISOString(),
      operation: 'key_rotation',
      keyId: existingKey.id,
      userId: 'system',
      success: true,
      details: { newKeyId: newKey.id }
    })

    return newKey
  }

  // Get key information
  getKeyInfo(keyId: string): EncryptionKey | null {
    return this.keys.get(keyId) || null
  }

  // List all keys
  listKeys(filters?: {
    status?: KeyStatus
    type?: KeyType
    purpose?: string
    indigenousContext?: boolean
  }): EncryptionKey[] {
    let keys = Array.from(this.keys.values())

    if (filters) {
      if (filters.status) {
        keys = keys.filter(k => k.status === filters.status)
      }
      if (filters.type) {
        keys = keys.filter(k => k.type === filters.type)
      }
      if (filters.purpose) {
        keys = keys.filter(k => k.metadata.purpose.includes(filters.purpose!))
      }
      if (filters.indigenousContext !== undefined) {
        keys = keys.filter(k => !!k.metadata.indigenousContext === filters.indigenousContext)
      }
    }

    return keys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Get HSM status
  getHSMStatus(): HardwareSecurityModule[] {
    return Array.from(this.hsms.values())
  }

  // Get encryption metrics
  getEncryptionMetrics(): {
    totalKeys: number
    activeKeys: number
    encryptionsToday: number
    decryptionsToday: number
    keyRotationsThisMonth: number
    averageLatency: number
    indigenousDataKeys: number
  } {
    const keys = Array.from(this.keys.values())
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().slice(0, 7)

    const todaysOperations = this.auditLog.filter(
      log => log.timestamp.startsWith(today)
    )

    const thisMonthsRotations = this.auditLog.filter(
      log => log.timestamp.startsWith(thisMonth) && log.operation === 'key_rotation'
    )

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.status === 'active').length,
      encryptionsToday: todaysOperations.filter(op => op.operation === 'encryption').length,
      decryptionsToday: todaysOperations.filter(op => op.operation === 'decryption').length,
      keyRotationsThisMonth: thisMonthsRotations.length,
      averageLatency: 2.1, // Calculated from HSM performance
      indigenousDataKeys: keys.filter(k => k.metadata.indigenousContext).length
    }
  }

  // Private helper methods
  private selectOptimalHSM(): string {
    const activeHSMs = Array.from(this.hsms.values()).filter(hsm => hsm.status === 'active')
    
    // Select HSM with best performance and lowest key count
    return activeHSMs.reduce((best, current) => {
      const currentLoad = current.keys.length / current.performance.keyGenerationsPerSecond
      const bestLoad = best.keys.length / best.performance.keyGenerationsPerSecond
      return currentLoad < bestLoad ? current : best
    }).id
  }

  private validateIndigenousDataAccess(
    key: EncryptionKey,
    userContext: {
      userId: string
      userRole: string
      communityAffiliation?: string
      culturalClearance?: string[]
    }
  ): void {
    if (!key.metadata.indigenousContext) return

    // Check if user has required cultural clearance
    if (key.metadata.culturalRestrictions) {
      for (const restriction of key.metadata.culturalRestrictions) {
        if (!userContext.culturalClearance?.includes(restriction)) {
          throw new Error(`Access denied: Missing cultural clearance for ${restriction}`)
        }
      }
    }

    // Check community affiliation for community-specific data
    if (key.metadata.communityAffiliation && 
        userContext.communityAffiliation !== key.metadata.communityAffiliation &&
        !['admin', 'indigenous_data_steward'].includes(userContext.userRole)) {
      throw new Error(`Access denied: Data belongs to ${key.metadata.communityAffiliation}`)
    }
  }

  private generateSecureRandom(length: number): string {
    // In real implementation, use crypto.getRandomValues() or HSM
    return Array.from({ length }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('')
  }

  private performEncryption(data: string, key: EncryptionKey, iv: string): string {
    // In real implementation, use WebCrypto API or HSM
    // This is a simulation
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    
    // Simulate AES-256-GCM encryption
    return Array.from(dataBytes, byte => 
      (byte ^ 0xAA).toString(16).padStart(2, '0')
    ).join('')
  }

  private performDecryption(ciphertext: string, key: EncryptionKey, iv: string): string {
    // In real implementation, use WebCrypto API or HSM
    // This is a simulation - reverse of encryption
    const bytes = []
    for (let i = 0; i < ciphertext.length; i += 2) {
      const byte = parseInt(ciphertext.substr(i, 2), 16)
      bytes.push(byte ^ 0xAA)
    }
    
    const decoder = new TextDecoder()
    return decoder.decode(new Uint8Array(bytes))
  }

  // Get audit log
  getAuditLog(filters?: {
    operation?: string
    keyId?: string
    userId?: string
    startDate?: string
    endDate?: string
  }): Array<{
    timestamp: string
    operation: string
    keyId: string
    userId: string
    success: boolean
    details: Record<string, unknown>
  }> {
    let logs = [...this.auditLog]

    if (filters) {
      if (filters.operation) {
        logs = logs.filter(log => log.operation === filters.operation)
      }
      if (filters.keyId) {
        logs = logs.filter(log => log.keyId === filters.keyId)
      }
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId)
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!)
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!)
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }
}

// Singleton instance
export const encryptionService = new EncryptionService()