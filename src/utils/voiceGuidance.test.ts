import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  isVoiceGuidanceSupported,
  speakNavigationInstruction,
  stopNavigationSpeech,
} from './voiceGuidance';

describe('voiceGuidance sin soporte', () => {
  it('reporta que no hay soporte cuando speechSynthesis no existe', () => {
    expect(isVoiceGuidanceSupported()).toBe(false);
  });

  it('no lanza al hablar sin soporte', () => {
    expect(speakNavigationInstruction('Gira a la derecha')).toBe(false);
    expect(() => stopNavigationSpeech()).not.toThrow();
  });
});

describe('voiceGuidance con soporte', () => {
  const mockSpeak = vi.fn();
  const mockCancel = vi.fn();

  beforeEach(() => {
    class MockUtterance {
      text: string;
      lang: string;
      rate: number;
      constructor(text: string) {
        this.text = text;
        this.lang = '';
        this.rate = 1;
      }
    }
    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;
    (globalThis as any).speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
    };
    mockSpeak.mockClear();
    mockCancel.mockClear();
  });

  afterEach(() => {
    delete (globalThis as any).SpeechSynthesisUtterance;
    delete (globalThis as any).speechSynthesis;
  });

  it('detecta el soporte y anuncia la instrucción', () => {
    expect(isVoiceGuidanceSupported()).toBe(true);

    const spoken = speakNavigationInstruction('Gira a la derecha');

    expect(spoken).toBe(true);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const [utterance] = mockSpeak.mock.calls[0];
    expect(utterance.text).toBe('Gira a la derecha');
    expect(utterance.lang).toBe('es-MX');
  });

  it('se niega a anunciar textos vacíos', () => {
    expect(speakNavigationInstruction('   ')).toBe(false);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('cancela el anuncio al silenciar', () => {
    stopNavigationSpeech();

    expect(mockCancel).toHaveBeenCalled();
  });

  it('degrada sin lanzar si la síntesis revienta', () => {
    mockSpeak.mockImplementation(() => {
      throw new Error('audio device lost');
    });

    expect(speakNavigationInstruction('Sigue derecho')).toBe(false);
  });
});
