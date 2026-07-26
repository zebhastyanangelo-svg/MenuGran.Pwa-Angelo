# Analytics Dashboard Page — Design Spec

## Overview
Replace the hardcoded mock-data analytics page with a real-data dashboard featuring Recharts visualizations and a date-range filter.

## Layout
1. **Date Range Selector** — top bar with two `<input type="date">` elements (from, to) and an "Apply" button
2. **4 Metric Cards** — Revenue, Orders, Average Order Value, Active Restaurants, each with a trend indicator (green up / red down vs previous period)
3. **Revenue Over Time** — `<AreaChart>` with toggle between Revenue and Orders views
4. **Payment Methods** — `<PieChart>` showing distribution
5. **Top Dishes** — table sorted by total sold quantity descending
6. **Orders by Hour** (optional) — heatmap / bar chart of order count by hour of day

## API
- `GET /api/admin/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Default range: last 30 days
- Response shape:

```typescript
interface AnalyticsResponse {
  summary: {
    revenue: number;
    prevRevenue: number;
    orders: number;
    prevOrders: number;
    aov: number;
    prevAov: number;
    activeRestaurants: number;
    prevActiveRestaurants: number;
  };
  revenueOverTime: { date: string; revenue: number; orders: number }[];
  paymentMethods: { method: string; total: number; count: number }[];
  topDishes: { name: string; quantity: number; revenue: number }[];
  ordersByHour: { hour: number; count: number }[];
}
```

## Tech Stack
- **Charts**: recharts (already in package.json)
- **Icons**: lucide-react (available)
- **State**: React useState for dates, loading, error
- **Styling**: Tailwind CSS (existing project setup)

## Implementation Plan
1. Create `src/app/api/admin/analytics/route.ts` — query Prisma, aggregate, respond JSON
2. Rewrite `src/app/(admin)/admin/analytics/page.tsx` — fetch from API, render with Recharts
