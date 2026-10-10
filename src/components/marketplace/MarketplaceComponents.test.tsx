import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CategoryRow, MerchantRow, ProductRow } from '../../types/database';
import { SearchBar } from './SearchBar';
import { CategoryFilter } from './CategoryFilter';
import { MerchantCard } from './MerchantCard';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCard';

function buildMerchant(id: string, name: string, slug: string): MerchantRow {
  return {
    id,
    owner_id: 'owner-1',
    name,
    slug,
    logo_url: null,
    banner_url: null,
    status: 'active',
    verification_docs: {},
    location: null,
    is_active: true,
    is_open: true,
    created_at: '2026-01-01T00:00:00.000Z',
    rif: 'J-12345678-0',
    category: 'Restaurante',
    description: 'Descripción',
    address: 'Dirección',
    zone: null,
    phone_whatsapp: '+58 412-123-4567',
    service_modalities: ['Comer en el local'],
    business_hours: { days: 'L-V', open_time: '8:00', close_time: '20:00' },
  };
}

function buildProduct(id: string, title: string, price: string): ProductRow {
  return {
    id,
    merchant_id: 'merchant-1',
    category_id: 'category-1',
    title,
    description: `Descripción de ${title}`,
    price,
    image_url: null,
    is_available: true,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function buildCategory(id: string, name: string): CategoryRow {
  return {
    id,
    merchant_id: 'merchant-1',
    name,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('SearchBar', () => {
  it('muestra el valor y notifica cambios', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    function SearchProbe() {
      const [value, setValue] = useState('');
      return (
        <SearchBar
          searchQuery={value}
          onSearchChange={(next) => {
            setValue(next);
            onSearchChange(next);
          }}
        />
      );
    }

    render(<SearchProbe />);

    const input = screen.getByPlaceholderText(/Buscar comercios o platillos/i);
    await user.type(input, 'pizza');

    expect(onSearchChange).toHaveBeenLastCalledWith('pizza');
    expect(input).toHaveValue('pizza');
  });
});

describe('CategoryFilter', () => {
  it('renderiza la categoría "Todas" y las categorías', () => {
    const categories = [buildCategory('c1', 'Entradas'), buildCategory('c2', 'Bebidas')];
    render(
      <CategoryFilter
        categories={categories}
        selectedCategoryId={null}
        onSelectCategory={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: /Todas/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Entradas/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Bebidas/i })).toBeInTheDocument();
  });

  it('marca la categoría seleccionada con la marca principal', () => {
    const categories = [buildCategory('c1', 'Entradas')];
    render(
      <CategoryFilter
        categories={categories}
        selectedCategoryId="c1"
        onSelectCategory={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: /Entradas/i })).toHaveClass('bg-brand-red');
  });
});

describe('MerchantCard', () => {
  it('muestra nombre y slug del comercio', () => {
    const merchant = buildMerchant('m1', 'La Esquina', 'la-esquina');
    render(<MerchantCard merchant={merchant} />);

    expect(screen.getByText('La Esquina')).toBeInTheDocument();
    expect(screen.getByText('@la-esquina')).toBeInTheDocument();
  });

  it('notifica al hacer clic', async () => {
    const user = userEvent.setup();
    const merchant = buildMerchant('m1', 'La Esquina', 'la-esquina');
    const onClick = vi.fn();
    render(<MerchantCard merchant={merchant} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: /Ver comercio La Esquina/i }));
    expect(onClick).toHaveBeenCalledWith(merchant);
  });
});

describe('ProductCard', () => {
  it('muestra título, descripción y precio formateado', () => {
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    render(<ProductCard product={product} />);

    expect(screen.getByText('Hamburguesa')).toBeInTheDocument();
    expect(screen.getByText('Descripción de Hamburguesa')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('muestra etiqueta Agotado cuando no está disponible', () => {
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    render(<ProductCard product={{ ...product, is_available: false }} />);

    expect(screen.getByText(/Agotado/i)).toBeInTheDocument();
  });

  it('aplica loading="lazy" a la imagen del producto', () => {
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    render(<ProductCard product={{ ...product, image_url: 'https://example.com/img.jpg' }} />);

    const img = screen.getByRole('img', { name: 'Hamburguesa', hidden: true });
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('muestra la insignia de categoría cuando se proporciona', () => {
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    render(<ProductCard product={product} categoryName="Platillos" />);

    expect(screen.getByText('Platillos')).toBeInTheDocument();
  });

  it('abre el detalle al pulsar la tarjeta', async () => {
    const user = userEvent.setup();
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    const onSelect = vi.fn();
    render(<ProductCard product={product} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Ver producto Hamburguesa/i }));
    expect(onSelect).toHaveBeenCalledWith(product);
  });

  it('activa el detalle con la tecla Enter', async () => {
    const user = userEvent.setup();
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    const onSelect = vi.fn();
    render(<ProductCard product={product} onSelect={onSelect} />);

    await user.type(screen.getByRole('button', { name: /Ver producto Hamburguesa/i }), '{Enter}');
    expect(onSelect).toHaveBeenCalledWith(product);
  });
});

describe('ProductCardSkeleton', () => {
  it('renderiza un marcador de carga accesible', () => {
    const { container } = render(<ProductCardSkeleton />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});

describe('MerchantCard lazy image loading', () => {
  it('aplica loading="lazy" al logo del comercio', () => {
    const merchant = {
      ...buildMerchant('m1', 'La Esquina', 'la-esquina'),
      logo_url: 'https://example.com/logo.png',
    };
    render(<MerchantCard merchant={merchant} />);

    const logoImg = screen.getByAltText('Logo de La Esquina');
    expect(logoImg).toHaveAttribute('loading', 'lazy');
  });

  it('aplica loading="lazy" al banner del comercio', () => {
    const merchant = {
      ...buildMerchant('m1', 'La Esquina', 'la-esquina'),
      banner_url: 'https://example.com/banner.png',
    };
    render(<MerchantCard merchant={merchant} />);

    const bannerImg = screen.getByAltText('La Esquina');
    expect(bannerImg).toHaveAttribute('loading', 'lazy');
  });
});
describe('MerchantCard promociones', () => {
  it('muestra el chip de descuento configurado por el comercio', () => {
    const merchant = {
      ...buildMerchant('m1', 'La Esquina', 'la-esquina'),
      discount_percentage: 20,
    };
    render(<MerchantCard merchant={merchant} />);

    expect(screen.getByText('20% OFF')).toBeInTheDocument();
    expect(screen.getByTestId('merchant-promo-chips')).toBeInTheDocument();
  });

  it('muestra la etiqueta promocional del comercio', () => {
    const merchant = {
      ...buildMerchant('m1', 'La Esquina', 'la-esquina'),
      promo_label: '2x1',
    };
    render(<MerchantCard merchant={merchant} />);

    expect(screen.getByText('2x1')).toBeInTheDocument();
  });

  it('muestra descuento y etiqueta a la vez', () => {
    const merchant = {
      ...buildMerchant('m1', 'La Esquina', 'la-esquina'),
      discount_percentage: 30,
      promo_label: 'Envío gratis',
    };
    render(<MerchantCard merchant={merchant} />);

    expect(screen.getByText('30% OFF')).toBeInTheDocument();
    expect(screen.getByText('Envío gratis')).toBeInTheDocument();
  });

  it('no muestra chips cuando el comercio no tiene promociones', () => {
    const merchant = buildMerchant('m1', 'La Esquina', 'la-esquina');
    render(<MerchantCard merchant={merchant} />);

    expect(screen.queryByTestId('merchant-promo-chips')).not.toBeInTheDocument();
  });

  it('muestra el tiempo estimado como rango junto al reloj', () => {
    const merchant = {
      ...buildMerchant('m1', 'La Esquina', 'la-esquina'),
      estimated_delivery_minutes: 25,
    };
    render(<MerchantCard merchant={merchant} />);

    expect(screen.getByTestId('merchant-eta')).toHaveTextContent('25-35 min');
  });

  it('cae en el horario del día cuando no hay tiempo estimado', () => {
    const merchant = buildMerchant('m1', 'La Esquina', 'la-esquina');
    render(<MerchantCard merchant={merchant} />);

    expect(screen.queryByTestId('merchant-eta')).not.toBeInTheDocument();
  });

  it('el botón Pedir menú navega al comercio una sola vez', async () => {
    const user = userEvent.setup();
    const merchant = buildMerchant('m1', 'La Esquina', 'la-esquina');
    const onClick = vi.fn();
    render(<MerchantCard merchant={merchant} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: /Pedir menú en La Esquina/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(merchant);
  });
});

describe('MerchantCard valoración en el banner', () => {
  it('muestra el badge de estrellas y el porcentaje sobre el banner', () => {
    const merchant = buildMerchant('m1', 'La Esquina', 'la-esquina');
    render(<MerchantCard merchant={merchant} rating={{ average: 4.5, count: 12 }} />);

    const badge = screen.getByTestId('merchant-rating-badge');
    expect(badge).toHaveTextContent('90%');
    // Estrellas visuales: 5 en total (llenas y vacías) según la puntuación.
    expect(badge.querySelectorAll('svg').length).toBe(5);
  });

  it('no muestra la cantidad de reseñas entre paréntesis', () => {
    const merchant = buildMerchant('m1', 'La Esquina', 'la-esquina');
    render(<MerchantCard merchant={merchant} rating={{ average: 4.5, count: 12 }} />);

    const badge = screen.getByTestId('merchant-rating-badge');
    expect(badge).not.toHaveTextContent('(12)');
    expect(badge).not.toHaveTextContent('12');
  });

  it('oculta el badge cuando el comercio no tiene valoraciones', () => {
    const merchant = buildMerchant('m1', 'La Esquina', 'la-esquina');
    render(<MerchantCard merchant={merchant} rating={{ average: 0, count: 0 }} />);

    expect(screen.queryByTestId('merchant-rating-badge')).not.toBeInTheDocument();
  });

  it('oculta el badge cuando no hay resumen de valoraciones', () => {
    const merchant = buildMerchant('m1', 'La Esquina', 'la-esquina');
    render(<MerchantCard merchant={merchant} rating={null} />);

    expect(screen.queryByTestId('merchant-rating-badge')).not.toBeInTheDocument();
  });
});
describe('ProductCard promociones', () => {
  it('renderiza el descuento y el distintivo configurados', () => {
    const product = {
      ...buildProduct('p1', 'Hamburguesa', '12.50'),
      discount_percentage: 20,
      badge_label: 'Más vendido',
    };
    render(<ProductCard product={product} />);

    const badges = screen.getByTestId('product-badges');
    expect(badges).toHaveTextContent('20% OFF');
    expect(badges).toHaveTextContent('Más vendido');
  });

  it('renderiza solo el descuento cuando no hay distintivo', () => {
    const product = {
      ...buildProduct('p1', 'Hamburguesa', '12.50'),
      discount_percentage: 15,
    };
    render(<ProductCard product={product} />);

    expect(screen.getByTestId('product-badges')).toHaveTextContent('15% OFF');
  });

  it('no renderiza badges cuando el plato no tiene ninguno', () => {
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    render(<ProductCard product={product} />);

    expect(screen.queryByTestId('product-badges')).not.toBeInTheDocument();
  });

  it('el boton Agregar agrega el plato una sola vez', async () => {
    const user = userEvent.setup();
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    const onSelect = vi.fn();
    render(<ProductCard product={product} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Agregar Hamburguesa al carrito/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(product);
  });

  it('no muestra el boton Agregar sin manejador de seleccion', () => {
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    render(<ProductCard product={product} />);

    expect(
      screen.queryByRole('button', { name: /Agregar Hamburguesa al carrito/i }),
    ).not.toBeInTheDocument();
  });
});
