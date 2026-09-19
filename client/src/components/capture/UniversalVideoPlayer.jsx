import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { IoFlashOutline, IoGlobeOutline, IoRefreshOutline, IoPlayCircleOutline } from 'react-icons/io5';

/**
 * Universal Video Player with HLS (.m3u8), MP4/WebM, and Cloud Stream Proxy support.
 * Bypasses regional ISP blocks, CORS restrictions, and hotlink protections via the Oregon cloud backend.
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(autoPlay);
  const [useProxy, setUseProxy] = useState(forceProxy || (typeof src === 'string' && (src.includes('twimg.com') || src.includes('.m3u8'))));
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBuffering, setIsBuffering] = useState(false);

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

  // Initialize or update video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || embedUrl) return;

    // Destroy existing HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setHasError(false);
    setErrorMessage('');

    // Remember current playback position when switching proxy modes
    const currentTime = video.currentTime || 0;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(effectiveSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (currentTime > 0) {
          video.currentTime = currentTime;
        }
        if (hasStarted) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Automatic failover to Cloud Proxy if direct connection fails
              if (!useProxy) {
                console.warn('HLS network error on direct stream. Switching to Cloud Stream proxy...');
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
              setErrorMessage('Playback error. Try toggling Cloud Stream.');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && isHls) {
      // Native HLS support (Safari on iOS / macOS)
      video.src = effectiveSrc;
      if (currentTime > 0) {
        video.currentTime = currentTime;
      }
      if (hasStarted) {
        video.play().catch(() => {});
      }
    } else {
      // Direct MP4 / WebM video
      video.src = effectiveSrc;
      if (currentTime > 0) {
        video.currentTime = currentTime;
      }
      if (hasStarted) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, useProxy, isHls]);

  const handleToggleProxy = (e) => {
    e.stopPropagation();
    setUseProxy((prev) => !prev);
  };

  const handleStartPlay = () => {
    setHasStarted(true);
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
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
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        controls={hasStarted}
        playsInline
        preload="metadata"
        referrerPolicy="no-referrer"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={() => {
          if (!useProxy && src) {
            console.warn('Direct video playback error. Switching to Cloud Stream proxy...');
            setUseProxy(true);
          } else {
            setHasError(true);
            setErrorMessage('Unable to stream video. Please check your connection.');
          }
        }}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Initial Play Overlay (Poster View) */}
      {!hasStarted && (
        <div
          onClick={handleStartPlay}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-black/20"
        >
          {poster && (
            <img
              src={poster}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover -z-10 opacity-70 group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-500/90 text-white flex items-center justify-center shadow-2xl shadow-orange-500/50 transform group-hover:scale-110 transition-transform">
            <IoPlayCircleOutline size={38} className="translate-x-0.5" />
          </div>
          <span className="mt-3 px-3 py-1 rounded-full bg-black/70 border border-white/10 text-xs font-semibold text-white/95 drop-shadow">
            Click to Play Video
          </span>
        </div>
      )}

      {/* Top Floating Control Bar: Cloud Stream (VPN-Free) Toggle */}
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
            title={useProxy ? 'Streaming via Oregon Cloud (VPN-Free & Fast). Click for direct stream.' : 'Streaming direct. Click to route via Oregon Cloud Proxy.'}
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

      {/* Buffering Spinner */}
      {isBuffering && hasStarted && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/20">
          <div className="w-10 h-10 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
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
