import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import type { CartContextValue } from '../types/cart';

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error('useCart debe usarse dentro de un CartProvider');
  }
  return context;
}