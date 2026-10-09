/**
 * Guía de voz de navegación por síntesis de voz del navegador.
 *
 * El HUD muestra un botón de silencio (altavoz): cuando el audio está activo,
 * cada instrucción nueva se anuncia por `speechSynthesis`, como hacen los GPS.
 * Todos los accesos se blindan: sin soporte (o sin instrucción) no hace nada.
 */

/** Indica si el navegador puede sintetizar voz. */
export function isVoiceGuidanceSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Anuncia una instrucción de navegación por voz.
 *
 * Cancela el anuncio pendiente previo para que dos instrucciones rápidas no se
 * encimen. Devuelve `true` si la síntesis se disparó; `false` si no hay
 * soporte o el texto venía vacío.
 */
export function speakNavigationInstruction(text: string): boolean {
  if (!isVoiceGuidanceSupported()) return false;
  const instruction = text.trim();
  if (instruction === '') return false;

  try {
    const utterance = new SpeechSynthesisUtterance(instruction);
    utterance.lang = 'es-MX';
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/** Corta cualquier anuncio en curso (al silenciar o desmontar el HUD). */
export function stopNavigationSpeech(): void {
  if (!isVoiceGuidanceSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Sin acción: silenciar no puede fallar la navegación.
  }
}
