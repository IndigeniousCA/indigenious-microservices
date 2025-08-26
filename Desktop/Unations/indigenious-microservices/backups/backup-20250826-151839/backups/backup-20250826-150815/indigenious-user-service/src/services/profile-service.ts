import { query, transaction } from '../utils/database';
import { invalidateCache } from '../utils/redis';
import { S3Service } from './s3-service';
import { logger } from '../utils/logger';
import sharp from 'sharp';

export class ProfileService {
  private s3Service: S3Service;

  constructor() {
    this.s3Service = new S3Service();
  }

  async updateProfile(userId: string, profileData: any): Promise<any> {
    const allowedFields = [
      'first_name', 'last_name', 'display_name', 'traditional_name',
      'preferred_name', 'phone', 'website', 'title', 'organization',
      'bio', 'languages', 'primary_language', 'accessibility_needs'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(profileData)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(userId);

    const result = await query(
      `UPDATE user_profiles SET ${updateFields.join(', ')} 
       WHERE user_id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      // Create profile if it doesn't exist
      const insertResult = await this.createProfile(userId, profileData);
      return insertResult;
    }

    // Invalidate cache
    await invalidateCache(`user:${userId}`);

    return result.rows[0];
  }

  async createProfile(userId: string, profileData: any): Promise<any> {
    const result = await query(
      `INSERT INTO user_profiles (
        user_id, first_name, last_name, display_name,
        traditional_name, preferred_name, phone, website,
        title, organization, bio, languages, primary_language,
        accessibility_needs, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        userId,
        profileData.firstName,
        profileData.lastName,
        profileData.displayName || `${profileData.firstName} ${profileData.lastName}`,
        profileData.traditionalName,
        profileData.preferredName,
        profileData.phone,
        profileData.website,
        profileData.title,
        profileData.organization,
        profileData.bio,
        profileData.languages || ['en'],
        profileData.primaryLanguage || 'en',
        profileData.accessibilityNeeds
      ]
    );

    return result.rows[0];
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    try {
      // Process image - resize and optimize
      const processedImage = await sharp(file.buffer)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Generate thumbnail
      const thumbnail = await sharp(file.buffer)
        .resize(100, 100, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Upload to S3
      const avatarKey = `avatars/${userId}/avatar.jpg`;
      const thumbnailKey = `avatars/${userId}/thumbnail.jpg`;

      await this.s3Service.uploadFile(avatarKey, processedImage, 'image/jpeg');
      await this.s3Service.uploadFile(thumbnailKey, thumbnail, 'image/jpeg');

      const avatarUrl = await this.s3Service.getFileUrl(avatarKey);

      // Update profile with avatar URL
      await query(
        `UPDATE user_profiles SET 
         avatar = $1,
         avatar_thumbnail = $2,
         updated_at = NOW()
         WHERE user_id = $3`,
        [avatarUrl, await this.s3Service.getFileUrl(thumbnailKey), userId]
      );

      // Invalidate cache
      await invalidateCache(`user:${userId}`);

      return avatarUrl;
    } catch (error) {
      logger.error('Avatar upload error:', error);
      throw new Error('Failed to upload avatar');
    }
  }

  async updateBusinessProfile(userId: string, businessData: any): Promise<any> {
    return transaction(async (client) => {
      // Check if business profile exists
      const existing = await client.query(
        `SELECT * FROM business_profiles WHERE user_id = $1`,
        [userId]
      );

      if (existing.rows.length > 0) {
        // Update existing profile
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        const allowedFields = [
          'legal_name', 'business_name', 'business_number', 'tax_number',
          'website', 'description', 'year_established', 'employee_count',
          'indigenous_employee_count', 'industries', 'certifications',
          'services_offered', 'geographic_coverage', 'social_media'
        ];

        for (const [key, value] of Object.entries(businessData)) {
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          if (allowedFields.includes(dbField)) {
            updateFields.push(`${dbField} = $${paramCount}`);
            updateValues.push(value);
            paramCount++;
          }
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(userId);

        const result = await client.query(
          `UPDATE business_profiles SET ${updateFields.join(', ')} 
           WHERE user_id = $${paramCount}
           RETURNING *`,
          updateValues
        );

        return result.rows[0];
      } else {
        // Create new business profile
        const result = await client.query(
          `INSERT INTO business_profiles (
            user_id, legal_name, business_name, business_number,
            tax_number, website, description, year_established,
            employee_count, indigenous_employee_count, industries,
            certifications, services_offered, geographic_coverage,
            social_media, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
          RETURNING *`,
          [
            userId,
            businessData.legalName,
            businessData.businessName,
            businessData.businessNumber,
            businessData.taxNumber,
            businessData.website,
            businessData.description,
            businessData.yearEstablished,
            businessData.employeeCount,
            businessData.indigenousEmployeeCount,
            businessData.industries,
            businessData.certifications,
            businessData.servicesOffered,
            businessData.geographicCoverage,
            businessData.socialMedia
          ]
        );

        // Update user type to business
        await client.query(
          `UPDATE users SET type = 'indigenous_business' WHERE id = $1`,
          [userId]
        );

        return result.rows[0];
      }
    });
  }

  async getBusinessProfile(userId: string): Promise<any> {
    const result = await query(
      `SELECT * FROM business_profiles WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  async updateIndigenousIdentity(userId: string, identityData: any): Promise<any> {
    const result = await query(
      `INSERT INTO indigenous_identities (
        user_id, nation, community, band_number, treaty_number,
        status_card_number, verified, verified_at, verification_method,
        cultural_information, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        nation = EXCLUDED.nation,
        community = EXCLUDED.community,
        band_number = EXCLUDED.band_number,
        treaty_number = EXCLUDED.treaty_number,
        status_card_number = EXCLUDED.status_card_number,
        cultural_information = EXCLUDED.cultural_information,
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        identityData.nation,
        identityData.community,
        identityData.bandNumber,
        identityData.treatyNumber,
        identityData.statusCardNumber,
        identityData.verified || false,
        identityData.verifiedAt,
        identityData.verificationMethod,
        identityData.culturalInformation
      ]
    );

    // Invalidate cache
    await invalidateCache(`user:${userId}`);

    return result.rows[0];
  }
}