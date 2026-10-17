/**
 * Catálogo de bancos venezolanos con su código de institución.
 *
 * Sustituye al campo de texto libre del banco emisor: el comercio elige de una
 * lista cerrada, lo que evita variantes ("Provincial", "BBAVA", "bbva
 * provincial") que el cajero no puede conciliar contra el capture del cliente.
 *
 * Códigos tomados del catálogo oficial de instituciones bancarias del BCV. Se
 * guardan aquí solo como dato de referencia para el comercio; la columna
 * `merchants.pago_movil_bank` sigue siendo texto y almacena el nombre canónico.
 */

export interface VenezuelanBank {
  /** Nombre canónico tal como lo verá el cliente en el checkout. */
  name: string;
  /** Código de 4 dígitos de la institución ante la SUDEBANC. */
  code: string;
  /** Escrituras alternativas con las que se guardó el dato antes del selector. */
  aliases: readonly string[];
}

export const VENEZUELAN_BANKS: readonly VenezuelanBank[] = [
  { name: 'Banco de Venezuela', code: '0102', aliases: ['BDV'] },
  { name: 'Banco Venezolano de Crédito', code: '0104', aliases: ['BVC'] },
  { name: 'Mercantil', code: '0105', aliases: ['Banco Mercantil', 'Mercantil Banco'] },
  { name: 'BBVA Provincial', code: '0108', aliases: ['Provincial', 'Banco Provincial', 'BBVA'] },
  { name: 'Bancaribe', code: '0114', aliases: ['Banco del Caribe'] },
  { name: 'Banco Exterior', code: '0115', aliases: ['Exterior'] },
  { name: 'Banco Caroní', code: '0128', aliases: ['Caroni'] },
  { name: 'Banesco', code: '0134', aliases: ['Banesco Banco Universal'] },
  { name: 'Sofitasa', code: '0137', aliases: ['Banco Sofitasa'] },
  { name: 'Banco Plaza', code: '0138', aliases: ['Plaza'] },
  { name: 'Bancoex', code: '0145', aliases: ['Banco de Comercio Exterior'] },
  {
    name: 'Bangente',
    code: '0146',
    aliases: ['Banco de la Gente Emprendedora'],
  },
  { name: 'Fondo Común', code: '0151', aliases: ['Banco Fondo Común', 'BFC'] },
  { name: '100% Banco', code: '0156', aliases: ['Cien por ciento Banco'] },
  { name: 'Del Sur', code: '0157', aliases: ['DelSur'] },
  { name: 'Banco del Tesoro', code: '0163', aliases: ['Tesoro'] },
  {
    name: 'Banco Agrícola de Venezuela',
    code: '0166',
    aliases: ['Banco Agrícola', 'BAV'],
  },
  { name: 'Bancrecer', code: '0168', aliases: [] },
  { name: 'Mi Banco', code: '0169', aliases: ['Mi Banco Microfinanciero'] },
  { name: 'Banco Activo', code: '0171', aliases: ['Activo'] },
  { name: 'Bancamiga', code: '0172', aliases: ['Bancamiga Suite'] },
  {
    name: 'Banco Internacional de Desarrollo',
    code: '0173',
    aliases: ['Banco Internacional'],
  },
  { name: 'Banplus', code: '0174', aliases: ['Ban Plus'] },
  {
    name: 'Banco Bicentenario',
    code: '0175',
    aliases: [
      'Banco Bicentenario del Pueblo',
      'Banco Digital de los Trabajadores',
      'BDT',
    ],
  },
  {
    name: 'BANFANB',
    code: '0177',
    aliases: ['Banco de la Fuerza Armada Nacional Bolivariana'],
  },
  // El BOD fue absorbido por el BNC, de ahí que se acepte como alias heredado.
  { name: 'Banco Nacional de Crédito', code: '0191', aliases: ['BNC', 'BOD'] },
];

/**
 * Reduce una etiqueta a una clave comparable: sin tildes, sin mayúsculas y sin
 * signos, para que "BBVA Provincial", "bbva-provincial" y "Provincial" colisionen.
 */
function normalizeBankKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const BANKS_BY_KEY = new Map<string, VenezuelanBank>(
  VENEZUELAN_BANKS.flatMap((bank) =>
    [bank.name, bank.code, ...bank.aliases].map((label) => [
      normalizeBankKey(label),
      bank,
    ]),
  ),
);

/** Busca el banco por nombre canónico, código o alias. Devuelve null si no existe. */
export function findVenezuelanBank(
  value: string | null | undefined,
): VenezuelanBank | null {
  const key = normalizeBankKey((value ?? '').trim());
  return key.length > 0 ? (BANKS_BY_KEY.get(key) ?? null) : null;
}

/**
 * Normaliza un valor guardado al nombre canónico del catálogo.
 * Un texto desconocido se devuelve tal cual: no se descarta el dato de un
 * comercio que ya estaba dado de alta antes de que existiera el selector.
 */
export function resolveVenezuelanBankName(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) return '';
  return findVenezuelanBank(trimmed)?.name ?? trimmed;
}

export interface VenezuelanBankOptions {
  banks: readonly VenezuelanBank[];
  /** Valor previo ajeno al catálogo que debe seguir siendo visible y editable. */
  legacy: string | null;
}

/**
 * Opciones del selector para el valor persistido: el catálogo completo más, si
 * hace falta, el texto heredado para no perder lo que el comercio ya había
 * escrito a mano.
 */
export function getVenezuelanBankOptions(
  value: string | null | undefined,
): VenezuelanBankOptions {
  const trimmed = (value ?? '').trim();
  const isKnown = findVenezuelanBank(trimmed) !== null;
  return {
    banks: VENEZUELAN_BANKS,
    legacy: trimmed.length > 0 && !isKnown ? trimmed : null,
  };
}

export interface VenezuelanBankSearchResult {
  banks: readonly VenezuelanBank[];
  /** Texto previo al selector que coincide con la búsqueda, si sigue visible. */
  legacy: string | null;
}

/** `true` si alguna etiqueta del banco (nombre, código o alias) contiene el término. */
function matchesBankQuery(bank: VenezuelanBank, term: string): boolean {
  if (term === '') return true;
  return [bank.name, bank.code, ...bank.aliases].some((label) =>
    normalizeBankKey(label).includes(term),
  );
}

/**
 * Filtra el catálogo para el buscador del formulario de Pago Móvil.
 *
 * La búsqueda ignora tildes, mayúsculas y signos, así que "bancoaz", "BANCO
 * ACTIVO" y "Activo" dan el mismo resultado. El valor ya guardado se pasa en
 * `persistedValue` para que un banco fuera del catálogo siga siendo elegible.
 */
export function searchVenezuelanBanks(
  query: string,
  persistedValue: string | null = null,
): VenezuelanBankSearchResult {
  const { banks, legacy } = getVenezuelanBankOptions(persistedValue);
  const term = normalizeBankKey(query);
  return {
    banks: banks.filter((bank) => matchesBankQuery(bank, term)),
    legacy: legacy !== null && normalizeBankKey(legacy).includes(term) ? legacy : null,
  };
}