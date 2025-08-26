import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { redis } from '../config/redis';

const execAsync = promisify(exec);

export interface ScanResult {
  clean: boolean;
  infected: boolean;
  viruses: string[];
  scanTime: number;
  fileHash: string;
}

export class VirusScanService {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly SCAN_TIMEOUT = 60000; // 60 seconds

  /**
   * Scan file for viruses using ClamAV
   */
  static async scanFile(buffer: Buffer, fileName: string): Promise<ScanResult> {
    const startTime = Date.now();
    const fileHash = this.calculateHash(buffer);

    try {
      // Check if file was recently scanned
      const cachedResult = await this.getCachedScanResult(fileHash);
      if (cachedResult) {
        logger.info('Using cached scan result', { fileName, fileHash });
        return cachedResult;
      }

      // Check file size
      if (buffer.length > this.MAX_FILE_SIZE) {
        throw new Error(`File too large for scanning: ${buffer.length} bytes`);
      }

      // In production, would use ClamAV daemon (clamd) for better performance
      // For now, simulate scan
      const scanResult = await this.performScan(buffer, fileName);

      // Cache result
      await this.cacheScanResult(fileHash, scanResult);

      // Log scan
      await this.logScan(fileName, fileHash, scanResult);

      return {
        ...scanResult,
        scanTime: Date.now() - startTime,
        fileHash,
      };
    } catch (error) {
      logger.error('Virus scan failed', { fileName, error });
      
      // On scan failure, quarantine file for manual review
      return {
        clean: false,
        infected: false, // Unknown status
        viruses: [],
        scanTime: Date.now() - startTime,
        fileHash,
      };
    }
  }

  /**
   * Perform actual virus scan
   */
  private static async performScan(buffer: Buffer, fileName: string): Promise<ScanResult> {
    // In production, would save to temp file and scan with ClamAV
    // For now, check against known malicious patterns
    
    const maliciousPatterns = [
      /eval\s*\(/gi,
      /<script[^>]*>.*?<\/script>/gi,
      /document\.write/gi,
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.vbs$/i,
      /\.js$/i, // JavaScript files need extra validation
    ];

    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
    const detected: string[] = [];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(fileName) || pattern.test(content)) {
        detected.push(`Suspicious pattern: ${pattern.source}`);
      }
    }

    // Check for EICAR test signature
    const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    if (content.includes(eicarSignature)) {
      detected.push('EICAR-Test-File');
    }

    return {
      clean: detected.length === 0,
      infected: detected.length > 0,
      viruses: detected,
      scanTime: 0,
      fileHash: '',
    };
  }

  /**
   * Scan with real ClamAV (requires ClamAV installed)
   */
  static async scanWithClamAV(filePath: string): Promise<ScanResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `clamscan --no-summary "${filePath}"`,
        { timeout: this.SCAN_TIMEOUT }
      );

      const infected = stdout.includes('FOUND');
      const viruses: string[] = [];

      if (infected) {
        // Parse virus names from output
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('FOUND')) {
            const match = line.match(/: (.+) FOUND/);
            if (match) {
              viruses.push(match[1]);
            }
          }
        }
      }

      return {
        clean: !infected,
        infected,
        viruses,
        scanTime: 0,
        fileHash: '',
      };
    } catch (error) {
      if (error.code === 1) {
        // Exit code 1 means virus found
        return {
          clean: false,
          infected: true,
          viruses: ['Unknown virus detected'],
          scanTime: 0,
          fileHash: '',
        };
      }
      throw error;
    }
  }

  /**
   * Quarantine infected file
   */
  static async quarantineFile(
    documentId: string,
    s3Key: string,
    viruses: string[]
  ): Promise<void> {
    try {
      // Move file to quarantine bucket/folder
      const quarantineKey = `quarantine/${new Date().toISOString()}/${documentId}`;
      
      // In production, would move to separate quarantine bucket
      const { S3Service } = await import('./s3.service');
      await S3Service.copyFile(s3Key, quarantineKey);
      await S3Service.deleteFile(s3Key);

      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'QUARANTINED',
          metadata: {
            quarantined: true,
            quarantineDate: new Date().toISOString(),
            detectedViruses: viruses,
            originalS3Key: s3Key,
            quarantineS3Key: quarantineKey,
          },
        },
      });

      // Alert administrators
      logger.error('File quarantined due to virus detection', {
        documentId,
        viruses,
        quarantineKey,
      });
    } catch (error) {
      logger.error('Failed to quarantine file', error);
      throw error;
    }
  }

  /**
   * Calculate file hash for caching
   */
  private static calculateHash(buffer: Buffer): string {
    return crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex');
  }

  /**
   * Get cached scan result
   */
  private static async getCachedScanResult(fileHash: string): Promise<ScanResult | null> {
    try {
      const cached = await redis.get(`scan:${fileHash}`);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.warn('Failed to get cached scan result', error);
      return null;
    }
  }

  /**
   * Cache scan result
   */
  private static async cacheScanResult(fileHash: string, result: ScanResult): Promise<void> {
    try {
      await redis.setex(
        `scan:${fileHash}`,
        86400, // 24 hours
        JSON.stringify(result)
      );
    } catch (error) {
      logger.warn('Failed to cache scan result', error);
    }
  }

  /**
   * Log scan to database
   */
  private static async logScan(
    fileName: string,
    fileHash: string,
    result: ScanResult
  ): Promise<void> {
    try {
      await prisma.virusScanLog.create({
        data: {
          fileName,
          fileHash,
          clean: result.clean,
          infected: result.infected,
          viruses: result.viruses,
          scanTime: result.scanTime,
          scannedAt: new Date(),
        },
      });
    } catch (error) {
      logger.warn('Failed to log scan', error);
    }
  }

  /**
   * Check file type safety
   */
  static isFileTypeSafe(mimeType: string, fileName: string): boolean {
    // Blocked executable types
    const dangerousTypes = [
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-executable',
      'application/x-sharedlib',
      'application/x-sh',
      'application/x-csh',
      'text/x-script',
    ];

    // Blocked extensions
    const dangerousExtensions = [
      '.exe', '.dll', '.com', '.bat', '.cmd', '.scr',
      '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf',
      '.wsc', '.wsh', '.ps1', '.ps1xml', '.ps2',
      '.ps2xml', '.psc1', '.psc2', '.msh', '.msh1',
      '.msh2', '.mshxml', '.msh1xml', '.msh2xml',
    ];

    if (dangerousTypes.includes(mimeType)) {
      return false;
    }

    const lowerFileName = fileName.toLowerCase();
    for (const ext of dangerousExtensions) {
      if (lowerFileName.endsWith(ext)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate file content
   */
  static async validateFileContent(
    buffer: Buffer,
    mimeType: string
  ): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Check file signatures (magic numbers)
    const signatures: Record<string, string[]> = {
      'application/pdf': ['25504446'], // %PDF
      'image/jpeg': ['FFD8FF'],
      'image/png': ['89504E47'],
      'image/gif': ['47494638'],
      'application/zip': ['504B0304', '504B0506', '504B0708'],
    };

    const fileSignature = buffer.toString('hex', 0, 4).toUpperCase();
    
    if (signatures[mimeType]) {
      const validSignatures = signatures[mimeType];
      const isValid = validSignatures.some(sig => fileSignature.startsWith(sig));
      
      if (!isValid) {
        return {
          valid: false,
          reason: `Invalid file signature for ${mimeType}`,
        };
      }
    }

    return { valid: true };
  }
}

export default VirusScanService;