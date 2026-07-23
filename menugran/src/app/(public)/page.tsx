import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUtensils,
  faMagnifyingGlass,
  faMobileScreen,
  faTruck,
  faStar,
  faClock,
  faStore,
  faEnvelope,
  faPhone,
  faLocationDot,
  faChevronRight,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';

const restaurants = [
  { name: 'Pizza Bella', type: 'Italiana', rating: 4.8, time: '25-35 min' },
  { name: 'Burger House', type: 'Americana', rating: 4.6, time: '15-25 min' },
  { name: 'Sushi Master', type: 'Japonesa', rating: 4.9, time: '30-40 min' },
  { name: 'Taco Loco', type: 'Mexicana', rating: 4.7, time: '20-30 min' },
];

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-50 safe-area-top animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center">
                <FontAwesomeIcon icon={faUtensils} className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-ink">MenuGran</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#inicio" className="text-sm font-medium text-ink-light hover:text-brand-500 transition-colors">Inicio</a>
              <a href="#como-funciona" className="text-sm font-medium text-ink-light hover:text-brand-500 transition-colors">Cómo funciona</a>
              <a href="#restaurantes" className="text-sm font-medium text-ink-light hover:text-brand-500 transition-colors">Restaurantes</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-ink-light hover:text-ink transition-colors px-4 py-2"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 px-5 py-2.5 rounded-lg transition-colors shadow-soft"
              >
                Registrarme
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="inicio" className="relative overflow-hidden animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              Pedidos en tiempo real
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-ink leading-tight mb-6">
              Pide desde tu mesa,{' '}
              <span className="text-brand-500">sin esperar</span>
            </h1>
            <p className="text-lg md:text-xl text-ink-light max-w-2xl mx-auto mb-10 leading-relaxed">
              Menú digital, pedidos al instante y seguimiento de tu entrega en tiempo real.
              Fácil para ti, rápido para tu negocio.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="#restaurantes"
                className="inline-flex items-center gap-2 bg-brand-500 text-white font-semibold px-8 py-3.5 rounded-xl text-lg hover:bg-brand-600 transition-all shadow-elevated hover:shadow-popover active:scale-[0.98]"
              >
                Buscar restaurantes
                <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 bg-white text-ink font-medium px-8 py-3.5 rounded-xl text-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all shadow-soft"
              >
                Ver cómo funciona
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-20 bg-white animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-brand-500 uppercase tracking-wider">Simple</span>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mt-2 mb-4">
              Pedir comida nunca fue tan fácil
            </h2>
            <p className="text-lg text-ink-light max-w-xl mx-auto">
              Tres pasos y ya estás disfrutando. Sin vueltas, sin complicaciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: faMagnifyingGlass,
                step: '01',
                title: 'Busca tu restaurante',
                desc: 'Explora los mejores restaurantes cerca de ti. Filtra por tipo de comida, precio o distancia.',
              },
              {
                icon: faMobileScreen,
                step: '02',
                title: 'Haz tu pedido',
                desc: 'Elige tus platos favoritos desde el menú digital. Personaliza a tu gusto y pide al instante.',
              },
              {
                icon: faTruck,
                step: '03',
                title: 'Recibe o disfruta',
                desc: 'Sigue tu pedido en tiempo real. Recíbelo en casa o disfruta en la mesa sin esperar.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-100 transition-colors">
                  <FontAwesomeIcon icon={item.icon} className="w-7 h-7 text-brand-500" />
                </div>
                <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">{item.step}</span>
                <h3 className="text-xl font-bold text-ink mt-2 mb-3">{item.title}</h3>
                <p className="text-ink-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-20 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-brand-500 uppercase tracking-wider">Ventajas</span>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mt-2 mb-4">
              ¿Por qué MenuGran?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: faMobileScreen, title: 'Sin apps extra', desc: 'Funciona desde el navegador. No ocupa espacio en tu celular.' },
              { icon: faClock, title: 'Pedidos al instante', desc: 'Tu pedido llega directo a la cocina. Sin llamadas ni demoras.' },
              { icon: faTruck, title: 'Seguimiento GPS', desc: 'Mira en tiempo real dónde está tu entrega.' },
              { icon: faStar, title: 'Fácil para todos', desc: 'Diseñado para que cualquiera lo use, sin complicaciones.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl border border-neutral-200 p-6 shadow-soft hover:shadow-elevated transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                  <FontAwesomeIcon icon={item.icon} className="w-5 h-5 text-brand-500" />
                </div>
                <h3 className="font-bold text-ink mb-2">{item.title}</h3>
                <p className="text-sm text-ink-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Restaurantes destacados */}
      <section id="restaurantes" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-sm font-semibold text-brand-500 uppercase tracking-wider">Descubre</span>
              <h2 className="text-3xl md:text-4xl font-bold text-ink mt-2">
                Restaurantes destacados
              </h2>
            </div>
            <Link
              href="/client"
              className="inline-flex items-center gap-2 text-brand-500 font-semibold text-sm hover:text-brand-600 transition-colors"
            >
              Ver todos
              <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {restaurants.map((r, i) => (
              <div key={i} className="group bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-elevated transition-all duration-200">
                <div className="h-44 bg-gradient-to-br from-brand-100 to-gold-100 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center shadow-soft">
                    <FontAwesomeIcon icon={faStore} className="text-2xl text-brand-500" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-ink group-hover:text-brand-500 transition-colors">{r.name}</h3>
                  <p className="text-sm text-ink-light mt-0.5">{r.type}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
                    <div className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faStar} className="w-3.5 h-3.5 text-gold-500" />
                      <span className="text-sm font-semibold text-ink">{r.rating}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-ink-light">
                      <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5" />
                      {r.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/client"
              className="inline-flex items-center gap-2 bg-brand-500 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-brand-600 transition-all shadow-soft hover:shadow-elevated active:scale-[0.98]"
            >
              Ver todos los restaurantes
              <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 bg-brand-500">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Tienes un restaurante?
          </h2>
          <p className="text-lg text-brand-100 mb-10 max-w-lg mx-auto">
            Únete a MenuGran y llega a más clientes. Sin contratos largos, sin complicaciones.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-brand-600 font-semibold px-8 py-3.5 rounded-xl text-lg hover:bg-brand-50 transition-all shadow-elevated active:scale-[0.98]"
          >
            Quiero registrar mi negocio
            <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-neutral-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                  <FontAwesomeIcon icon={faUtensils} className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">MenuGran</span>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                La forma más fácil de pedir comida, desde tu mesa o a domicilio.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Enlaces</h3>
              <ul className="space-y-3">
                <li><a href="#inicio" className="text-sm text-neutral-400 hover:text-white transition-colors">Inicio</a></li>
                <li><a href="#como-funciona" className="text-sm text-neutral-400 hover:text-white transition-colors">Cómo funciona</a></li>
                <li><a href="#restaurantes" className="text-sm text-neutral-400 hover:text-white transition-colors">Restaurantes</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Legal</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">Términos de servicio</a></li>
                <li><a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">Privacidad</a></li>
                <li><a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Contacto</h3>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 text-neutral-500" />
                  info@menugran.com
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faPhone} className="w-4 h-4 text-neutral-500" />
                  +1 (555) 123-4567
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faLocationDot} className="w-4 h-4 text-neutral-500" />
                  Ciudad, País
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-700 mt-12 pt-8 text-center text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} MenuGran. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
