import { clsx } from "clsx";

interface FoodLoaderProps {
  /** Emoji o nodo (SVG/img) que se anima. */
  children: React.ReactNode;
  /** Tamaño tipográfico (Tailwind). Por defecto text-4xl. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Texto accesible para lectores de pantalla. */
  label?: string;
  /** Clases extra. */
  className?: string;
}

const sizeClass: Record<NonNullable<FoodLoaderProps["size"]>, string> = {
  sm: "text-xl",
  md: "text-4xl",
  lg: "text-6xl",
  xl: "text-8xl",
};

export function FoodLoader({
  children,
  size = "md",
  label = "Cargando",
  className,
}: FoodLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={clsx("animated-food", sizeClass[size], className)}
    >
      {children}
    </div>
  );
}

/** Skeleton de tarjeta de restaurante mientras carga el listado. */
export function VendorCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando restaurante"
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft"
    >
      <div className="flex items-center gap-4">
        <div className="animated-food flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100">
          <span className="text-3xl" aria-hidden>🍽️</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
