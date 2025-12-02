
import React, { useState, useRef, useEffect } from 'react';
import { MediaItem } from '../types';
import { Loader2, ZoomIn, AlertTriangle } from 'lucide-react';

interface MediaDisplayProps {
  item: MediaItem;
  className?: string;
  autoPlay?: boolean;
  enableZoom?: boolean;
  objectFit?: 'cover' | 'contain';
  muted?: boolean;
  transparent?: boolean;
}

export const MediaDisplay: React.FC<MediaDisplayProps> = ({ 
  item, 
  className = "", 
  autoPlay = true,
  enableZoom = false,
  objectFit = 'cover',
  muted = false,
  transparent = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState('50% 50%');
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when item changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setIsZoomed(false);
    setProgress(0);
  }, [item.id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableZoom || !containerRef.current) return;

    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setTransformOrigin(`${x}% ${y}%`);
  };

  const toggleZoom = () => {
    if (enableZoom && !hasError && !isLoading) {
      setIsZoomed(!isZoomed);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleSuccess = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Determine cursor style
  const cursorClass = enableZoom && !hasError && !isLoading
    ? (isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in') 
    : 'cursor-default';
    
  const bgClass = transparent ? 'bg-transparent' : 'bg-black';

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${bgClass} group ${cursorClass} ${className}`}
      onMouseEnter={() => enableZoom && setIsHovering(true)}
      onMouseLeave={() => {
        if (enableZoom) {
          setIsHovering(false);
          setIsZoomed(false); // Reset zoom when leaving the area
        }
      }}
      onMouseMove={handleMouseMove}
      onClick={toggleZoom}
    >
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-brand-navy/50">
          <Loader2 className="w-8 h-8 text-brand-cyan animate-spin" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-brand-navy/80 text-brand-red text-center p-4">
            <AlertTriangle className="w-12 h-12 mb-2 opacity-80" />
            <p className="font-bold text-sm">Failed to load media</p>
        </div>
      )}

      {/* Zoom Hint Overlay */}
      {enableZoom && isHovering && !isZoomed && !isLoading && !hasError && (
        <div className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-sm p-2 rounded-full text-white/70 pointer-events-none transition-opacity animate-pulse">
          <ZoomIn className="w-5 h-5" />
        </div>
      )}

      <div 
        className="w-full h-full transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
          transformOrigin: transformOrigin
        }}
      >
        {item.type === 'video' ? (
          <video
            src={item.url}
            className={`w-full h-full object-${objectFit}`}
            autoPlay={autoPlay}
            loop
            muted={muted}
            playsInline
            onLoadedData={handleSuccess}
            onError={handleError}
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <img
            src={item.url}
            alt={item.title}
            className={`w-full h-full object-${objectFit}`}
            onLoad={handleSuccess}
            onError={handleError}
          />
        )}
      </div>
      
      {/* Gradient Overlay - only show if objectFit is cover to blend edges */}
      {objectFit === 'cover' && !transparent && !isZoomed && !hasError && (
        <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none transition-opacity duration-300 ${isHovering ? 'opacity-0' : 'opacity-100'}`} />
      )}

      {/* Video Progress Bar */}
      {item.type === 'video' && !isLoading && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50 z-20">
            <div 
                className="h-full bg-brand-cyan transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(29,187,229,0.5)]"
                style={{ width: `${progress}%` }}
            />
        </div>
      )}
    </div>
  );
};
