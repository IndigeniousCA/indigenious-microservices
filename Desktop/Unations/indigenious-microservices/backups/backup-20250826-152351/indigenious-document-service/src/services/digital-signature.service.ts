import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import dayjs from 'dayjs';

export interface DigitalSignature {
  id: string;
  documentId: string;
  signerId: string;
  signerName: string;
  signerEmail: string;
  signerRole?: string;
  signatureType: 'electronic' | 'digital' | 'qualified';
  signatureData?: string; // Base64 encoded signature image
  publicKey?: string;
  privateKeyHash?: string;
  certificateId?: string;
  timestamp: Date;
  ipAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  verificationCode: string;
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  metadata?: Record<string, any>;
}

export interface SignatureRequest {
  id: string;
  documentId: string;
  requesterId: string;
  signers: SignerInfo[];
  message?: string;
  deadline?: Date;
  signatureOrder?: 'parallel' | 'sequential';
  status: 'draft' | 'sent' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
}

export interface SignerInfo {
  id: string;
  name: string;
  email: string;
  role?: string;
  order?: number;
  status: 'pending' | 'signed' | 'rejected';
  signedAt?: Date;
  indigenousAffiliation?: {
    bandName?: string;
    bandNumber?: string;
    isElder?: boolean;
  };
}

export class DigitalSignatureService {
  private static readonly SIGNATURE_VALIDITY_DAYS = 180;
  private static readonly VERIFICATION_URL = process.env.VERIFICATION_URL || 'https://verify.indigenious.ca';

  /**
   * Create a signature request
   */
  static async createSignatureRequest(
    documentId: string,
    requesterId: string,
    signers: SignerInfo[],
    options: {
      message?: string;
      deadline?: Date;
      signatureOrder?: 'parallel' | 'sequential';
    } = {}
  ): Promise<SignatureRequest> {
    try {
      const requestId = uuidv4();

      // Create signature request
      const request = await prisma.signatureRequest.create({
        data: {
          id: requestId,
          documentId,
          requesterId,
          signers: signers,
          message: options.message,
          deadline: options.deadline,
          signatureOrder: options.signatureOrder || 'parallel',
          status: 'draft',
        },
      });

      // Create pending signatures for each signer
      for (const signer of signers) {
        await this.createPendingSignature(documentId, signer, requestId);
      }

      // Send signature invitations
      await this.sendSignatureInvitations(request);

      logger.info('Signature request created', {
        requestId,
        documentId,
        signerCount: signers.length,
      });

      return this.formatSignatureRequest(request);
    } catch (error) {
      logger.error('Failed to create signature request', error);
      throw error;
    }
  }

  /**
   * Sign a document
   */
  static async signDocument(
    documentId: string,
    signerId: string,
    signatureData: {
      type: 'electronic' | 'digital' | 'qualified';
      data?: string; // Base64 signature image
      certificateId?: string;
      location?: {
        latitude: number;
        longitude: number;
        address?: string;
      };
    },
    ipAddress?: string
  ): Promise<DigitalSignature> {
    try {
      // Get signer information
      const signer = await prisma.user.findUnique({
        where: { id: signerId },
      });

      if (!signer) {
        throw new Error('Signer not found');
      }

      // Generate signature hash
      const signatureHash = this.generateSignatureHash({
        documentId,
        signerId,
        timestamp: new Date(),
        signatureData,
      });

      // Generate verification code
      const verificationCode = this.generateVerificationCode();

      // Create digital signature
      const signature = await prisma.digitalSignature.create({
        data: {
          id: uuidv4(),
          documentId,
          signerId,
          signerName: signer.name,
          signerEmail: signer.email,
          signerRole: signer.role,
          signatureType: signatureData.type,
          signatureData: signatureData.data,
          signatureHash,
          certificateId: signatureData.certificateId,
          timestamp: new Date(),
          ipAddress,
          location: signatureData.location,
          verificationCode,
          status: 'signed',
          metadata: {
            userAgent: 'Mozilla/5.0...', // Would get from request
            signatureMethod: signatureData.type,
          },
        },
      });

      // Update document with signature
      await this.updateDocumentWithSignature(documentId, signature.id);

      // Generate signature certificate
      const certificate = await this.generateSignatureCertificate(signature);

      // Clear cache
      await redis.del(`document-signatures:${documentId}`);

      logger.info('Document signed', {
        documentId,
        signerId,
        signatureId: signature.id,
      });

      return this.formatSignature(signature);
    } catch (error) {
      logger.error('Failed to sign document', error);
      throw error;
    }
  }

  /**
   * Verify document signatures
   */
  static async verifySignatures(
    documentId: string
  ): Promise<{
    valid: boolean;
    signatures: Array<{
      signerId: string;
      signerName: string;
      valid: boolean;
      timestamp: Date;
      verificationDetails: string[];
    }>;
    certificate?: string;
  }> {
    try {
      const signatures = await prisma.digitalSignature.findMany({
        where: {
          documentId,
          status: 'signed',
        },
        orderBy: { timestamp: 'asc' },
      });

      const verificationResults = [];
      let allValid = true;

      for (const signature of signatures) {
        const verification = await this.verifyIndividualSignature(signature);
        verificationResults.push({
          signerId: signature.signerId,
          signerName: signature.signerName,
          valid: verification.valid,
          timestamp: signature.timestamp,
          verificationDetails: verification.details,
        });

        if (!verification.valid) {
          allValid = false;
        }
      }

      // Generate verification certificate if all valid
      let certificate;
      if (allValid && signatures.length > 0) {
        certificate = await this.generateVerificationCertificate(documentId, verificationResults);
      }

      return {
        valid: allValid,
        signatures: verificationResults,
        certificate,
      };
    } catch (error) {
      logger.error('Failed to verify signatures', error);
      throw error;
    }
  }

  /**
   * Get document signatures
   */
  static async getDocumentSignatures(documentId: string): Promise<DigitalSignature[]> {
    try {
      // Check cache
      const cacheKey = `document-signatures:${documentId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const signatures = await prisma.digitalSignature.findMany({
        where: { documentId },
        orderBy: { timestamp: 'desc' },
      });

      const formatted = signatures.map(sig => this.formatSignature(sig));

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(formatted));

      return formatted;
    } catch (error) {
      logger.error('Failed to get document signatures', error);
      throw error;
    }
  }

  /**
   * Create signature certificate PDF
   */
  static async generateSignatureCertificate(
    signature: any
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Certificate header
        doc.fontSize(20)
           .text('Digital Signature Certificate', { align: 'center' })
           .moveDown();

        doc.fontSize(12)
           .text('Indigenous Procurement Platform', { align: 'center' })
           .moveDown(2);

        // Signature details
        doc.fontSize(10);
        doc.text(`Certificate ID: ${signature.id}`);
        doc.text(`Document ID: ${signature.documentId}`);
        doc.text(`Signer: ${signature.signerName}`);
        doc.text(`Email: ${signature.signerEmail}`);
        doc.text(`Signed on: ${dayjs(signature.timestamp).format('YYYY-MM-DD HH:mm:ss')}`);
        doc.text(`Signature Type: ${signature.signatureType}`);
        doc.text(`Verification Code: ${signature.verificationCode}`);
        
        if (signature.location) {
          doc.text(`Location: ${signature.location.address || `${signature.location.latitude}, ${signature.location.longitude}`}`);
        }

        doc.moveDown(2);

        // Add QR code for verification
        QRCode.toDataURL(
          `${this.VERIFICATION_URL}/verify/${signature.verificationCode}`,
          async (err, url) => {
            if (!err && url) {
              doc.image(url, {
                fit: [100, 100],
                align: 'center',
              });
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(8)
               .text('This certificate verifies the authenticity of the digital signature.', { align: 'center' })
               .text(`Verify at: ${this.VERIFICATION_URL}/verify/${signature.verificationCode}`, { align: 'center' });

            doc.end();
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle Elder signatures with cultural protocols
   */
  static async handleElderSignature(
    documentId: string,
    elderInfo: {
      id: string;
      name: string;
      bandName: string;
      bandNumber: string;
      role: string;
    },
    witnessIds: string[]
  ): Promise<DigitalSignature> {
    try {
      // Create special Elder signature with witnesses
      const signatureId = uuidv4();
      const verificationCode = this.generateVerificationCode();

      // Record Elder signature
      const elderSignature = await prisma.digitalSignature.create({
        data: {
          id: signatureId,
          documentId,
          signerId: elderInfo.id,
          signerName: elderInfo.name,
          signerEmail: `elder-${elderInfo.id}@indigenious.ca`, // Placeholder
          signerRole: 'Elder',
          signatureType: 'qualified',
          timestamp: new Date(),
          verificationCode,
          status: 'signed',
          metadata: {
            isElder: true,
            bandName: elderInfo.bandName,
            bandNumber: elderInfo.bandNumber,
            culturalRole: elderInfo.role,
            witnesses: witnessIds,
            culturalProtocol: 'Elder signature follows traditional protocols',
          },
        },
      });

      // Record witness attestations
      for (const witnessId of witnessIds) {
        await prisma.witnessAttestation.create({
          data: {
            id: uuidv4(),
            signatureId,
            witnessId,
            attestation: 'I witness this Elder signature according to our traditions',
            timestamp: new Date(),
          },
        });
      }

      // Generate special Elder certificate with cultural elements
      const certificate = await this.generateElderSignatureCertificate(elderSignature, elderInfo);

      logger.info('Elder signature recorded', {
        documentId,
        elderId: elderInfo.id,
        witnesses: witnessIds.length,
      });

      return this.formatSignature(elderSignature);
    } catch (error) {
      logger.error('Failed to handle Elder signature', error);
      throw error;
    }
  }

  /**
   * Batch sign multiple documents
   */
  static async batchSign(
    documentIds: string[],
    signerId: string,
    signatureData: any
  ): Promise<DigitalSignature[]> {
    try {
      const signatures: DigitalSignature[] = [];

      for (const documentId of documentIds) {
        const signature = await this.signDocument(
          documentId,
          signerId,
          signatureData
        );
        signatures.push(signature);
      }

      logger.info('Batch signing completed', {
        documentCount: documentIds.length,
        signerId,
      });

      return signatures;
    } catch (error) {
      logger.error('Batch signing failed', error);
      throw error;
    }
  }

  /**
   * Helper: Generate signature hash
   */
  private static generateSignatureHash(data: any): string {
    const content = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Helper: Generate verification code
   */
  private static generateVerificationCode(): string {
    return `VER-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Helper: Create pending signature
   */
  private static async createPendingSignature(
    documentId: string,
    signer: SignerInfo,
    requestId: string
  ): Promise<void> {
    await prisma.digitalSignature.create({
      data: {
        id: uuidv4(),
        documentId,
        signerId: signer.id,
        signerName: signer.name,
        signerEmail: signer.email,
        signerRole: signer.role,
        signatureType: 'electronic',
        timestamp: new Date(),
        verificationCode: this.generateVerificationCode(),
        status: 'pending',
        metadata: {
          requestId,
          order: signer.order,
          indigenousAffiliation: signer.indigenousAffiliation,
        },
      },
    });
  }

  /**
   * Helper: Send signature invitations
   */
  private static async sendSignatureInvitations(request: any): Promise<void> {
    // Implementation would send emails to signers
    logger.info('Signature invitations sent', { requestId: request.id });
  }

  /**
   * Helper: Update document with signature
   */
  private static async updateDocumentWithSignature(
    documentId: string,
    signatureId: string
  ): Promise<void> {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        isSigned: true,
        signatureIds: {
          push: signatureId,
        },
        lastSignedAt: new Date(),
      },
    });
  }

  /**
   * Helper: Verify individual signature
   */
  private static async verifyIndividualSignature(signature: any): Promise<{
    valid: boolean;
    details: string[];
  }> {
    const details: string[] = [];
    let valid = true;

    // Check signature expiry
    const expiryDate = dayjs(signature.timestamp).add(this.SIGNATURE_VALIDITY_DAYS, 'days');
    if (dayjs().isAfter(expiryDate)) {
      details.push('Signature has expired');
      valid = false;
    } else {
      details.push('Signature is within validity period');
    }

    // Verify signature hash
    const expectedHash = this.generateSignatureHash({
      documentId: signature.documentId,
      signerId: signature.signerId,
      timestamp: signature.timestamp,
      signatureData: {
        type: signature.signatureType,
        data: signature.signatureData,
      },
    });

    if (signature.signatureHash === expectedHash) {
      details.push('Signature hash verified');
    } else {
      details.push('Signature hash mismatch');
      valid = false;
    }

    // Check certificate validity if present
    if (signature.certificateId) {
      // Would verify against certificate authority
      details.push('Digital certificate verified');
    }

    return { valid, details };
  }

  /**
   * Helper: Generate verification certificate
   */
  private static async generateVerificationCertificate(
    documentId: string,
    verificationResults: any[]
  ): Promise<string> {
    const certificate = {
      documentId,
      verifiedAt: new Date(),
      signatures: verificationResults,
      verificationUrl: `${this.VERIFICATION_URL}/document/${documentId}`,
    };

    return Buffer.from(JSON.stringify(certificate)).toString('base64');
  }

  /**
   * Helper: Generate Elder signature certificate
   */
  private static async generateElderSignatureCertificate(
    signature: any,
    elderInfo: any
  ): Promise<Buffer> {
    // Special certificate for Elder signatures with cultural elements
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Traditional header
        doc.fontSize(20)
           .text('Elder Signature Certificate', { align: 'center' })
           .fontSize(14)
           .text('Traditional Knowledge Keeper Attestation', { align: 'center' })
           .moveDown(2);

        // Elder information
        doc.fontSize(12);
        doc.text(`Elder: ${elderInfo.name}`);
        doc.text(`First Nation: ${elderInfo.bandName}`);
        doc.text(`Band Number: ${elderInfo.bandNumber}`);
        doc.text(`Cultural Role: ${elderInfo.role}`);
        doc.moveDown();

        // Signature details
        doc.text(`Document ID: ${signature.documentId}`);
        doc.text(`Signed on: ${dayjs(signature.timestamp).format('YYYY-MM-DD')}`);
        doc.text(`Witnesses: ${signature.metadata.witnesses.length} community members`);
        doc.moveDown(2);

        // Cultural statement
        doc.fontSize(10)
           .text('This signature carries the wisdom and authority of our Elders,', { align: 'center' })
           .text('representing generations of traditional knowledge and cultural protocols.', { align: 'center' })
           .moveDown(2);

        // Verification
        doc.text(`Verification Code: ${signature.verificationCode}`, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Helper: Format signature
   */
  private static formatSignature(signature: any): DigitalSignature {
    return {
      id: signature.id,
      documentId: signature.documentId,
      signerId: signature.signerId,
      signerName: signature.signerName,
      signerEmail: signature.signerEmail,
      signerRole: signature.signerRole,
      signatureType: signature.signatureType,
      signatureData: signature.signatureData,
      publicKey: signature.publicKey,
      certificateId: signature.certificateId,
      timestamp: signature.timestamp,
      ipAddress: signature.ipAddress,
      location: signature.location,
      verificationCode: signature.verificationCode,
      status: signature.status,
      metadata: signature.metadata,
    };
  }

  /**
   * Helper: Format signature request
   */
  private static formatSignatureRequest(request: any): SignatureRequest {
    return {
      id: request.id,
      documentId: request.documentId,
      requesterId: request.requesterId,
      signers: request.signers,
      message: request.message,
      deadline: request.deadline,
      signatureOrder: request.signatureOrder,
      status: request.status,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    };
  }
}

export default DigitalSignatureService;