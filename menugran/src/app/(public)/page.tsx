'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Smartphone, Truck, Ticket, Utensils } from 'lucide-react';
import FoodOrbitCarousel from '@/components/hero/FoodOrbitCarousel';

function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

export default function PublicLandingPage() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="min-h-screen bg-cream-50" suppressHydrationWarning>
      <nav className="bg-cream-50/80 backdrop-blur-md border-b border-cream-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Ticket className="w-8 h-8 text-brand-600 mr-2" />
              <span className="text-2xl font-display font-bold text-ink">MenuGran</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#inicio" className="text-ink-light hover:text-brand-600 transition-colors font-body">Inicio</a>
              <a href="#como-funciona" className="text-ink-light hover:text-brand-600 transition-colors font-body">¿Cómo funciona?</a>
              <a href="#restaurantes" className="text-ink-light hover:text-brand-600 transition-colors font-body">Restaurantes</a>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/login">
                <button type="button" className="text-brand-600 border border-brand-600 px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors font-body">
                  Iniciar Sesión
                </button>
              </Link>
              <Link href="/register">
                <button type="button" className="bg-brand-600 text-cream-50 px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors font-body">
                  Registrarme
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section id="inicio" className="bg-gradient-to-br from-cream-50 via-cream-100 to-cream-200 min-h-[75vh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 mb-4">
                <Ticket className="w-6 h-6 text-gold-500" />
                <span className="text-sm font-body text-gold-700 uppercase tracking-wider">Cocina artesanal, pedido inteligente</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-ink mb-6 leading-tight">
                Pide desde tu Telefono<br />
                <span className="text-brand-600">y disfruta </span>
              </h1>
              <p className="text-xl text-ink-light mb-8 max-w-2xl font-body">
                Menú digital, pedidos en tiempo real y seguimiento de tu entrega
              </p>
              <Link href="#restaurantes">
                <button type="button" className="bg-brand-600 text-cream-50 px-8 py-4 rounded-lg text-lg font-body font-semibold hover:bg-brand-700 transform hover:scale-105 transition-transform duration-200 shadow-lg">
                  Buscar Menús
                </button>
              </Link>
            </div>

            <div className="text-center lg:text-right">
              <FoodOrbitCarousel prefersReducedMotion={prefersReducedMotion} className="w-full" />
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-20 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-eyebrow">Cómo funciona</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-4">Tres pasos simples</h2>
            <p className="text-xl text-ink-light font-body">Para que estés comiendo en minutos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: 'Busca tu restaurante', desc: 'Explora una amplia variedad de restaurantes cerca de ti' },
              { icon: Smartphone, title: 'Haz tu pedido', desc: 'Selecciona tus platos favoritos desde tu móvil o tablet' },
              { icon: Truck, title: 'Recibe tu pedido', desc: 'Disfruta en la mesa o recibe tu entrega a domicilio' },
            ].map((step, i) => (
              <div key={i} className="text-center bg-cream-50 rounded-2xl p-8 border border-cream-200 ticket-edge">
                <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <step.icon className="w-10 h-10 text-brand-600" />
                </div>
                <h3 className="font-display text-xl font-semibold text-ink mb-4">{step.title}</h3>
                <p className="text-ink-light font-body">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="restaurantes" className="py-20 bg-cream-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-eyebrow">Nuestros restaurantes</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-4">Destacados</h2>
            <p className="text-xl text-ink-light font-body">Descubre los mejores lugares para comer</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Pizza Bella', type: 'Italiana', rating: 4.8, time: '25-35 min' },
              { name: 'Burger House', type: 'Americana', rating: 4.6, time: '15-25 min' },
              { name: 'Sushi Master', type: 'Japonesa', rating: 4.9, time: '30-40 min' },
              { name: 'Taco Loco', type: 'Mexicana', rating: 4.7, time: '20-30 min' },
            ].map((restaurant, index) => (
              <div key={index} className="bg-cream-50 rounded-xl shadow-md border border-cream-200 overflow-hidden hover:shadow-lg transition-shadow ticket">
                <div className="h-48 bg-cream-200 flex items-center justify-center">
                  <Utensils className="w-12 h-12 text-brand-400" />
                </div>
                <div className="p-4">
                  <h3 className="font-display font-semibold text-ink mb-1">{restaurant.name}</h3>
                  <p className="text-sm text-ink-light mb-2 font-body">{restaurant.type}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-gold-500 font-medium">★</span>
                      <span className="text-sm font-body font-medium text-ink ml-1">{restaurant.rating}</span>
                    </div>
                    <div className="flex items-center text-sm text-ink-light font-body">
                      <span className="mr-1">⏱</span>
                      {restaurant.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/client">
              <button className="bg-brand-600 text-cream-50 px-8 py-3 rounded-lg font-body font-semibold hover:bg-brand-700 transition-colors">
                Ver todos los restaurantes
              </button>
            </Link>
          </div>
        </div>
      </section>

      <section id="registrar-negocio" className="py-20 bg-brand-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <Utensils className="w-8 h-8 text-cream-50" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-cream-50 mb-4">
            ¿Tienes un negocio?
          </h2>
          <p className="text-lg text-brand-100 mb-8 max-w-2xl mx-auto font-body">
            Lleva tu menú digital, recibe pedidos y gestiona tu equipo desde un solo lugar.
            Regístrate gratis y empieza hoy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="w-full sm:w-auto bg-cream-50 text-brand-600 px-8 py-4 rounded-lg text-lg font-body font-semibold hover:bg-cream-100 transition-colors">
                Registrar mi Negocio
              </button>
            </Link>
            <Link href="/login">
              <button className="w-full sm:w-auto border-2 border-cream-300 text-cream-50 px-8 py-4 rounded-lg text-lg font-body font-semibold hover:bg-cream-100/10 transition-colors">
                Ya tengo cuenta
              </button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-ink text-cream-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Ticket className="w-6 h-6 text-gold-500 mr-2" />
                <span className="text-xl font-display font-bold text-cream-50">MenuGran</span>
              </div>
              <p className="text-cream-300 font-body">
                La mejor manera de pedir comida desde tu mesa.
              </p>
            </div>

            <div>
              <h3 className="font-display font-semibold mb-4 text-cream-100">Enlaces</h3>
              <ul className="space-y-2 text-cream-300 font-body">
                <li><a href="#inicio" className="hover:text-cream-50 transition-colors">Inicio</a></li>
                <li><a href="#como-funciona" className="hover:text-cream-50 transition-colors">¿Cómo funciona?</a></li>
                <li><a href="#restaurantes" className="hover:text-cream-50 transition-colors">Restaurantes</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display font-semibold mb-4 text-cream-100">Legal</h3>
              <ul className="space-y-2 text-cream-300 font-body">
                <li><a href="#" className="hover:text-cream-50 transition-colors">Términos de servicio</a></li>
                <li><a href="#" className="hover:text-cream-50 transition-colors">Política de privacidad</a></li>
                <li><a href="#" className="hover:text-cream-50 transition-colors">Cookies</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display font-semibold mb-4 text-cream-100">Contacto</h3>
              <ul className="space-y-2 text-cream-300 font-body">
                <li>📧 info@menugran.com</li>
                <li>📞 +1 (555) 123-4567</li>
                <li>📍 Ciudad, País</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-ink-light mt-8 pt-8 text-center text-cream-300 font-body">
            <p>&copy; 2026 MenuGran. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}