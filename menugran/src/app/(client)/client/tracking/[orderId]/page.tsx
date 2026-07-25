'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Phone, MessageSquare, ShieldCheck, Clock, Navigation, AlertTriangle, Bike } from 'lucide-react';

// Tipos locales
interface Order {
  id: string;
  restaurantName: string;
  restaurantCoords: [number, number];
  clientAddress: string;
  clientCoords: [number, number];
  status: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivering' | 'delivered';
  total: number;
  itemsCount: number;
  rider?: {
    name: string;
    phone: string;
    vehicle: string;
    photo: string;
    rating: number;
  };
}

// Datos simulados de pedidos para tracking
const sampleOrdersForTracking: Record<string, Order> = {
  'o1': {
    id: 'o1',
    restaurantName: 'La Parrilla de Juan',
    restaurantCoords: [4.7110, -74.0721], // Coordenadas en Bogotá
    clientAddress: 'Calle 100 #15-30, Bogotá',
    clientCoords: [4.6830, -74.0480],
    status: 'cooking',
    total: 68500,
    itemsCount: 3,
    rider: {
      name: 'Carlos Rodríguez',
      phone: '+57 312 345 6789',
      vehicle: 'Moto Auteco Pulsar (Negra - ABC-123)',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      rating: 4.8,
    }
  },
  'o2': {
    id: 'o2',
    restaurantName: 'Sushi Maki House',
    restaurantCoords: [4.6980, -74.0550],
    clientAddress: 'Carrera 15 #85-10, Bogotá',
    clientCoords: [4.6680, -74.0520],
    status: 'delivering',
    total: 98200,
    itemsCount: 4,
    rider: {
      name: 'Andrés Felipe',
      phone: '+57 320 987 6543',
      vehicle: 'Bicicleta Trek (Azul)',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      rating: 4.9,
    }
  },
  'o5': {
    id: 'o5',
    restaurantName: 'Crepes del Sol',
    restaurantCoords: [4.6550, -74.0600],
    clientAddress: 'Calle 72 #9-45, Bogotá',
    clientCoords: [4.6580, -74.0560],
    status: 'ready',
    total: 38200,
    itemsCount: 1,
    rider: {
      name: 'Brayan Sneider',
      phone: '+57 311 222 3344',
      vehicle: 'Moto Suzuki AX4 (Azul - XYZ-789)',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      rating: 4.7,
    }
  }
};

const statusSteps = [
  { id: 'confirmed', label: 'Confirmado', description: 'El restaurante aceptó tu pedido' },
  { id: 'cooking', label: 'En Cocina', description: 'Preparando tus deliciosos platos' },
  { id: 'ready', label: 'Listo para Entrega', description: 'Empacado y esperando al repartidor' },
  { id: 'delivering', label: 'En camino', description: 'Tu repartidor va hacia tu ubicación' },
  { id: 'delivered', label: 'Entregado', description: '¡Buen provecho!' }
];

export default function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const { orderId } = params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riderCoords, setRiderCoords] = useState<[number, number] | null>(null);
  const [eta, setEta] = useState<number>(15); // Tiempo estimado en minutos
  const [simulationStep, setSimulationStep] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);

  // Cargar el pedido
  useEffect(() => {
    const fetchedOrder = sampleOrdersForTracking[orderId];
    if (fetchedOrder) {
      setOrder(fetchedOrder);
      // Iniciar coordenadas del repartidor en el restaurante si está cocinando/listo, o a mitad de camino si está entregando
      if (fetchedOrder.status === 'delivering') {
        // Un punto intermedio de simulación
        setRiderCoords([
          (fetchedOrder.restaurantCoords[0] + fetchedOrder.clientCoords[0]) / 2,
          (fetchedOrder.restaurantCoords[1] + fetchedOrder.clientCoords[1]) / 2,
        ]);
      } else {
        setRiderCoords(fetchedOrder.restaurantCoords);
      }
    } else {
      setError('Pedido no encontrado o no tiene seguimiento activo.');
    }
    setLoading(false);
  }, [orderId]);

  // Cargar Leaflet dinámicamente en el cliente
  useEffect(() => {
    if (!order || !riderCoords || typeof window === 'undefined' || !mapContainerRef.current) return;

    let L: any;

    const initMap = async () => {
      // Importar leaflet dinámicamente para evitar problemas de SSR
      L = (await import('leaflet')).default;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Crear el mapa centrado entre restaurante y cliente
      const centerLat = (order.restaurantCoords[0] + order.clientCoords[0]) / 2;
      const centerLng = (order.restaurantCoords[1] + order.clientCoords[1]) / 2;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([centerLat, centerLng], 14);

      mapInstanceRef.current = map;

      // Añadir capa de mapa moderna (CartoDB Positron, bonita y limpia)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Iconos personalizados con HTML/CSS para evitar problemas de assets en Next.js
      const restaurantIcon = L.divIcon({
        html: `<div class="bg-red-600 text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center h-10 w-10">🏪</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const clientIcon = L.divIcon({
        html: `<div class="bg-emerald-600 text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center h-10 w-10">🏠</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const riderIcon = L.divIcon({
        html: `<div class="bg-violet-600 text-white p-2.5 rounded-full shadow-xl border-2 border-white animate-bounce flex items-center justify-center h-11 w-11"><span class="text-base">🚴</span></div>`,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      // Añadir marcadores
      L.marker(order.restaurantCoords, { icon: restaurantIcon })
        .addTo(map)
        .bindPopup(`<b>${order.restaurantName}</b><br/>Preparando tu pedido`);

      L.marker(order.clientCoords, { icon: clientIcon })
        .addTo(map)
        .bindPopup(`<b>Tu ubicación</b><br/>${order.clientAddress}`);

      const riderMarker = L.marker(riderCoords, { icon: riderIcon })
        .addTo(map)
        .bindPopup(`<b>Repartidor: ${order.rider?.name}</b><br/>En camino`);

      riderMarkerRef.current = riderMarker;

      // Dibujar línea de ruta entre restaurante y cliente
      L.polyline([order.restaurantCoords, order.clientCoords], {
        color: '#8b5cf6',
        weight: 4,
        opacity: 0.6,
        dashArray: '5, 10'
      }).addTo(map);

      // Añadir controles de zoom arriba a la derecha
      L.control.zoom({ position: 'topright' }).addTo(map);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order]);

  // Simular movimiento del repartidor en tiempo real
  useEffect(() => {
    if (!order || !riderCoords || order.status === 'delivered') return;

    const interval = setInterval(() => {
      setSimulationStep((prevStep) => {
        const nextStep = prevStep + 1;

        // Simular movimiento paso a paso (10 pasos totales)
        const totalSteps = 10;

        if (nextStep >= totalSteps) {
          // El repartidor llegó
          setOrder((prevOrder) => {
            if (!prevOrder) return null;
            return { ...prevOrder, status: 'delivered' };
          });
          setEta(0);
          clearInterval(interval);
          return totalSteps;
        }

        // Interpolar coordenadas
        const ratio = nextStep / totalSteps;
        const newLat = order.restaurantCoords[0] + (order.clientCoords[0] - order.restaurantCoords[0]) * ratio;
        const newLng = order.restaurantCoords[1] + (order.clientCoords[1] - order.restaurantCoords[1]) * ratio;
        const newCoords: [number, number] = [newLat, newLng];

        setRiderCoords(newCoords);

        // Actualizar el tiempo estimado proporcionalmente
        setEta(Math.max(1, Math.round(15 * (1 - ratio))));

        // Actualizar marcador de rider en el mapa
        if (riderMarkerRef.current && mapInstanceRef.current) {
          riderMarkerRef.current.setLatLng(newCoords);

          // Opcionalmente centrar el mapa suavemente en el rider
          mapInstanceRef.current.panTo(newCoords);
        }

        // Si es el primer paso de entrega, cambiamos estado a 'delivering'
        if (nextStep === 1) {
          setOrder((prevOrder) => {
            if (!prevOrder) return null;
            return { ...prevOrder, status: 'delivering' };
          });
        }

        return nextStep;
      });
    }, 4000); // Actualización cada 4 segundos para un efecto dinámico suave

    return () => clearInterval(interval);
  }, [order, riderCoords]);

  // Helper para clases de estados del stepper
  const getStepStatus = (stepId: string) => {
    if (!order) return 'upcoming';
    const statusOrder = ['confirmed', 'cooking', 'ready', 'delivering', 'delivered'];
    const currentIdx = statusOrder.indexOf(order.status);
    const stepIdx = statusOrder.indexOf(stepId);

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'upcoming';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600"></div>
        <p className="mt-4 text-slate-600 font-medium">Iniciando mapa en vivo...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-100 text-red-600 p-4 rounded-full mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error de Seguimiento</h2>
        <p className="text-slate-500 max-w-md mb-6">{error || 'Ha ocurrido un error inesperado.'}</p>
        <Link href="/client/orders">
          <button className="bg-red-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-red-700 shadow-lg transition-all">
            Volver a mis pedidos
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">

      {/* Barra lateral / Panel de Información */}
      <div className="w-full lg:w-[420px] bg-white shadow-xl flex flex-col z-20 overflow-y-auto max-h-screen lg:h-screen">

        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <Link href="/client/orders" className="flex items-center text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="text-sm font-semibold">Pedidos</span>
          </Link>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">Pedido #{order.id}</p>
            <p className="text-sm font-bold text-slate-900">{order.restaurantName}</p>
          </div>
        </div>

        {/* Status Card Principal */}
        <div className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-b-[2rem] shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-red-100 text-xs uppercase tracking-wider font-semibold">Estado del envío</p>
              <h2 className="text-2xl font-black mt-1">
                {order.status === 'delivered' ? '¡Entregado!' :
                 order.status === 'delivering' ? 'Repartidor en Camino' :
                 'Preparando tu pedido'}
              </h2>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Bike className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="flex gap-4 items-center bg-white/10 p-4 rounded-2xl backdrop-blur-sm mt-4">
            <Clock className="w-5 h-5 text-red-100" />
            <div>
              <p className="text-red-100 text-xs">Tiempo Estimado de Llegada</p>
              <p className="text-lg font-bold">
                {order.status === 'delivered' ? 'Entregado con éxito' : `${eta} - ${eta + 5} min`}
              </p>
            </div>
          </div>
        </div>

        {/* Repartidor Info */}
        {order.rider && (
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Tu Repartidor</h3>
            <div className="flex items-center gap-4">
              <img
                src={order.rider.photo}
                alt={order.rider.name}
                className="w-16 h-16 rounded-2xl object-cover shadow-md border border-slate-100"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 text-lg leading-tight">{order.rider.name}</p>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    ⭐ {order.rider.rating}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  {order.rider.vehicle}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <a href={`tel:${order.rider.phone}`} className="flex-1">
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  Llamar
                </button>
              </a>
              <button className="flex-1 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Mensaje
              </button>
            </div>
          </div>
        )}

        {/* Direcciones */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <div className="w-0.5 h-10 bg-slate-200"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Origen</p>
                <p className="text-sm font-bold text-slate-800">{order.restaurantName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold">Destino de Entrega</p>
                <p className="text-sm font-bold text-slate-800 leading-snug">{order.clientAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper del Pedido */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Progreso del Pedido</h3>
          <div className="relative pl-6 border-l-2 border-slate-100 ml-3 space-y-6">
            {statusSteps.map((step) => {
              const status = getStepStatus(step.id);
              return (
                <div key={step.id} className="relative">
                  {/* Dot de Estado */}
                  <span className={`absolute -left-[31px] top-0 rounded-full w-5 h-5 flex items-center justify-center border-4 ${
                    status === 'completed' ? 'bg-emerald-600 border-emerald-100' :
                    status === 'active' ? 'bg-red-600 border-red-100 animate-ping' :
                    'bg-slate-200 border-slate-100'
                  }`}>
                    {status === 'completed' && (
                      <ShieldCheck className="w-2.5 h-2.5 text-white" />
                    )}
                  </span>

                  {/* Segundo dot activo sin ping para quedar fijo */}
                  {status === 'active' && (
                    <span className="absolute -left-[31px] top-0 rounded-full w-5 h-5 bg-red-600 border-4 border-red-100 flex items-center justify-center" />
                  )}

                  <div className="pl-2">
                    <p className={`text-sm font-bold ${
                      status === 'completed' ? 'text-emerald-700' :
                      status === 'active' ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Contenedor del Mapa En Vivo */}
      <div className="flex-1 relative min-h-[400px] lg:h-screen">
        {/* Mapa Leaflet */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Flotante superior con aviso en tiempo real */}
        <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl z-20 flex items-center gap-3 border border-slate-100 max-w-sm">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <p className="text-sm font-bold text-slate-800">Ubicación del rider actualizada en vivo</p>
        </div>
      </div>

    </div>
  );
}
