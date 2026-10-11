import { useCallback, useEffect, useState } from 'react';
import introVideo from '../../assets/logo_animacion_menugran.mp4';

const INTRO_SEEN_KEY = 'hasSeenIntro';
const FADE_OUT_MS = 500;

function hasSeenVideoIntro(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function markVideoIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    return;
  }
}

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 3500 }: SplashScreenProps) {
  const [showVideoIntro, setShowVideoIntro] = useState(() => !hasSeenVideoIntro());
  const [videoEnded, setVideoEnded] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (showVideoIntro) {
      return undefined;
    }
    const fadeTimer = setTimeout(() => setIsFading(true), Math.max(duration - 500, 0));
    const finishTimer = setTimeout(onFinish, duration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish, showVideoIntro]);

  useEffect(() => {
    if (!videoEnded) {
      return undefined;
    }
    const finishTimer = setTimeout(onFinish, FADE_OUT_MS);
    return () => clearTimeout(finishTimer);
  }, [videoEnded, onFinish]);

  const handleVideoEnded = useCallback(() => {
    markVideoIntroSeen();
    setIsFading(true);
    setVideoEnded(true);
  }, []);

  const handleVideoError = useCallback(() => {
    markVideoIntroSeen();
    setShowVideoIntro(false);
  }, []);

  const fadeClass = isFading || videoEnded ? 'opacity-0' : 'opacity-100';

  if (showVideoIntro) {
    return (
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#E4002B] transition-opacity duration-500 ${fadeClass}`}
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

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-brand-red via-brand-red-dark to-[#881337] transition-opacity duration-500 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <div className="animate-splash-pulse flex flex-col items-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white shadow-2xl">
          <span className="text-4xl font-black tracking-tight text-brand-red">MG</span>
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-white">MenuGran</h1>
        <p className="mt-2 text-sm font-medium text-white/80">
          Tu plataforma digital de menús y pedidos
        </p>
      </div>

      <div className="absolute bottom-16 flex w-48 flex-col items-center gap-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
          <div className="animate-splash-progress h-full rounded-full bg-white" />
        </div>
        <p className="text-xs font-medium text-white/60">Cargando...</p>
      </div>
    </div>
  );
}
