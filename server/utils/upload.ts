import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Lazy or dynamic Cloudinary Configuration
export function configureCloudinary(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return true;
  }
  return false;
}

// Initial config check
configureCloudinary();

// Multer memory storage (works reliably in memory without peer dependency conflicts)
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

// Helper to determine if Cloudinary is configured
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME) &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Upload buffer directly to Cloudinary
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder = 'jachai/questions',
  filename?: string
): Promise<string> {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    const publicId = filename || `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'auto',
      },
      (error, result?: UploadApiResponse) => {
        if (error) return reject(error);
        resolve(result?.secure_url || result?.url || '');
      }
    );
    uploadStream.end(buffer);
  });
}

// Upload base64 directly to Cloudinary
export async function uploadBase64ToCloudinary(
  base64Data: string,
  folder = 'jachai/questions'
): Promise<string> {
  configureCloudinary();
  const result = await cloudinary.uploader.upload(base64Data, {
    folder,
    resource_type: 'auto',
  });
  return result.secure_url || result.url;
}

// Middleware for question creation and updates (question_image & explanation_image)
export const uploadQuestionImages = (req: Request, res: Response, next: NextFunction) => {
  const multipartUpload = upload.fields([
    { name: 'question_image', maxCount: 1 },
    { name: 'explanation_image', maxCount: 1 },
  ]);

  multipartUpload(req, res, async (err: any) => {
    if (err) {
      console.error('[Multer Upload Error]:', err);
      return res.status(400).json({ error: 'Image upload failed', details: err.message });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      const isConfigured = isCloudinaryConfigured();

      try {
        if (files['question_image'] && files['question_image'][0]) {
          const qFile = files['question_image'][0];
          if (isConfigured) {
            const url = await uploadBufferToCloudinary(
              qFile.buffer,
              'jachai/questions',
              `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
            );
            (qFile as any).path = url;
            (qFile as any).secure_url = url;
          } else {
            (qFile as any).path = `data:${qFile.mimetype};base64,${qFile.buffer.toString('base64')}`;
          }
        }

        if (files['explanation_image'] && files['explanation_image'][0]) {
          const expFile = files['explanation_image'][0];
          if (isConfigured) {
            const url = await uploadBufferToCloudinary(
              expFile.buffer,
              'jachai/questions',
              `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
            );
            (expFile as any).path = url;
            (expFile as any).secure_url = url;
          } else {
            (expFile as any).path = `data:${expFile.mimetype};base64,${expFile.buffer.toString('base64')}`;
          }
        }
      } catch (uploadError: any) {
        console.error('[Cloudinary Upload Error]:', uploadError);
        return res.status(500).json({ error: 'Cloudinary upload failed', details: uploadError.message });
      }
    }

    next();
  });
};

// Middleware for standalone single image upload
export const uploadSingleImage = (req: Request, res: Response, next: NextFunction) => {
  const singleUpload = upload.single('image');

  singleUpload(req, res, async (err: any) => {
    if (err) {
      console.error('[Multer Single Upload Error]:', err);
      return res.status(400).json({ error: 'Image upload failed', details: err.message });
    }

    if (req.file) {
      const isConfigured = isCloudinaryConfigured();
      try {
        if (isConfigured) {
          const url = await uploadBufferToCloudinary(
            req.file.buffer,
            'jachai/questions',
            `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
          );
          (req.file as any).path = url;
          (req.file as any).secure_url = url;
        } else {
          (req.file as any).path = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
      } catch (uploadError: any) {
        console.error('[Cloudinary Single Upload Error]:', uploadError);
        return res.status(500).json({ error: 'Cloudinary upload failed', details: uploadError.message });
      }
    }

    next();
  });
};

export { cloudinary };
