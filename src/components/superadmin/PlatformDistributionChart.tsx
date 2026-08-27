import { useMemo, useState, type MouseEvent } from 'react';
import { Skeleton } from '../ui/Skeleton';
import type { SuperAdminMetrics } from '../../services/superAdminMetricsService';

interface ChartSegment {
  key: string;
  label: string;
  color: string;
  value: number;
}

interface TooltipState {
  activeKey: string | null;
  x: number;
  y: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeDonutSegment(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  startAngle: number,
  endAngle: number,
): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outer, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outer, endAngle);
  const innerEnd = polarToCartesian(cx, cy, inner, endAngle);
  const innerStart = polarToCartesian(cx, cy, inner, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function buildSegments(
  metrics: SuperAdminMetrics,
): ChartSegment[] {
  return [
    {
      key: 'merchants',
      label: 'Comercios registrados',
      color: '#EA002A',
      value: metrics.totalMerchants,
    },
    {
      key: 'customers',
      label: 'Usuarios registrados',
      color: '#1D4ED8',
      value: metrics.totalCustomers,
    },
    {
      key: 'orders',
      label: 'Pedidos totales',
      color: '#10B981',
      value: metrics.totalOrders,
    },
  ];
}

const CENTER_X = 50;
const CENTER_Y = 50;
const OUTER_RADIUS = 38;
const INNER_RADIUS = 22;

function DonutPath({
  segment,
  startAngle,
  endAngle,
  onMouseEnter,
  onVisibilityChange,
  isHidden,
}: {
  segment: ChartSegment;
  startAngle: number;
  endAngle: number;
  onMouseEnter: (segment: ChartSegment, event: MouseEvent<SVGPathElement>) => void;
  onVisibilityChange: (segment: ChartSegment) => void;
  isHidden: boolean;
}) {
  if (endAngle - startAngle === 0) return null;
  return (
    <path
      d={describeDonutSegment(
        CENTER_X,
        CENTER_Y,
        INNER_RADIUS,
        OUTER_RADIUS,
        startAngle,
        endAngle,
      )}
      fill={segment.color}
      fillOpacity={isHidden ? 0.25 : 1}
      stroke="white"
      strokeWidth={1.2}
      className="transition-all hover:brightness-110"
      style={{ cursor: 'pointer' }}
      role="img"
      aria-label={`${segment.label}: ${segment.value}`}
      onClick={() => onVisibilityChange(segment)}
      onMouseEnter={(event) => onMouseEnter(segment, event)}
    >
      <title>{`${segment.label}: ${segment.value}`}</title>
    </path>
  );
}

export interface PlatformDistributionChartProps {
  metrics: SuperAdminMetrics | null;
  isLoading: boolean;
}

/**
 * Gráfica de dona que muestra la distribución global de la plataforma:
 * comercios, usuarios y pedidos. Responsive, con tooltip en hover y leyenda
 * interactiva que permite ocultar/mostrar segmentos.
 */
export function PlatformDistributionChart({
  metrics,
  isLoading,
}: PlatformDistributionChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipState>({
    activeKey: null,
    x: 0,
    y: 0,
  });

  const segments = useMemo(
    () =>
      metrics === null
        ? buildSegments({ totalMerchants: 0, totalCustomers: 0, totalOrders: 0 })
        : buildSegments(metrics),
    [metrics],
  );

  const total = useMemo(
    () => segments.reduce((sum, s) => sum + s.value, 0),
    [segments],
  );

  const visibleSegments = useMemo(
    () => segments.filter((s) => !hiddenKeys.has(s.key)),
    [segments, hiddenKeys],
  );

  const visibleTotal = useMemo(
    () => visibleSegments.reduce((sum, s) => sum + s.value, 0),
    [visibleSegments],
  );

  const arcs = useMemo(() => {
    let cursor = 0;
    return visibleSegments.map((segment) => {
      const value = total === 0 ? 0 : (segment.value / total) * 360;
      if (value === 0) {
        return { segment, start: cursor, end: cursor, hasSlice: false };
      }
      const start = cursor;
      const end = cursor + value;
      cursor = end;
      return { segment, start, end, hasSlice: true };
    });
  }, [visibleSegments, total]);

  const handleMouseEnter = (
    segment: ChartSegment,
    event: MouseEvent<SVGPathElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const container = event.currentTarget
      .ownerSVGElement?.parentElement?.getBoundingClientRect();
    setTooltip({
      activeKey: segment.key,
      x: rect.left - (container?.left ?? 0) + rect.width / 2,
      y: rect.top - (container?.top ?? 0),
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ activeKey: null, x: 0, y: 0 });
  };

  const toggleVisibility = (segment: ChartSegment) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(segment.key)) next.delete(segment.key);
      else next.add(segment.key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md space-y-3" aria-label="Cargando gráfica">
        <Skeleton className="mx-auto aspect-square w-full rounded-full" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <section
      className="w-full max-w-md"
      aria-label="Distribución de la plataforma"
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative mx-auto aspect-square w-full">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          role="img"
          aria-label="Gráfica de dona distribución de la plataforma"
        >
          {arcs.map(({ segment, start, end, hasSlice }) =>
            hasSlice ? (
              <DonutPath
                key={segment.key}
                segment={segment}
                startAngle={start}
                endAngle={end}
                onMouseEnter={handleMouseEnter}
                onVisibilityChange={toggleVisibility}
                isHidden={false}
              />
            ) : null,
          )}
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={INNER_RADIUS - 1}
            fill="white"
          />
          <text
            x={CENTER_X}
            y={CENTER_Y + 2}
            textAnchor="middle"
            className="fill-slate-500 text-[9px] font-medium"
          >
            {visibleTotal}
          </text>
        </svg>

        {tooltip.activeKey !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] font-medium text-white whitespace-nowrap"
            style={{ left: `${tooltip.x}%`, top: `${tooltip.y}%` }}
            role="tooltip"
          >
            {segments.find((s) => s.key === tooltip.activeKey)?.label}
            {': '}
            {segments.find((s) => s.key === tooltip.activeKey)?.value}
          </div>
        )}
      </div>

      <ul
        className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs"
        aria-label="Leyenda interactiva"
      >
        {segments.map((segment) => {
          const isHidden = hiddenKeys.has(segment.key);
          return (
            <li key={segment.key} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleVisibility(segment)}
                aria-pressed={!isHidden}
                className="flex items-center gap-1.5 rounded px-1 py-0.5 text-slate-600 transition hover:bg-slate-100"
              >
                <span
                  className="block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color, opacity: isHidden ? 0.3 : 1 }}
                  aria-hidden="true"
                />
                <span>{segment.label}</span>
                <span
                  className={`font-semibold ${isHidden ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                >
                  {segment.value}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default PlatformDistributionChart;
