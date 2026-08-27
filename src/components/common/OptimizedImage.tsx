import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  aspectRatio?: string; // e.g. '16/9', '4/3', '1/1', 'auto'
  className?: string;
  containerClassName?: string;
  maxWidth?: number; // target max width transformation e.g. 800, 1200
  quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:best' | number;
  format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg';
  fit?: 'scale' | 'fit' | 'limit' | 'fill' | 'pad' | 'crop';
  fallbackSrc?: string;
  onImageClick?: () => void;
  showPreviewOnClick?: boolean;
}

/**
 * Optimizes a Cloudinary image URL by injecting transformation parameters (q_auto, f_auto, w_800, etc.)
 * Safely preserves existing transformations or non-Cloudinary images.
 */
export function getOptimizedCloudinaryUrl(
  url?: string,
  options?: {
    width?: number;
    quality?: string | number;
    format?: string;
    fit?: string;
  }
): string {
  if (!url || typeof url !== 'string') return '';

  // Return original if it's a data URL, blob, SVG, or empty
  if (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.endsWith('.svg') ||
    url.includes('.svg?')
  ) {
    return url;
  }

  const targetWidth = options?.width || 800;
  const targetQuality = options?.quality || 'auto';
  const targetFormat = options?.format || 'auto';
  const targetFit = options?.fit || 'limit';

  // Construct Cloudinary transformation string
  const transformParams = `f_${targetFormat},q_${targetQuality},w_${targetWidth},c_${targetFit}`;

  // Check if it's a Cloudinary URL
  if (url.includes('res.cloudinary.com')) {
    // Standard Cloudinary URL structure: .../upload/[optional existing transformations]/v12345/public_id
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const prefix = url.substring(0, uploadIndex + 8); // includes '/upload/'
      const rest = url.substring(uploadIndex + 8);

      // Avoid duplicate transformations if already injected
      if (rest.startsWith(`f_${targetFormat}`) || rest.includes('q_auto')) {
        return url;
      }

      return `${prefix}${transformParams}/${rest}`;
    }
  }

  return url;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt = 'Question illustration',
  width,
  height,
  aspectRatio,
  className = '',
  containerClassName = '',
  maxWidth = 800,
  quality = 'auto',
  format = 'auto',
  fit = 'limit',
  fallbackSrc,
  loading = 'lazy',
  onImageClick,
  showPreviewOnClick = false,
  ...restProps
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  if (!src) return null;

  const optimizedSrc = getOptimizedCloudinaryUrl(src, {
    width: maxWidth,
    quality,
    format,
    fit,
  });

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (showPreviewOnClick) {
      setIsModalOpen(true);
    }
    if (onImageClick) {
      onImageClick();
    }
    if (restProps.onClick) {
      restProps.onClick(e);
    }
  };

  return (
    <>
      <div
        className={`relative overflow-hidden transition-all duration-200 ${containerClassName}`}
        style={{
          aspectRatio: aspectRatio || undefined,
          minHeight: !isLoaded && !aspectRatio ? '140px' : undefined,
        }}
      >
        {/* Placeholder skeleton before image loads to completely prevent layout shift */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-slate-150 dark:bg-slate-800 animate-pulse rounded-xl flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-medium">
              <ImageIcon className="w-4 h-4 animate-bounce" />
              <span>ছবি লোড হচ্ছে...</span>
            </div>
          </div>
        )}

        {/* Error Fallback */}
        {hasError ? (
          fallbackSrc ? (
            <img
              src={fallbackSrc}
              alt={alt}
              className={`w-full h-auto object-contain rounded-xl ${className}`}
              loading={loading}
            />
          ) : (
            <div className="w-full py-8 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700">
              ছবি লোড করা সম্ভব হয়নি
            </div>
          )
        ) : (
          <img
            src={optimizedSrc}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            onClick={handleClick}
            className={`transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${showPreviewOnClick || onImageClick ? 'cursor-zoom-in' : ''} ${className}`}
            {...restProps}
          />
        )}
      </div>

      {/* Fullscreen preview modal if user clicks on the image */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200 dark:border-slate-800 mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{alt}</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                ✕ বন্ধ করুন
              </button>
            </div>
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center">
              <img
                src={getOptimizedCloudinaryUrl(src, { width: 1600, quality: 'auto:best' })}
                alt={alt}
                className="w-auto h-auto max-h-[75vh] max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
