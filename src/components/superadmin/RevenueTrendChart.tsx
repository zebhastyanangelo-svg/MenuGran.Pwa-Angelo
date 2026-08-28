import { useMemo, useState, type MouseEvent } from 'react';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency } from '../../utils/format';
import type { RevenueTrendPoint } from '../../services/superAdminOrderTrendsService';

export interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
  isLoading: boolean;
  error?: string | null;
}

const WIDTH = 720;
const HEIGHT = 320;
const M = { left: 56, right: 20, top: 28, bottom: 48 };
const plotLeft = M.left;
const plotRight = WIDTH - M.right;
const plotTop = M.top;
const plotBottom = HEIGHT - M.bottom;
const plotWidth = plotRight - plotLeft;
const plotHeight = plotBottom - plotTop;

function xPosition(i: number, n: number): number {
  if (n <= 1) return plotLeft + plotWidth / 2;
  return plotLeft + (i / (n - 1)) * plotWidth;
}

function yPosition(value: number, maxY: number): number {
  const safeMax = maxY > 0 ? maxY : 1;
  return plotTop + (1 - value / safeMax) * plotHeight;
}

function buildLinePath(points: RevenueTrendPoint[], max: number): string {
  if (points.length === 0) return '';
  const n = points.length;
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPosition(i, n)} ${yPosition(p.revenue, max)}`)
    .join(' ');
}

function buildAreaPath(points: RevenueTrendPoint[], max: number): string {
  if (points.length === 0) return '';
  const n = points.length;
  const line = buildLinePath(points, max);
  const firstX = xPosition(0, n);
  const lastX = xPosition(n - 1, n);
  return `${line} L ${lastX} ${plotBottom} L ${firstX} ${plotBottom} Z`;
}

function Gridlines({ maxY }: { maxY: number }) {
  const steps = 5;
  return (
    <g className="stroke-slate-100" strokeDasharray="2 2">
      {Array.from({ length: steps }).map((_, i) => {
        const y = plotTop + (i / (steps - 1)) * plotHeight;
        const value = maxY * (1 - i / (steps - 1));
        return (
          <g key={i} transform={`translate(0, ${y})`}>
            <line x1={plotLeft} x2={plotRight} y1={y} y2={y} />
            <text
              x={plotLeft - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
            >
              {formatCurrency(value)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function XAxis({ data }: { data: RevenueTrendPoint[] }) {
  const n = data.length;
  if (n === 0) return null;
  const step = Math.max(1, Math.floor(n / 6));
  const indices: number[] = [0];
  for (let i = 0; i < n; i += step) {
    if (!indices.includes(i)) indices.push(i);
  }
  if (!indices.includes(n - 1)) indices.push(n - 1);
  return (
    <g className="fill-slate-400 text-[10px]">
      {indices.map((i) => {
        const d = data[i].date;
        const label = `${d.slice(8, 10)}/${d.slice(5, 7)}`;
        return (
          <text key={i} x={xPosition(i, n)} y={plotBottom + 16} textAnchor="middle">
            {label}
          </text>
        );
      })}
    </g>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="space-y-3"
      aria-label="Cargando gráfica de tendencias de ingresos"
      role="status"
    >
      <Skeleton className="aspect-[2.25] w-full rounded-lg" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

function EmptyState() {
  return (
    <p className="py-6 text-center text-sm text-slate-500" role="status">
      Sin pedidos en los últimos 30 días.
    </p>
  );
}

function useScales(data: RevenueTrendPoint[]) {
  return useMemo(() => {
    const max = data.reduce((acc, p) => Math.max(acc, p.revenue), 0);
    return { max };
  }, [data]);
}

/** Convierte coordenadas del viewBox a porcentajes del contenedor padre. */
function toPercent(x: number, y: number): { left: string; top: string } {
  return { left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` };
}

/**
 * Gráfica de línea y área (SVG puro) que muestra el ingreso total ($) por día
 * de los últimos N días. Incluye ejes, gridlines tenues, tooltip en hover y
 * estado de carga con esqueleto. Estilo minimalista tipo dashboard de analytics.
 */
export function RevenueTrendChart({ data, isLoading, error }: RevenueTrendChartProps) {
  const { max } = useScales(data);
  const [hovered, setHovered] = useState<number | null>(null);

  if (isLoading) return <ChartSkeleton />;
  if (error !== null && error !== undefined) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }
  if (data.length === 0) return <EmptyState />;

  const n = data.length;
  const linePath = buildLinePath(data, max);
  const areaPath = buildAreaPath(data, max);

  const handleMouseEnter = (i: number) => (event: MouseEvent<SVGCircleElement>) => {
    void event;
    setHovered(i);
  };
  const handleMouseLeave = () => setHovered(null);

  return (
    <section
      className="relative w-full"
      aria-label="Tendencia de ingresos"
      onMouseLeave={handleMouseLeave}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Tendencia de ingresos diarios"
      >
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#EA002A" stopOpacity={0.18} />
            <stop offset="1" stopColor="#EA002A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Gridlines maxY={max} />
        <path d={areaPath} fill="url(#revenue-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#EA002A"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <XAxis data={data} />
        {data.map((point, i) => {
          const cx = xPosition(i, n);
          const cy = yPosition(point.revenue, max);
          const active = hovered === i;
          const r = active ? 5 : 4;
          const dotColor = active ? '#7F1D1D' : '#EA002A';
          return (
            <g key={point.date}>
              {active && (
                <line
                  x1={cx}
                  y1={plotTop}
                  x2={cx}
                  y2={plotBottom}
                  stroke="#9CA3AF"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={dotColor}
                stroke="#ffffff"
                strokeWidth={1.5}
                className="cursor-pointer"
                onMouseEnter={handleMouseEnter(i)}
                onMouseLeave={handleMouseLeave}
              >
                <title>{`Ingresos ${point.date}: ${formatCurrency(point.revenue)}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      {hovered !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] font-medium text-white whitespace-nowrap"
          style={toPercent(
            xPosition(hovered, n),
            yPosition(data[hovered].revenue, max),
          )}
          role="tooltip"
        >
          {formatCurrency(data[hovered].revenue)}
        </div>
      )}
    </section>
  );
}

export default RevenueTrendChart;
