import { handlers } from "@/lib/nextauth";
import type { NextRequest } from "next/server";

// next-auth v4 tipa los handlers como Pages Router (req: NextApiRequest, res: NextApiResponse),
// pero en App Router Next los invoca como route handlers (req: NextRequest, ctx: RouteContext).
// El cast alinea la firma exportada con lo que exige el validator de rutas de Next.js.
type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string | string[]>> }
) => Promise<Response>;

const { GET, POST } = handlers as unknown as { GET: RouteHandler; POST: RouteHandler };

export { GET, POST };
