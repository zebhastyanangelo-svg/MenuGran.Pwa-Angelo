import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('no renderiza nada cuando está cerrado', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        Oculto
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza el título y el contenido cuando está abierto', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Confirmar">
        Cuerpo del modal
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Cuerpo del modal')).toBeInTheDocument();
  });

  it('cierra al pulsar la tecla Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Confirmar">
        Cuerpo
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra al pulsar el fondo', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Confirmar">
        Cuerpo
      </Modal>,
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra al pulsar dentro del contenido', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Confirmar">
        <button type="button">Interno</button>
      </Modal>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Interno' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
