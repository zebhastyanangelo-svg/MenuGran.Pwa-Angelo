import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useEffect, useState, type CSSProperties } from "react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OrderTimeIndicatorProps {
  /** Tiempo estimado en minutos */
  estimatedMinutes: number;
  /** Estado actual del pedido */
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered';
  /** Tiempo transcurrido en minutos (opcional) */
  elapsedMinutes?: number;
  /** Tamaño del indicador */
  size?: 'sm' | 'md' | 'lg';
  /** Mostrar texto descriptivo */
  showLabel?: boolean;
}

export const OrderTimeIndicator: React.FC<OrderTimeIndicatorProps> = ({
  estimatedMinutes,
  status,
  elapsedMinutes,
  size = 'md',
  showLabel = true,
}) => {
  const [progress, setProgress] = useState(0);
  const [pulsing, setPulsing] = useState(false);

  // Calcular progreso basado en estado y tiempo
  useEffect(() => {
    let targetProgress = 0;
    let shouldPulse = false;

    switch (status) {
      case 'pending':
        targetProgress = Math.min((elapsedMinutes || 0) / estimatedMinutes, 0.9);
        shouldPulse = false;
        break;
      case 'preparing':
        targetProgress = Math.min((elapsedMinutes || 0) / estimatedMinutes, 0.9);
        shouldPulse = true;
        break;
      case 'ready':
        targetProgress = 1.0;
        shouldPulse = false;
        break;
      case 'delivering':
        targetProgress = 1.0;
        shouldPulse = false;
        break;
      case 'delivered':
        targetProgress = 1.0;
        shouldPulse = false;
        break;
    }

    setProgress(targetProgress);
    setPulsing(shouldPulse);
  }, [estimatedMinutes, status, elapsedMinutes]);

  // Determinar color basado en estado y progreso
  const getIndicatorColor = () => {
    if (status === 'delivered') return 'success-500';
    if (status === 'ready') return 'success-400';
    if (status === 'preparing') {
      if (progress >= 0.9) return 'gold-400';
      if (progress >= 0.5) return 'gold-500';
      return 'gold-600';
    }
    if (status === 'pending') {
      if (progress >= 0.8) return 'brand-500';
      if (progress >= 0.5) return 'brand-600';
      return 'brand-700';
    }
    return 'neutral-400';
  };

  // Determinar texto descriptivo
  const getLabelText = () => {
    switch (status) {
      case 'pending':
        return `Listo en ~${estimatedMinutes} min`;
      case 'preparing':
        return elapsedMinutes ? 
          `Preparando... ${estimatedMinutes - (elapsedMinutes || 0)} min` : 
          'Preparando...';
      case 'ready':
        return 'Listo para servir';
      case 'delivering':
        return 'En camino';
      case 'delivered':
        return 'Entregado';
      default:
        return '';
    }
  };

  // Determinar icono basado en estado
  const getIcon = () => {
    switch (status) {
      case 'pending': return '⏳';
      case 'preparing': return '👨‍🍳';
      case 'ready': return '✅';
      case 'delivering': return '🚴‍♂️';
      case 'delivered': return '🎉';
      default: return '•';
    }
  };

  const sizeConfig: Record<string, { width: number; height: number; fontSize: string }> = {
    sm: { width: 8, height: 8, fontSize: 'text-sm' },
    md: { width: 10, height: 10, fontSize: 'text-base' },
    lg: { width: 12, height: 12, fontSize: 'text-lg' },
  };

  const { width, height, fontSize } = sizeConfig[size];

// Tailwind v3 permite CSS vars custom via `--x` en el objeto de estilos;
// CSSProperties no las tipa, por eso el cast.
const withCssVars = (vars: Record<string, string>) => vars as CSSProperties;

  return (
    <div className={cn(
      "flex items-center space-x-2",
      sizeConfig[size].fontSize,
      "font-display"
    )}>
      <div className={cn(
        "relative flex h-[var(--size)] w-[var(--size)] items-center justify-center",
        "rounded-full",
        pulsing ? "animate-prep-pulse" : "",
        "transition-all duration-300"
      )} style={withCssVars({ '--size': `${width}px` })}>
        <div className={cn(
          "absolute inset-0",
          "rounded-full",
          "bg-[var(--color)]",
          "opacity-20"
        )} style={withCssVars({ '--color': `hsl(var(--${getIndicatorColor()}))` })}></div>
        
        <div className={cn(
          "absolute inset-0",
          "rounded-full",
          "bg-[var(--color)]",
          "opacity-100",
          "transition-all duration-500"
        )} style={withCssVars({
          '--color': `hsl(var(--${getIndicatorColor()}))`,
          '--progress': `${progress * 100}%`
        })}>
          <div className="absolute inset-0 rounded-full" 
            style={{
              background: `conic-gradient(
                from -90deg at 50% 50%, 
                hsl(var(--${getIndicatorColor()})) 0%, 
                hsl(var(--${getIndicatorColor()})) ${progress * 100}%,
                transparent ${progress * 100}% 
              )`
            }}></div>
        </div>
        
        <div className={cn(
          "flex h-[var(--size)] w-[var(--size)] items-center justify-center",
          "text-[var(--size)] font-bold"
        )} style={withCssVars({ '--size': `${width}px` })}>
          {getIcon()}
        </div>
      </div>
      
      {showLabel && (
        <div className="flex-1 min-w-0">
          <p className={cn(
            "block truncate",
            "font-body",
            "text-neutral-700"
          )}>
            {getLabelText()}
          </p>
          {status === 'preparing' || status === 'pending' && (
            <div className="w-full h-1 mt-0.5 rounded bg-neutral-200">
              <div className={cn(
                "h-1 rounded bg-[var(--color)] transition-all duration-500",
                pulsing ? "animate-prep-pulse" : ""
              )} style={withCssVars({
                '--color': `hsl(var(--${getIndicatorColor()}))`,
                'width': `${progress * 100}%`
              })}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
