import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import {
  IoPlayCircle,
  IoPauseCircle,
  IoVolumeMediumOutline,
  IoVolumeMuteOutline,
} from 'react-icons/io5';

const WaveformPlayer = ({
  audioUrl,
  isPlaying,
  onTogglePlay,
  onTimeUpdate,
  volume = 0.8,
  onVolumeChange,
}) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    // Initialize WaveSurfer with warm coral theme colors
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#71717a',
      progressColor: '#ff5722',
      cursorColor: '#f4511e',
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      height: 64,
      normalize: true,
      url: audioUrl,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setIsReady(true);
      setDuration(ws.getDuration());
      ws.setVolume(volume);
    });

    ws.on('timeupdate', (curr) => {
      setCurrentTime(curr);
      if (onTimeUpdate) onTimeUpdate(curr);
    });

    ws.on('finish', () => {
      if (isPlaying && onTogglePlay) {
        onTogglePlay();
      }
    });

    return () => {
      ws.destroy();
    };
  }, [audioUrl]);

  // Sync external isPlaying state with wavesurfer
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return;
    if (isPlaying) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying, isReady]);

  // Sync volume
  useEffect(() => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  const fmtTime = (secs) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4">
      {/* Waveform Canvas Container */}
      <div className="relative py-2 px-1">
        <div ref={containerRef} className="w-full cursor-pointer" />
        {!isReady && (
          <div className="h-16 flex items-center justify-center text-xs text-muted">
            Loading audio waveform…
          </div>
        )}
      </div>

      {/* Time Display */}
      <div className="flex justify-between text-xs text-muted font-mono px-1">
        <span>{fmtTime(currentTime)}</span>
        <span>{fmtTime(duration)}</span>
      </div>
    </div>
  );
};

export default WaveformPlayer;
