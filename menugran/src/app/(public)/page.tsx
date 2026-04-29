import Header from '@/components/shared/Header';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <Header 
        title="MenuGran" 
        subtitle="Pide comida deliciosa, recibe en tu puerta"
      />
      
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cliente */}
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              👤 Soy Cliente
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Pide comida deliciosa y recibe en tu casa
            </p>
            <Link href="/login" className="inline-block">
              <Button>Comenzar</Button>
            </Link>
          </div>

          {/* Operador */}
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              👨‍🍳 Soy Operador
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Gestiona los pedidos de la cocina en tiempo real
            </p>
            <Link href="/login" className="inline-block">
              <Button>Ingresar</Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 p-8 bg-primary-50 dark:bg-primary-950 rounded-lg">
          <h3 className="text-lg font-bold text-primary-900 dark:text-primary-50 mb-2">
            ✨ Características
          </h3>
          <ul className="space-y-2 text-primary-800 dark:text-primary-100">
            <li>✅ Aplicación offline con Service Worker</li>
            <li>✅ Instalable en iOS y Android</li>
            <li>✅ Geolocalización en tiempo real</li>
            <li>✅ Múltiples roles de usuario</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
