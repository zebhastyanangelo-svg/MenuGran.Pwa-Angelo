import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductFormModal } from './ProductFormModal';
import { ProductManagement } from './ProductManagement';
import { supabase } from '../../services/supabase';
import type { CategoryRow, ProductRow } from '../../types/database';

// Mock Supabase
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  TABLE_NAMES: {
    merchants: 'merchants',
    categories: 'categories',
    products: 'products',
  },
}));

// Mock Cloudinary upload
vi.mock('../../services/cloudinary', () => ({
  uploadToCloudinary: vi.fn().mockResolvedValue('https://res.cloudinary.com/demo/image/upload/sample.jpg'),
}));

const mockCategories: CategoryRow[] = [
  {
    id: 'cat-1',
    merchant_id: 'merchant-123',
    name: 'Hamburguesas',
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    merchant_id: 'merchant-123',
    name: 'Bebidas',
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
];

const mockProducts: ProductRow[] = [
  {
    id: 'prod-1',
    merchant_id: 'merchant-123',
    category_id: 'cat-1',
    title: 'Hamburguesa Clásica',
    description: 'Carne, queso, lechuga',
    price: '8.50',
    image_url: 'https://cloudinary.com/burguer.jpg',
    is_available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    merchant_id: 'merchant-123',
    category_id: 'cat-2',
    title: 'Coca Cola 500ml',
    description: 'Refresco frío',
    price: '2.00',
    image_url: null,
    is_available: false,
    created_at: new Date().toISOString(),
  },
];

describe('ProductFormModal', () => {
  it('no se muestra si isOpen es false', () => {
    render(
      <ProductFormModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        categories={mockCategories}
      />
    );

    expect(screen.queryByText('Agregar Producto')).toBeNull();
  });

  it('muestra el título correcto y llena los campos en modo edición', () => {
    render(
      <ProductFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        categories={mockCategories}
        initialData={mockProducts[0]}
      />
    );

    expect(screen.getByText('Editar Producto')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hamburguesa Clásica')).toBeInTheDocument();
    expect(screen.getByDisplayValue('8.50')).toBeInTheDocument();
  });

  it('muestra mensaje de error si se intenta guardar un formulario inválido', async () => {
    const handleSave = vi.fn();
    render(
      <ProductFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
        categories={mockCategories}
      />
    );

    // Intentar guardar con campos vacíos
    const submitBtn = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
    });
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('llama a onSave con los datos validados al completar el formulario', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
        categories={mockCategories}
      />
    );

    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Papas Fritas' },
    });
    fireEvent.change(screen.getByLabelText(/precio/i), {
      target: { value: '4.00' },
    });
    fireEvent.change(screen.getByLabelText(/categoría/i), {
      target: { value: 'cat-1' },
    });

    const submitBtn = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({
        title: 'Papas Fritas',
        description: null,
        price: '4.00',
        category_id: 'cat-1',
        is_available: true,
        image_url: null,
      });
    });
  });
});

describe('ProductManagement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('carga y muestra las categorías y los productos del comercio', async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
        };
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
        };
      }
      return { select: vi.fn() };
    });

    (supabase.from as any).mockImplementation(mockFrom);

    render(<ProductManagement merchantId="merchant-123" />);

    await waitFor(() => {
      expect(screen.getByText('Hamburguesa Clásica')).toBeInTheDocument();
      expect(screen.getByText('Coca Cola 500ml')).toBeInTheDocument();
    });
  });

  it('permite alternar la disponibilidad (is_available) de un producto', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
        };
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
          update: vi.fn().mockReturnValue({ eq: mockUpdateEq }),
        };
      }
      return { select: vi.fn() };
    });

    (supabase.from as any).mockImplementation(mockFrom);

    render(<ProductManagement merchantId="merchant-123" />);

    await waitFor(() => {
      expect(screen.getByText('Hamburguesa Clásica')).toBeInTheDocument();
    });

    // Toggle switch for product 1
    const toggleBtn = screen.getByTestId('toggle-available-prod-1');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'prod-1');
    });
  });
});
