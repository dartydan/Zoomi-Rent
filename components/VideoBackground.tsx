"use client";

import { useState, useRef, useEffect } from "react";

type VideoBackgroundProps = {
  videoSrc?: string;
  posterImage: string;
  children?: React.ReactNode;
};

export function VideoBackground({ videoSrc, posterImage, children }: VideoBackgroundProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [useVideo, setUseVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setUseVideo(false);
    }
  }, []);

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
  };

  const handleVideoError = () => {
    setUseVideo(false);
  };

  return (
    <div className="absolute inset-0 z-0">
      {useVideo && videoSrc ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            poster={posterImage}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            className={`object-cover w-full h-full transition-opacity duration-1000 ${
              isVideoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          {/* Show image while video loads */}
          {!isVideoLoaded && (
            <img
              src={posterImage}
              alt="Background"
              className="object-cover w-full h-full absolute inset-0"
            />
          )}
        </>
      ) : (
        <img
          src={posterImage}
          alt="Background"
          className="object-cover w-full h-full"
        />
      )}
      {children}
    </div>
  );
}
