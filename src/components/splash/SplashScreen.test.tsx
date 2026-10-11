import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashScreen } from './SplashScreen';

describe('SplashScreen', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('video intro (primera vez en la sesión)', () => {
    it('renderiza el video con autoPlay, muted y playsInline', () => {
      render(<SplashScreen onFinish={() => {}} />);
      const video = document.querySelector('video');
      expect(video).not.toBeNull();
      expect(video).toHaveAttribute('autoplay');
      expect(video?.muted).toBe(true);
      expect(video).toHaveAttribute('playsinline');
    });

    it('marca hasSeenIntro en sessionStorage y llama onFinish tras onEnded', async () => {
      const onFinish = vi.fn();
      render(<SplashScreen onFinish={onFinish} />);

      const video = document.querySelector('video');
      expect(video).not.toBeNull();
      act(() => {
        video?.dispatchEvent(new Event('ended'));
      });

      expect(sessionStorage.getItem('hasSeenIntro')).toBe('true');
      expect(document.querySelector('video')).not.toBeNull();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('ante error del video hace fallback al splash estático', async () => {
      const onFinish = vi.fn();
      render(<SplashScreen onFinish={onFinish} duration={600} />);

      const video = document.querySelector('video');
      act(() => {
        video?.dispatchEvent(new Event('error'));
      });

      expect(sessionStorage.getItem('hasSeenIntro')).toBe('true');
      expect(screen.getByText('MenuGran')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
    });
  });

  describe('splash estático (intro ya vista)', () => {
    it('no renderiza el video si hasSeenIntro es true', () => {
      sessionStorage.setItem('hasSeenIntro', 'true');
      render(<SplashScreen onFinish={() => {}} />);
      expect(document.querySelector('video')).toBeNull();
      expect(screen.getByText('MenuGran')).toBeInTheDocument();
    });

    it('llama onFinish tras la duración del splash estático', async () => {
      sessionStorage.setItem('hasSeenIntro', 'true');
      const onFinish = vi.fn();
      render(<SplashScreen onFinish={onFinish} duration={800} />);

      expect(onFinish).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(800);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
    });
  });
});
