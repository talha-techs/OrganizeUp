import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import {
  IoFlashOutline,
  IoGlobeOutline,
  IoRefreshOutline,
  IoSettingsOutline,
  IoCheckmarkOutline,
  IoChevronDownOutline,
} from 'react-icons/io5';

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
 *   4. Quality selection: defaults to 720p (primary) or 480p (fallback) for fast start & low bandwidth,
 *      with full user choice to switch to highest available (1080p, 4K) or Auto.
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

  // Quality selection states
  const [availableQualities, setAvailableQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('');
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const qualityMenuRef = useRef(null);
  const userSelectedQualityRef = useRef(null);

  // Close quality menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(event.target)) {
        setIsQualityMenuOpen(false);
      }
    };
    if (isQualityMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isQualityMenuOpen]);

  // Reset quality state when video source changes
  useEffect(() => {
    userSelectedQualityRef.current = null;
    setSelectedQuality('');
    setAvailableQualities([]);
    setIsQualityMenuOpen(false);
  }, [src]);

  // Helper to deduplicate & sort HLS quality levels
  const processHlsLevels = (rawLevels) => {
    if (!rawLevels || rawLevels.length === 0) return [];

    const indexed = rawLevels.map((lvl, index) => ({
      index,
      height: lvl.height || 0,
      width: lvl.width || 0,
      bitrate: lvl.bitrate || 0,
    }));

    // Deduplicate by height, keeping highest bitrate for each height
    const uniqueMap = new Map();
    for (const item of indexed) {
      const key = item.height || `lvl_${item.index}`;
      if (!uniqueMap.has(key) || item.bitrate > uniqueMap.get(key).bitrate) {
        uniqueMap.set(key, item);
      }
    }

    // Sort descending (highest resolution first in dropdown)
    return Array.from(uniqueMap.values()).sort((a, b) => b.height - a.height);
  };

  // Helper to determine default quality: 720p (primary) or 480p (fallback), NEVER the highest
  const findDefaultLevel = (processedLevels) => {
    if (!processedLevels || processedLevels.length === 0) return null;
    if (processedLevels.length === 1) return { ...processedLevels[0], isDefault: true };

    // 1. Primary: 720p
    const lvl720 = processedLevels.find((lvl) => lvl.height === 720);
    if (lvl720) return { ...lvl720, isDefault: true };

    // 2. Secondary fallback: 480p
    const lvl480 = processedLevels.find((lvl) => lvl.height === 480);
    if (lvl480) return { ...lvl480, isDefault: true };

    // 3. Closest <= 720p (list is sorted descending, so first item <= 720 is the highest below 720p)
    const under720 = processedLevels.filter((lvl) => lvl.height > 0 && lvl.height <= 720);
    if (under720.length > 0) {
      return { ...under720[0], isDefault: true };
    }

    // 4. If all are above 720p, pick the lowest available so it is NOT the highest
    return { ...processedLevels[processedLevels.length - 1], isDefault: true };
  };

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

  // Handle user changing quality level
  const handleSelectQuality = (lvl) => {
    setIsQualityMenuOpen(false);
    if (!hlsRef.current) return;

    if (lvl === 'auto') {
      userSelectedQualityRef.current = 'auto';
      setSelectedQuality('auto');
      hlsRef.current.currentLevel = -1;
      // In auto mode, if using proxy, cap at 720p/default to avoid sudden 4K segment spikes
      if (useProxy && availableQualities.length > 0) {
        const defaultLvl = availableQualities.find((q) => q.isDefault);
        if (defaultLvl) {
          hlsRef.current.autoLevelCapping = defaultLvl.index;
        }
      } else {
        hlsRef.current.autoLevelCapping = -1;
      }
    } else {
      // User explicitly selected a quality level (up to highest available)
      userSelectedQualityRef.current = lvl.height;
      setSelectedQuality(`${lvl.height}p`);
      hlsRef.current.autoLevelCapping = -1; // Uncap so explicit choice is honored
      hlsRef.current.currentLevel = lvl.index;
      hlsRef.current.loadLevel = lvl.index;
    }
  };

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
          startLevel: 0,
          xhrSetup: (xhr) => {
            // Don't send credentials to avoid CORS preflight issues with proxied segments
            xhr.withCredentials = false;
          },
        });
        hlsRef.current = hls;

        hls.loadSource(effectiveSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (data.levels && data.levels.length > 0) {
            const processed = processHlsLevels(data.levels);
            const defaultLvl = findDefaultLevel(processed);

            const qualitiesWithDefault = processed.map((lvl) => ({
              ...lvl,
              isDefault: defaultLvl && lvl.index === defaultLvl.index,
            }));
            setAvailableQualities(qualitiesWithDefault);

            // Honor user's manual choice if previously made, otherwise apply 720p/480p default
            if (userSelectedQualityRef.current !== null) {
              if (userSelectedQualityRef.current === 'auto') {
                hls.currentLevel = -1;
                setSelectedQuality('auto');
              } else {
                const matched = qualitiesWithDefault.find(
                  (q) => q.height === userSelectedQualityRef.current
                );
                if (matched) {
                  hls.autoLevelCapping = -1;
                  hls.currentLevel = matched.index;
                  hls.loadLevel = matched.index;
                  setSelectedQuality(`${matched.height}p`);
                } else if (defaultLvl) {
                  hls.currentLevel = defaultLvl.index;
                  hls.loadLevel = defaultLvl.index;
                  setSelectedQuality(`${defaultLvl.height}p`);
                }
              }
            } else if (defaultLvl) {
              // Default video quality is 720p (primary) or 480p, NOT the highest
              hls.currentLevel = defaultLvl.index;
              hls.loadLevel = defaultLvl.index;
              setSelectedQuality(`${defaultLvl.height}p`);
            }
          }

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

      {/* Floating Control Bar: Quality Selector & Cloud Stream Toggle */}
      {src && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
          {/* Quality Selector Dropdown (shown when multi-quality HLS stream) */}
          {availableQualities.length > 1 && (
            <div className="relative" ref={qualityMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsQualityMenuOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide shadow-md transition-all cursor-pointer backdrop-blur-md border bg-black/60 hover:bg-black/85 text-gray-200 border-white/15 hover:border-white/30 active:scale-95"
                title="Select video quality"
              >
                <IoSettingsOutline size={12} className="text-gray-400" />
                <span>{selectedQuality === 'auto' ? 'Auto' : selectedQuality || 'Quality'}</span>
                <IoChevronDownOutline
                  size={10}
                  className={`text-gray-400 transition-transform duration-200 ${
                    isQualityMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Quality Dropdown Menu */}
              {isQualityMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1.5 py-1 min-w-[130px] bg-neutral-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl z-30 overflow-hidden"
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10">
                    Quality
                  </div>

                  {/* Auto option */}
                  <button
                    type="button"
                    onClick={() => handleSelectQuality('auto')}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors hover:bg-white/10 cursor-pointer ${
                      selectedQuality === 'auto' ? 'text-emerald-400 font-semibold bg-white/5' : 'text-gray-300'
                    }`}
                  >
                    <span>Auto</span>
                    {selectedQuality === 'auto' && <IoCheckmarkOutline size={14} className="text-emerald-400" />}
                  </button>

                  {/* Available levels from highest to lowest */}
                  {availableQualities.map((lvl) => {
                    const isSelected = selectedQuality === `${lvl.height}p`;
                    return (
                      <button
                        key={lvl.index}
                        type="button"
                        onClick={() => handleSelectQuality(lvl)}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors hover:bg-white/10 cursor-pointer ${
                          isSelected ? 'text-emerald-400 font-semibold bg-white/5' : 'text-gray-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{lvl.height}p</span>
                          {lvl.height >= 2160 && (
                            <span className="px-1 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded leading-none">
                              4K
                            </span>
                          )}
                          {lvl.height === 1080 && (
                            <span className="px-1 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded leading-none">
                              HD
                            </span>
                          )}
                          {lvl.height === 720 && (
                            <span className="px-1 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded leading-none">
                              HD
                            </span>
                          )}
                          {lvl.isDefault && (
                            <span className="text-[9px] text-gray-500 font-normal">(Default)</span>
                          )}
                        </span>
                        {isSelected && <IoCheckmarkOutline size={14} className="text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Cloud Stream Toggle */}
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
