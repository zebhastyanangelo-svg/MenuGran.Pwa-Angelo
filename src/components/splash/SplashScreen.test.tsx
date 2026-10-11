import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashScreen } from './SplashScreen';

describe('SplashScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('video intro (siempre al iniciar la app)', () => {
    it('renderiza el video con autoPlay, muted, playsInline y preload=auto', () => {
      render(<SplashScreen onFinish={() => {}} />);
      const video = document.querySelector('video');
      expect(video).not.toBeNull();
      expect(video).toHaveAttribute('autoplay');
      expect(video?.muted).toBe(true);
      expect(video).toHaveAttribute('playsinline');
      expect(video).toHaveAttribute('preload', 'auto');
    });

    it('llama onFinish inmediatamente al terminar el video (onEnded)', () => {
      const onFinish = vi.fn();
      render(<SplashScreen onFinish={onFinish} />);

      const video = document.querySelector('video');
      expect(onFinish).not.toHaveBeenCalled();

      act(() => {
        video?.dispatchEvent(new Event('ended'));
      });

      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('muestra el video aunque haya un intento previo en la sesión', () => {
      render(<SplashScreen onFinish={() => {}} />);
      expect(document.querySelector('video')).not.toBeNull();
    });
  });

  describe('splash estático de respaldo (video fallido)', () => {
    it('ante error del video hace fallback a un splash estático limpio', async () => {
      const onFinish = vi.fn();
      render(<SplashScreen onFinish={onFinish} duration={600} />);

      const video = document.querySelector('video');
      act(() => {
        video?.dispatchEvent(new Event('error'));
      });

      expect(document.querySelector('video')).toBeNull();
      expect(screen.getByText('MenuGran')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('el splash estático no muestra textos innecesarios', () => {
      render(<SplashScreen onFinish={() => {}} duration={600} />);
      const video = document.querySelector('video');
      act(() => {
        video?.dispatchEvent(new Event('error'));
      });

      expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Tu plataforma digital de menús y pedidos'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('MenuGran')).toBeInTheDocument();
    });
  });
});
