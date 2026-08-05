'use client';

import { useEffect, useRef, useState } from 'react';

const FOOD_ITEMS = [
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🍔', label: 'Burger' },
  { emoji: '🌭', label: 'Hot Dog' },
  { emoji: '🌮', label: 'Taco' },
  { emoji: '🍟', label: 'Fries' },
  { emoji: '🍩', label: 'Donut' },
];

const ITEM_COUNT = FOOD_ITEMS.length;
const ORBIT_RADIUS = 120;
const CAROUSEL_SIZE = 320;

export default function FoodOrbitCarousel({ className = '', prefersReducedMotion = false }) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || prefersReducedMotion) {
    return (
      <div
        ref={containerRef}
        className={`relative w-[320px] h-[320px] mx-auto sm:w-[360px] sm:h-[360px] ${className}`}
        aria-hidden="true"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border-[8px] border-dashed border-brand-300 bg-cream-100 flex items-center justify-center">
            <span className="text-5xl">🍽️</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-[${CAROUSEL_SIZE}px] h-[${CAROUSEL_SIZE}px] mx-auto sm:w-[360px] sm:h-[360px] ${className}`}
      role="img"
      aria-label="Carousel de alimentos girando: Pizza, Burger, Hot Dog, Taco, Fries, Donut"
    >
      <style jsx>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes counter-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .orbit-ring {
          animation: orbit 16s linear infinite;
          transform-origin: center;
        }
        .food-item {
          animation: counter-rotate 16s linear infinite;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .orbit-ring,
          .food-item {
            animation: none;
          }
        }
      `}</style>

      <div className="orbit-ring absolute inset-0 flex items-center justify-center">
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${CAROUSEL_SIZE} ${CAROUSEL_SIZE}`}
          aria-hidden="true"
        >
          <circle
            cx={CAROUSEL_SIZE / 2}
            cy={CAROUSEL_SIZE / 2}
            r={ORBIT_RADIUS}
            fill="none"
            stroke="#F4E3C3"
            strokeWidth="8"
            strokeDasharray="24 16"
            strokeLinecap="round"
          />
        </svg>

        {FOOD_ITEMS.map((item, index) => {
          const angle = (index / ITEM_COUNT) * 360;
          const radians = (angle * Math.PI) / 180;
          const x = CAROUSEL_SIZE / 2 + ORBIT_RADIUS * Math.cos(radians) - 28;
          const y = CAROUSEL_SIZE / 2 + ORBIT_RADIUS * Math.sin(radians) - 28;

          return (
            <div
              key={item.emoji}
              className="food-item absolute flex flex-col items-center"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: `rotate(${angle}deg)`,
              }}
            >
              <span
                className="text-4xl sm:text-5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
                role="img"
                aria-label={item.label}
              >
                {item.emoji}
              </span>
              <span className="text-[10px] font-body font-medium text-ink/60 mt-1 whitespace-nowrap -translate-x-1/2 left-1/2 absolute">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-20 h-20 rounded-full bg-cream-100/80 backdrop-blur-sm border border-cream-200 flex items-center justify-center">
          <span className="text-3xl">🍽️</span>
        </div>
      </div>
    </div>
  );
}