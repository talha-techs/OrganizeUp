import {
  IoVideocamOutline,
} from 'react-icons/io5';
import {
  FaYoutube,
  FaInstagram,
  FaFacebook,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

/**
 * Resolves a reliable direct embed URL for Instagram videos (Reels or Posts)
 */
export const getInstagramEmbedUrl = (url = '', existingEmbedUrl = '') => {
  if (existingEmbedUrl && existingEmbedUrl.includes('instagram.com/') && existingEmbedUrl.includes('/embed')) {
    return existingEmbedUrl;
  }
  const target = url || existingEmbedUrl || '';
  const match = target.match(/(?:instagram\.com\/(?:reel|reels|p|tv)\/)([A-Za-z0-9_-]+)/i);
  if (match) {
    const shortcode = match[1];
    const isReel = target.toLowerCase().includes('/reel');
    return `https://www.instagram.com/${isReel ? 'reel' : 'p'}/${shortcode}/embed`;
  }
  return existingEmbedUrl || '';
};

/**
 * Resolves a reliable direct embed URL for Facebook videos (Reels or Videos)
 */
export const getFacebookEmbedUrl = (url = '', existingEmbedUrl = '') => {
  if (existingEmbedUrl && existingEmbedUrl.includes('facebook.com/plugins/video.php')) {
    return existingEmbedUrl;
  }
  const target = url || '';
  if (/(?:facebook\.com|fb\.watch|fb\.me)/i.test(target)) {
    let cleanUrl = target;
    try {
      const u = new URL(target);
      if (u.pathname.includes('/reel/')) {
        cleanUrl = `${u.origin}${u.pathname}`;
      } else if (u.pathname.includes('/watch') && u.searchParams.has('v')) {
        cleanUrl = `${u.origin}${u.pathname}?v=${u.searchParams.get('v')}`;
      }
    } catch {
      // url parse fallback
    }
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=false&t=0`;
  }
  return existingEmbedUrl || '';
};

/**
 * Robust helper to inspect any URL and extract video/media metadata
 */
export const detectLinkMediaInfo = (rawUrl = '') => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();

  // 1. YouTube (Videos, Shorts, Embeds)
  const ytMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  if (ytMatch) {
    const videoId = ytMatch[1];
    const isShort = url.toLowerCase().includes('/shorts/');
    return {
      platform: 'youtube',
      mediaType: 'video',
      embedId: videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      aspectRatio: isShort ? '9/16' : '16/9',
      label: isShort ? 'YouTube Short' : 'YouTube Video',
    };
  }

  // 2. Instagram (Reels, Posts, TV)
  const igMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i,
  );
  if (igMatch) {
    const shortcode = igMatch[1];
    const isReel = url.toLowerCase().includes('/reel');
    return {
      platform: 'instagram',
      mediaType: 'video',
      embedId: shortcode,
      embedUrl: isReel
        ? `https://www.instagram.com/reel/${shortcode}/embed`
        : `https://www.instagram.com/p/${shortcode}/embed`,
      aspectRatio: isReel ? '9/16' : '16/9',
      label: isReel ? 'Instagram Reel' : 'Instagram Video',
    };
  }

  // 3. Facebook Video / Watch / Reel
  if (/(?:facebook\.com|fb\.watch|fb\.me)/i.test(url)) {
    const fbEmbed = getFacebookEmbedUrl(url);
    const isReel = url.toLowerCase().includes('/reel');
    return {
      platform: 'facebook',
      mediaType: 'video',
      embedUrl: fbEmbed,
      aspectRatio: isReel ? '9/16' : '16/9',
      label: isReel ? 'Facebook Reel' : 'Facebook Video',
    };
  }

  // 4. Twitter / X Video
  const twMatch = url.match(
    /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?([a-zA-Z0-9_]+)\/status(?:es)?\/(\d+)/i,
  );
  if (twMatch) {
    const username = twMatch[1];
    const tweetId = twMatch[2];
    return {
      platform: 'twitter',
      mediaType: 'video',
      embedId: tweetId,
      authorName: `@${username}`,
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark`,
      aspectRatio: '16/9',
      label: 'X (Twitter) Post',
    };
  }

  // 5. Direct Video Streams (.mp4, .webm, .m3u8, etc.) & Web Video Sites
  if (
    /\.(mp4|webm|ogg|mov|m4v|m3u8|mpd)(\?.*)?$/i.test(url) ||
    url.includes('/api/captures/stream') ||
    /(?:pmvhaven\.com)/i.test(url)
  ) {
    return {
      platform: 'web',
      mediaType: 'video',
      mediaUrl: url,
      aspectRatio: '16/9',
      label: 'Web Video',
    };
  }

  // 6. Vimeo
  const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      platform: 'web',
      mediaType: 'video',
      embedId: videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      aspectRatio: '16/9',
      label: 'Vimeo Video',
    };
  }

  // 7. Loom
  const loomMatch = url.match(/(?:https?:\/\/)?(?:www\.)?loom\.com\/share\/([a-zA-Z0-9]+)/i);
  if (loomMatch) {
    const videoId = loomMatch[1];
    return {
      platform: 'web',
      mediaType: 'video',
      embedId: videoId,
      embedUrl: `https://www.loom.com/embed/${videoId}`,
      aspectRatio: '16/9',
      label: 'Loom Video',
    };
  }

  // 8. TikTok
  const tiktokMatch = url.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (tiktokMatch) {
    const videoId = tiktokMatch[1];
    return {
      platform: 'web',
      mediaType: 'video',
      embedId: videoId,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      aspectRatio: '9/16',
      label: 'TikTok Video',
    };
  }

  return null;
};

/**
 * Check if a link represents playable video media
 */
export const isVideoLink = (link) => {
  if (!link) return false;
  if (link.mediaType === 'video') return true;
  if (['youtube', 'instagram', 'facebook', 'twitter'].includes(link.platform)) return true;
  if (link.embedUrl && !['linkedin', 'article'].includes(link.platform)) return true;
  if (link.mediaUrl && /\.(mp4|webm|ogg|mov|m4v|m3u8|mpd)/i.test(link.mediaUrl)) return true;
  if (detectLinkMediaInfo(link.url)) return true;
  return false;
};

/**
 * Helper to get platform metadata badges
 */
export const getPlatformBadge = (platform) => {
  switch (platform) {
    case 'youtube':
      return {
        icon: <FaYoutube className="text-red-500" size={15} />,
        label: 'YouTube',
        bgCls: 'bg-red-500/10 text-red-400 border-red-500/20',
      };
    case 'instagram':
      return {
        icon: <FaInstagram className="text-pink-400" size={15} />,
        label: 'Instagram',
        bgCls: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
      };
    case 'facebook':
      return {
        icon: <FaFacebook className="text-blue-400" size={15} />,
        label: 'Facebook',
        bgCls: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
      };
    case 'twitter':
      return {
        icon: <FaXTwitter className="text-zinc-200" size={14} />,
        label: 'X (Twitter)',
        bgCls: 'bg-zinc-800 text-zinc-200 border-zinc-700',
      };
    default:
      return {
        icon: <IoVideocamOutline className="text-accent" size={15} />,
        label: 'Video',
        bgCls: 'bg-accent/10 text-accent border-accent/20',
      };
  }
};
