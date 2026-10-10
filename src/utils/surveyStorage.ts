/**
 * Estado efímero de la encuesta post-pedido en localStorage.
 *
 * Registra, por pedido, si el cliente ya respondió la encuesta o la pospuso,
 * para no volver a mostrar el modal automáticamente en la misma visita.
 * Es estado local del dispositivo: la fuente de verdad de "ya calificó" es
 * la fila en `order_ratings`, esto solo evita molestar al cliente.
 *
 * Convenciones de `offlineStorage.ts`: guards SSR, try/catch explícito y
 * clamping del número de entradas para evitar crecimiento ilimitado.
 */

const SURVEY_STATE_KEY = 'menugram_order_survey_v1';
const MAX_TRACKED_SURVEYS = 50;

export type SurveyCompletionState = 'answered' | 'dismissed';

interface SurveyStateEntry {
  state: SurveyCompletionState;
  updatedAt: number;
}

type SurveyStateMap = Record<string, SurveyStateEntry>;

let lastWriteTimestamp = 0;

function isLocalStorageAvailable(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  try {
    const testKey = '__menugram_survey_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function readState(): SurveyStateMap {
  if (!isLocalStorageAvailable()) {
    return {};
  }
  try {
    const stored = localStorage.getItem(SURVEY_STATE_KEY);
    if (stored === null) {
      return {};
    }
    const parsed = JSON.parse(stored) as Partial<SurveyStateMap>;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as SurveyStateMap;
  } catch {
    return {};
  }
}

function writeState(state: SurveyStateMap): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  try {
    localStorage.setItem(SURVEY_STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function setSurveyState(orderId: string, state: SurveyCompletionState): boolean {
  if (!orderId) return false;
  const stateMap = readState();
  // Timestamp estrictamente creciente: varias escrituras en el mismo milisegundo
  // no deben empatar, o el clamping descartaría la entrada más reciente.
  lastWriteTimestamp = Math.max(Date.now(), lastWriteTimestamp + 1);
  stateMap[orderId] = { state, updatedAt: lastWriteTimestamp };
  // Clamping: conserva las 50 encuestas más recientes.
  const entries = Object.entries(stateMap)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(0, MAX_TRACKED_SURVEYS);
  return writeState(Object.fromEntries(entries));
}

export function markSurveyAnswered(orderId: string): boolean {
  return setSurveyState(orderId, 'answered');
}

export function markSurveyDismissed(orderId: string): boolean {
  return setSurveyState(orderId, 'dismissed');
}

export function getSurveyCompletionState(orderId: string): SurveyCompletionState | null {
  if (!orderId) return null;
  return readState()[orderId]?.state ?? null;
}

/** ¿Debe mostrarse automáticamente el modal de encuesta para este pedido? */
export function shouldAutoShowSurvey(orderId: string): boolean {
  return getSurveyCompletionState(orderId) === null;
}

export function clearSurveyState(): boolean {
  return writeState({});
}
