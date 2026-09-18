import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fallback?: boolean;
}

export const OptimizedImage = React.memo<OptimizedImageProps>(function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  fallback = true,
}) {
  const [error, setError] = useState(false);

  // Wenn WebP nicht unterstützt wird oder ein Fehler auftritt, zeige das Originalbild
  if (error || (!fallback && !supportsWebP())) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading="lazy"
      />
    );
  }

  // Versuche, WebP-Version zu laden
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  
  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading="lazy"
        onError={() => setError(true)}
      />
    </picture>
  );
});

// Helper-Funktion zur Überprüfung der WebP-Unterstützung
function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}
