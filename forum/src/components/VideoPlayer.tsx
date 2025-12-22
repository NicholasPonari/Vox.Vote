"use client";

import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function VideoPlayer({ src, poster, width, height, className, style }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if HLS is supported natively (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    // For other browsers, we'll use the MP4 fallback from Mux
    // Extract playback ID from the HLS URL
    const playbackId = src.split('/')[3].split('.')[0];
    const mp4Url = `https://stream.mux.com/${playbackId}.mp4`;
    
    // Try MP4 first
    video.src = mp4Url;
    
    // If MP4 fails, we can fallback to loading hls.js dynamically
    video.addEventListener('error', async () => {
      try {
        // Dynamically import hls.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        document.head.appendChild(script);
        
        script.onload = () => {
          if (window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
          }
        };
      } catch (error) {
        console.error('Failed to load HLS player:', error);
      }
    });

    return () => {
      // Cleanup
      const scripts = document.querySelectorAll('script[src*="hls.js"]');
      scripts.forEach(script => script.remove());
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      width={width}
      height={height}
      controls
      className={className}
      style={style}
      poster={poster}
      preload="metadata"
    >
      Your browser does not support the video tag.
    </video>
  );
}
