/**
 * Cloudinary Direct Upload Utility for DVA Volleyball Club
 * 
 * Uploads images directly from browser to Cloudinary CDN using Unsigned Presets.
 * Offloads server bandwidth and storage to high-speed global CDN.
 */

export interface UploadResult {
  url: string;
  publicId?: string;
  source: 'cloudinary' | 'local_fallback';
}

/**
 * Upload an image file to Cloudinary with automatic fallback
 * @param file File object from <input type="file">
 * @param folder Cloudinary folder name (e.g. 'dva_players', 'dva_news')
 */
export async function uploadToCloudinary(
  file: File,
  folder: string = 'dva_uploads'
): Promise<UploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dva-volleyball';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'dva_unsigned_sports';

  // 1. Check if Cloudinary is configured with custom keys
  if (cloudName && uploadPreset && uploadPreset !== 'dva_unsigned_sports') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          url: data.secure_url || data.url,
          publicId: data.public_id,
          source: 'cloudinary',
        };
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
          source: 'local_fallback',
        });
      };
      img.src = loadEvt.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
