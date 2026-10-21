import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dva-volleyball',
      api_key: process.env.CLOUDINARY_API_KEY || '671521948123456',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'mock_secret',
    });
  }

  /**
   * Generates a signed upload URL and signature for client direct upload to Cloudinary.
   * This offloads file bandwidth from the backend server directly to Cloudinary CDN.
   */
  getSignedUploadParams(folder: string = 'dva_assets') {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        folder,
        timestamp,
      },
      process.env.CLOUDINARY_API_SECRET || 'mock_secret'
    );

    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      timestamp,
      signature,
      folder,
    };
  }
}
