'use client';

import { useEffect, useState } from 'react';
import styles from './FoodOrbitCarousel.module.css';

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

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || prefersReducedMotion) {
    return (
      <div className={`${styles.container} ${className}`} aria-hidden="true">
        <div className={styles.fallback}>
          <span className="text-5xl">🍽️</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.container} ${className}`}
      role="img"
      aria-label="Carousel de alimentos girando: Pizza, Burger, Hot Dog, Taco, Fries, Donut"
    >
      <div className={styles.orbitRing}>
        <svg className={styles.orbitSvg} viewBox={`0 0 ${CAROUSEL_SIZE} ${CAROUSEL_SIZE}`} aria-hidden="true">
          <circle
            cx={CAROUSEL_SIZE / 2}
            cy={CAROUSEL_SIZE / 2}
            r={ORBIT_RADIUS}
            fill="none"
            stroke="var(--color-cream-200)"
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
              className={styles.foodItem}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: `rotate(${angle}deg)`,
              } as React.CSSProperties}
            >
              <span className={styles.foodEmoji} role="img" aria-label={item.label}>
                {item.emoji}
              </span>
              <span className={styles.foodLabel}>{item.label}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.centerPlate}>
        <span className="text-3xl">🍽️</span>
      </div>
    </div>
  );
}