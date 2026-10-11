import { useCallback, useEffect, useState } from 'react';
import introVideo from './intro-menugran.mp4';

const BRAND_RED_HEX = '#C71523';
const FALLBACK_DURATION_MS = 2500;

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export function SplashScreen({
  onFinish,
  duration = FALLBACK_DURATION_MS,
}: SplashScreenProps) {
  const [videoFailed, setVideoFailed] = useState(false);

  const handleVideoEnded = useCallback(() => {
    onFinish();
  }, [onFinish]);

  const handleVideoError = useCallback(() => {
    setVideoFailed(true);
  }, []);

  if (!videoFailed) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ backgroundColor: BRAND_RED_HEX }}
        aria-hidden="true"
      >
        <video
          src={introVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return <FallbackSplash onFinish={onFinish} duration={duration} />;
}

function FallbackSplash({
  onFinish,
  duration,
}: {
  onFinish: () => void;
  duration: number;
}) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(
      () => setIsFading(true),
      Math.max(duration - 500, 0),
    );
    const finishTimer = setTimeout(onFinish, duration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#C71523] transition-opacity duration-500 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white shadow-2xl">
        <span className="text-4xl font-black tracking-tight text-[#C71523]">
          MG
        </span>
      </div>
      <h1 className="mt-6 text-4xl font-black tracking-tight text-white">
        MenuGran
      </h1>

      <div className="absolute bottom-16">
        <span className="block h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    </div>
  );
}
