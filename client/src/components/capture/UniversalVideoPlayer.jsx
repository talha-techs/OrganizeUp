import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { IoFlashOutline, IoGlobeOutline, IoRefreshOutline } from 'react-icons/io5';

/**
 * Universal Video Player with HLS (.m3u8), MP4/WebM, and Cloud Stream Proxy support.
 * Bypasses regional ISP blocks, CORS restrictions, and hotlink protections via the cloud backend.
 */
const UniversalVideoPlayer = ({
  src,
  poster,
  title = 'Video Player',
  embedUrl,
  className = '',
  autoPlay = false,
  forceProxy = false,
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // Twitter/X CDN strictly rejects foreign Referer headers, requiring the stream proxy.
  // Other platforms (like HLS or direct MP4) try direct first, with auto-fallback to Cloud Proxy on error.
  const isTwimg = typeof src === 'string' && (src.includes('twimg.com') || src.includes('video.twimg.com'));
  const [useProxy, setUseProxy] = useState(forceProxy || isTwimg);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Compute final stream URL
  const getStreamUrl = (rawUrl, proxied) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('/api/captures/stream')) return rawUrl;

    if (proxied) {
      const apiBase = import.meta.env.VITE_API_URL || '';
      return `${apiBase}/api/captures/stream?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  };

  const isHls = typeof src === 'string' && (src.includes('.m3u8') || src.includes('mpegurl'));
  const effectiveSrc = getStreamUrl(src, useProxy);

  // Initialize HLS for .m3u8 streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || embedUrl || !isHls) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setHasError(false);
    setErrorMessage('');

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });
      hlsRef.current = hls;

      hls.loadSource(effectiveSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (!useProxy) {
                console.warn('HLS direct stream blocked/failed. Auto-switching to Cloud Stream proxy...');
                setUseProxy(true);
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setHasError(true);
              setErrorMessage('Unable to load video stream.');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS for Safari / iOS
      video.src = effectiveSrc;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, useProxy, isHls, effectiveSrc]);

  const handleToggleProxy = (e) => {
    e.stopPropagation();
    setUseProxy((prev) => !prev);
  };

  // Render iframe embed fallback if embedUrl is provided without a direct stream URL
  if (!src && embedUrl) {
    return (
      <div className={`w-full bg-black relative aspect-video overflow-hidden ${className}`}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          scrolling="no"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          title={title}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`w-full bg-black relative aspect-video overflow-hidden group select-none ${className}`}>
      {/* Native Video Element with built-in controls */}
      <video
        ref={videoRef}
        src={!isHls ? effectiveSrc : undefined}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => {
          if (!useProxy && src) {
            console.warn('Direct video playback error. Switching to Cloud Stream proxy...');
            setUseProxy(true);
          } else {
            setHasError(true);
            setErrorMessage('Unable to stream video. Please check connection or toggle stream mode.');
          }
        }}
        className="w-full h-full object-contain"
      />

      {/* Floating Control Bar: Cloud Stream (VPN-Free) Toggle */}
      {src && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleToggleProxy}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide shadow-md transition-all cursor-pointer backdrop-blur-md border ${
              useProxy
                ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white border-emerald-400/40 shadow-emerald-950/40'
                : 'bg-black/60 hover:bg-black/80 text-gray-300 border-white/10'
            }`}
            title={
              useProxy
                ? 'Streaming via Cloud Proxy (VPN-Free). Click to try direct stream.'
                : 'Streaming direct from origin CDN. Click to route via Cloud Proxy.'
            }
          >
            {useProxy ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                </span>
                <IoFlashOutline className="text-emerald-200" size={13} />
                <span>Cloud Stream</span>
              </>
            ) : (
              <>
                <IoGlobeOutline className="text-gray-400" size={13} />
                <span>Direct</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error State with Quick Reload */}
      {hasError && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center z-10">
          <p className="text-xs text-rose-400 font-medium mb-3">{errorMessage}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHasError(false);
                setUseProxy((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <IoRefreshOutline size={14} />
              Switch to {useProxy ? 'Direct Stream' : 'Cloud Stream'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalVideoPlayer;
