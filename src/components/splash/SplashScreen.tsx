import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 3500 }: SplashScreenProps) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), duration - 500);
    const finishTimer = setTimeout(onFinish, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-brand-red via-[#c80024] to-[#881337] transition-opacity duration-500 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <div className="animate-splash-pulse flex flex-col items-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white shadow-2xl">
          <span className="text-5xl font-black tracking-tight text-brand-red">M</span>
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
