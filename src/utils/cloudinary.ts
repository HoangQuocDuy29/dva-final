/**
 * Cloudinary Direct Upload Utility for DVA Volleyball Club
 * 
 * Uploads images directly from browser to Cloudinary CDN using Unsigned Presets.
 * Supports automatic multi-level folder hierarchy (dva_club/<module>/<subModule>)
 * without needing to manually create folders on Cloudinary Dashboard.
 */

export type CloudinaryModule = 'players' | 'courts' | 'news' | 'coaches' | 'training' | 'general';

export interface UploadResult {
  url: string;
  secure_url: string;
  publicId?: string;
  folder: string;
  source: 'cloudinary' | 'local_fallback';
}

/**
 * Slugify & sanitize a single folder segment (e.g. "TOURNAMENT" -> "tournament", "Giải Đấu" -> "giai-dau")
 */
export function sanitizeFolderSegment(segment: string): string {
  return segment
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a hierarchical Cloudinary folder path by module and optional sub-module.
 * Examples:
 * - buildCloudinaryFolder('players', 'SENIOR') -> 'dva_club/players/senior'
 * - buildCloudinaryFolder('news', 'TOURNAMENT') -> 'dva_club/news/tournament'
 * - buildCloudinaryFolder('courts', 'court-btl') -> 'dva_club/courts/court-btl'
 * - buildCloudinaryFolder('coaches') -> 'dva_club/coaches'
 */
export function buildCloudinaryFolder(
  moduleName: CloudinaryModule | string,
  subModule?: string
): string {
  const root = 'dva_club';
  const cleanModule = moduleName
    .split('/')
    .map(sanitizeFolderSegment)
    .filter(Boolean)
    .join('/') || 'general';
  const cleanSub = subModule
    ? subModule
        .split('/')
        .map(sanitizeFolderSegment)
        .filter(Boolean)
        .join('/')
    : '';
  return cleanSub ? `${root}/${cleanModule}/${cleanSub}` : `${root}/${cleanModule}`;
}

/**
 * Upload an image file to Cloudinary with automatic nested folder creation & fallback
 * @param file File object from <input type="file">
 * @param folderOrModule Full folder path (e.g. 'dva_club/news/tournament') or module name ('news')
 * @param subModule Optional sub-module / category name (e.g. 'TOURNAMENT', 'senior', 'court-btl')
 */
export async function uploadToCloudinary(
  file: File,
  folderOrModule: CloudinaryModule | string = 'general',
  subModule?: string
): Promise<UploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dsezvx7xf';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'dva_sports';

  // Normalize target folder path: if caller already passed 'a/b', keep nested segments; otherwise build from module + subModule
  const targetFolder = folderOrModule.includes('/')
    ? folderOrModule
        .split('/')
        .map((seg, idx) => (idx === 0 && seg.trim().toLowerCase() === 'dva_club' ? 'dva_club' : sanitizeFolderSegment(seg)))
        .filter(Boolean)
        .join('/')
    : buildCloudinaryFolder(folderOrModule, subModule);

  // 1. Direct upload to Cloudinary using unsigned upload preset `dva_sports`
  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      // Pass both `folder` (Fixed Folder mode / public_id prefix) and `asset_folder` (Dynamic Folder mode)
      // Cloudinary automatically creates all parent & child folders if they do not exist yet.
      formData.append('folder', targetFolder);
      formData.append('asset_folder', targetFolder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const secureUrl = data.secure_url || data.url;
        return {
          url: secureUrl,
          secure_url: secureUrl,
          publicId: data.public_id,
          folder: data.asset_folder || data.folder || targetFolder,
          source: 'cloudinary',
        };
      } else {
        const errText = await response.text().catch(() => '');
        console.warn(`Cloudinary upload returned HTTP ${response.status}:`, errText);
      }
    } catch (err) {
      console.warn('Cloudinary direct upload failed, falling back to local compressed image:', err);
    }
  }

  // 2. Fallback: Compress image in canvas to optimized WebP/JPEG data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800; // max width/height
        let w = img.width;
        let h = img.height;

        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          url: compressedDataUrl,
          secure_url: compressedDataUrl,
          folder: targetFolder,
          source: 'local_fallback',
        });
      };
      img.src = loadEvt.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
