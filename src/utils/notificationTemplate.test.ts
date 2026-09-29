import { describe, expect, it } from 'vitest';
import { replaceTemplateVariables, TEMPLATE_VARIABLES } from './notificationTemplate';

describe('replaceTemplateVariables', () => {
  it('reemplaza {nombre} con el primer nombre del usuario', () => {
    const result = replaceTemplateVariables('¡Buenos días, {nombre}! ☕', 'María Pérez');
    expect(result).toBe('¡Buenos días, María! ☕');
  });

  it('reemplaza {full_name} con el nombre completo', () => {
    const result = replaceTemplateVariables('Hola {full_name}, tu pedido está listo.', 'María Pérez Gómez');
    expect(result).toBe('Hola María Pérez Gómez, tu pedido está listo.');
  });

  it('{first_name} es equivalente a {nombre}', () => {
    const result = replaceTemplateVariables('¿Cómo estás, {first_name}?', 'Juan Carlos Pérez');
    expect(result).toBe('¿Cómo estás, Juan?');
  });

  it('reemplaza múltiples variables en el mismo texto', () => {
    const template = '{nombre} ({full_name}) — {first_name}';
    const result = replaceTemplateVariables(template, 'Ana Martínez');
    expect(result).toBe('Ana (Ana Martínez) — Ana');
  });

  it('devuelve el texto sin cambios si no hay variables', () => {
    const result = replaceTemplateVariables('Promoción especial disponible', 'María Pérez');
    expect(result).toBe('Promoción especial disponible');
  });

  it('usa el nombre de respaldo cuando el usuario no tiene nombre', () => {
    const result = replaceTemplateVariables('¡Buenos días, {nombre}!', null);
    expect(result).toBe('¡Buenos días, cliente!');
  });

  it('usa el nombre de respaldo cuando el nombre está vacío', () => {
    const result = replaceTemplateVariables('¡Buen provecho, {nombre}!', '   ');
    expect(result).toBe('¡Buen provecho, cliente!');
  });

  it('expone las variables soportadas para la ayuda de la UI', () => {
    expect(TEMPLATE_VARIABLES).toContain('{nombre}');
    expect(TEMPLATE_VARIABLES).toContain('{full_name}');
    expect(TEMPLATE_VARIABLES).toContain('{first_name}');
  });
});
