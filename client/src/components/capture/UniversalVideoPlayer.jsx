import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { IoFlashOutline, IoGlobeOutline, IoRefreshOutline } from 'react-icons/io5';

/**
 * Universal Video Player with HLS (.m3u8), MP4/WebM, and Cloud Stream Proxy support.
 * Bypasses regional ISP blocks, CORS restrictions, and hotlink protections via the cloud backend.
 *
 * Playback strategy:
 *   1. If the source is a known hotlink-protected CDN (e.g. twimg.com) or forceProxy is set,
 *      start with the Cloud Stream proxy immediately.
 *   2. Otherwise, try direct playback first. If the browser blocks it (CORS, 403, etc.),
 *      auto-fallback to the Cloud Stream proxy.
 *   3. For HLS (.m3u8), uses hls.js with the same proxy-fallback logic.
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
  const retryCountRef = useRef(0);

  // Detect sources that require proxying from the start
  const needsProxyFromStart = (url) => {
    if (!url || typeof url !== 'string') return false;
    return (
      url.includes('twimg.com') ||
      url.includes('video.twimg.com') ||
      url.includes('fbcdn.net') ||
      url.includes('cdninstagram.com')
    );
  };

  const [useProxy, setUseProxy] = useState(forceProxy || needsProxyFromStart(src));
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Compute final stream URL
  const getStreamUrl = useCallback((rawUrl, proxied) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('/api/captures/stream')) return rawUrl;

    if (proxied) {
      const apiBase = import.meta.env.VITE_API_URL || '';
      return `${apiBase}/api/captures/stream?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }, []);

  const isHls =
    typeof src === 'string' &&
    (src.includes('.m3u8') || src.includes('mpegurl'));

  // Check if the src is actually a playable direct video URL (not an embed page URL)
  const isDirectVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    // If it's already a proxy URL, it's direct
    if (url.startsWith('/api/captures/stream')) return true;
    // Check for known video file extensions or video CDN patterns
    if (/\.(mp4|webm|ogg|mov|m4v|m3u8|mpd)(\?.*)?$/i.test(url)) return true;
    if (url.includes('video.twimg.com')) return true;
    if (url.includes('.m3u8')) return true;
    if (url.includes('fbcdn.net') && url.includes('video')) return true;
    return false;
  };

  // Determine if we should use the video element or an iframe embed
  const hasDirect = isDirectVideoUrl(src);
  const effectiveSrc = getStreamUrl(src, useProxy);

  // Cleanup HLS instance
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Initialize HLS for .m3u8 streams, or set src for MP4/WebM
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || !hasDirect) return;

    destroyHls();
    setHasError(false);
    setErrorMessage('');
    retryCountRef.current = 0;

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          xhrSetup: (xhr) => {
            // Don't send credentials to avoid CORS preflight issues with proxied segments
            xhr.withCredentials = false;
          },
        });
        hlsRef.current = hls;

        hls.loadSource(effectiveSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) {
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (!useProxy) {
                  console.warn('HLS direct stream blocked/failed. Auto-switching to Cloud Stream proxy...');
                  setUseProxy(true);
                } else if (retryCountRef.current < 2) {
                  retryCountRef.current++;
                  hls.startLoad();
                } else {
                  setHasError(true);
                  setErrorMessage('Unable to load video stream. The source may be unavailable.');
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
    } else {
      // MP4 / WebM — set src directly on the video element
      video.src = effectiveSrc;
      video.load();
    }

    return () => {
      destroyHls();
    };
  }, [src, useProxy, isHls, effectiveSrc, hasDirect, autoPlay, destroyHls]);

  const handleVideoError = useCallback(() => {
    if (!useProxy && src) {
      console.warn('Direct video playback error. Switching to Cloud Stream proxy...');
      setUseProxy(true);
    } else {
      setHasError(true);
      setErrorMessage('Unable to stream video. Please check connection or toggle stream mode.');
    }
  }, [useProxy, src]);

  const handleToggleProxy = (e) => {
    e.stopPropagation();
    setHasError(false);
    setErrorMessage('');
    retryCountRef.current = 0;
    setUseProxy((prev) => !prev);
  };

  // Render iframe embed fallback if embedUrl is provided and no direct playable stream
  if ((!src || !hasDirect) && embedUrl) {
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

  // If no src at all, render nothing
  if (!src) return null;

  return (
    <div className={`w-full bg-black relative aspect-video overflow-hidden group select-none ${className}`}>
      {/* Native Video Element with built-in controls */}
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        referrerPolicy="no-referrer"
        onError={handleVideoError}
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
                retryCountRef.current = 0;
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
