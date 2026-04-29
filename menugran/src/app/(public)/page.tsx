import Link from 'next/link';
import { Utensils, Search, Smartphone, Truck, Star, Clock } from 'lucide-react';

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Utensils className="w-8 h-8 text-red-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">MenuGran</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#inicio" className="text-gray-700 hover:text-red-600 transition-colors">Inicio</a>
              <a href="#como-funciona" className="text-gray-700 hover:text-red-600 transition-colors">¿Cómo funciona?</a>
              <a href="#restaurantes" className="text-gray-700 hover:text-red-600 transition-colors">Restaurantes</a>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <button className="text-red-600 border border-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
                  Iniciar Sesión
                </button>
              </Link>
              <Link href="/auth/login">
                <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                  Registrarme
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="bg-gradient-to-br from-white to-gray-50 min-h-[70vh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Pide desde tu mesa,<br />
                <span className="text-red-600">sin apps</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl">
                Menú digital, pedidos en tiempo real y seguimiento de tu entrega
              </p>
              <Link href="#restaurantes">
                <button className="bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                  Buscar Restaurantes
                </button>
              </Link>
            </div>

            <div className="text-center lg:text-right">
              <div className="text-8xl md:text-9xl">
                🍕🍔🥗
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ¿Cómo funciona? */}
      <section id="como-funciona" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">¿Cómo funciona?</h2>
            <p className="text-xl text-gray-600">Tres pasos simples para disfrutar de tu comida</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Busca tu restaurante</h3>
              <p className="text-gray-600">Explora una amplia variedad de restaurantes cerca de ti</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Smartphone className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Haz tu pedido</h3>
              <p className="text-gray-600">Selecciona tus platos favoritos desde tu móvil o tablet</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Truck className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">3. Recibe tu pedido</h3>
              <p className="text-gray-600">Disfruta en la mesa o recibe tu entrega a domicilio</p>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurantes destacados */}
      <section id="restaurantes" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Restaurantes destacados</h2>
            <p className="text-xl text-gray-600">Descubre los mejores lugares para comer</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Pizza Bella', type: 'Italiana', rating: 4.8, time: '25-35 min' },
              { name: 'Burger House', type: 'Americana', rating: 4.6, time: '15-25 min' },
              { name: 'Sushi Master', type: 'Japonesa', rating: 4.9, time: '30-40 min' },
              { name: 'Taco Loco', type: 'Mexicana', rating: 4.7, time: '20-30 min' },
            ].map((restaurant, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-4xl">🏪</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{restaurant.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{restaurant.type}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                      <span className="text-sm font-medium">{restaurant.rating}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      {restaurant.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/client">
              <button className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors">
                Ver todos los restaurantes
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Utensils className="w-6 h-6 text-red-500 mr-2" />
                <span className="text-xl font-bold">MenuGran</span>
              </div>
              <p className="text-gray-400">
                La mejor manera de pedir comida desde tu mesa.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Enlaces</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#inicio" className="hover:text-white transition-colors">Inicio</a></li>
                <li><a href="#como-funciona" className="hover:text-white transition-colors">¿Cómo funciona?</a></li>
                <li><a href="#restaurantes" className="hover:text-white transition-colors">Restaurantes</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Términos de servicio</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Política de privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Contacto</h3>
              <ul className="space-y-2 text-gray-400">
                <li>📧 info@menugran.com</li>
                <li>📞 +1 (555) 123-4567</li>
                <li>📍 Ciudad, País</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 MenuGran. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
          </ul>
        </div>
      </section>
    </main>
  );
}
