import { useMemo, useState, type MouseEvent } from 'react';
import { Skeleton } from '../ui/Skeleton';
import {
  ORDER_STATUS_GROUPS,
  type OrderStatusGroup,
  type OrderStatusTrend,
} from '../../services/superAdminOrderTrendsService';

export interface OrdersStatusChartProps {
  data: OrderStatusTrend[];
  isLoading: boolean;
  error?: string | null;
}

const WIDTH = 720;
const HEIGHT = 320;
const M = { left: 56, right: 20, top: 28, bottom: 58 };
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

function GroupGridlines({ maxY }: { maxY: number }) {
  const steps = 5;
  return (
    <g className="stroke-slate-100" strokeDasharray="2 2">
      {Array.from({ length: steps }).map((_, i) => {
        const y = plotTop + (i / (steps - 1)) * plotHeight;
        const value = Math.round(maxY * (1 - i / (steps - 1)));
        return (
          <g key={i} transform={`translate(0, ${y})`}>
            <line x1={plotLeft} x2={plotRight} y1={y} y2={y} />
            <text
              x={plotLeft - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
            >
              {value}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function GroupXAxis({ data }: { data: OrderStatusTrend[] }) {
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
      aria-label="Cargando gráfica de estados de pedido"
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

interface BarGeometry {
  groupStart: number;
  groupWidth: number;
  barWidth: number;
}

function useBarGeometry(n: number): BarGeometry {
  return useMemo<BarGeometry>(() => {
    if (n === 0) return { groupStart: 0, groupWidth: 0, barWidth: 0 };
    const groupWidth = plotWidth / n;
    const barGroupGap = groupWidth * 0.1;
    const barArea = groupWidth - barGroupGap * 2;
    const barWidth = barArea / ORDER_STATUS_GROUPS.length;
    return { groupStart: barGroupGap, groupWidth, barWidth };
  }, [n]);
}

function useMaxCount(data: OrderStatusTrend[]): number {
  return useMemo(() => {
    let max = 0;
    for (const point of data) {
      for (const group of ORDER_STATUS_GROUPS) {
        max = Math.max(max, point.counts[group.key]);
      }
    }
    return max > 0 ? max : 1;
  }, [data]);
}

function barY(count: number, maxCount: number): number {
  return plotBottom - (count / maxCount) * plotHeight;
}

/** Convierte coordenadas del viewBox a porcentajes del contenedor padre. */
function toPercent(x: number, y: number): { left: string; top: string } {
  return { left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` };
}

const legend: { key: OrderStatusGroup; label: string; color: string }[] =
  ORDER_STATUS_GROUPS.map((g) => ({ key: g.key, label: g.label, color: g.color }));

/**
 * Gráfica de barras (SVG puro) agrupada por día y desglosada por estado de
 * pedido (Entregado, En proceso, Cancelado). Incluye gridlines, ejes, tooltips
 * en hover y leyenda interactiva. Estilo minimalista tipo dashboard de analytics.
 */
export function OrdersStatusChart({ data, isLoading, error }: OrdersStatusChartProps) {
  const n = data.length;
  const maxCount = useMaxCount(data);
  const [hovered, setHovered] = useState<{ day: number; group: number } | null>(null);
  const { groupStart, groupWidth, barWidth } = useBarGeometry(n);

  if (isLoading) return <ChartSkeleton />;
  if (error !== null && error !== undefined) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }
  if (data.length === 0) return <EmptyState />;

  const handleMouseEnter = (day: number, group: number) => (e: MouseEvent<SVGRectElement>) => {
    void e;
    setHovered({ day, group });
  };
  const handleMouseLeave = () => setHovered(null);

  return (
    <section
      className="relative w-full"
      aria-label="Estados de pedido por día"
      onMouseLeave={handleMouseLeave}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Pedidos por estado y día"
      >
        <GroupGridlines maxY={maxCount} />
        <GroupXAxis data={data} />
        {data.map((point, day) => {
          const groupLeft = plotLeft + day * groupWidth;
          return ORDER_STATUS_GROUPS.map((group, gi) => {
            const count = point.counts[group.key];
            const barX = groupLeft + groupStart + gi * barWidth;
            const top = barY(count, maxCount);
            const height = plotBottom - top;
            const active = hovered?.day === day && hovered?.group === gi;
            return (
              <g key={`${point.date}-${group.key}`}>
                <rect
                  x={barX}
                  y={top}
                  width={barWidth}
                  height={height}
                  rx={2}
                  fill={group.color}
                  fillOpacity={active ? 1 : 0.85}
                  stroke="#ffffff"
                  strokeWidth={1}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={handleMouseEnter(day, gi)}
                  onMouseLeave={handleMouseLeave}
                >
                  <title>{`${group.label}: ${count} pedidos el ${point.date}`}</title>
                </rect>
              </g>
            );
          });
        })}
      </svg>

      <ul
        className="mt-4 flex w-full justify-center gap-x-6 gap-y-2 text-xs"
        aria-label="Leyenda de estados"
      >
        {legend.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span
              className="block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-slate-600">{item.label}</span>
          </li>
        ))}
      </ul>

      {hovered !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] font-medium text-white whitespace-nowrap"
          style={toPercent(
            plotLeft + hovered.day * groupWidth + groupStart + (hovered.group + 0.5) * barWidth,
            barY(data[hovered.day].counts[ORDER_STATUS_GROUPS[hovered.group].key], maxCount),
          )}
          role="tooltip"
        >
          {`${ORDER_STATUS_GROUPS[hovered.group].label}: ${data[hovered.day].counts[ORDER_STATUS_GROUPS[hovered.group].key]}`}
        </div>
      )}
    </section>
  );
}

export default OrdersStatusChart;
