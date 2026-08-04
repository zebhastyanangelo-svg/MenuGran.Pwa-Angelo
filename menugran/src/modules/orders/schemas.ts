import { z } from "zod";

export const OrderItemSchema = z.object({
  menuItemId: z.string().min(1, "menuItemId es requerido"),
  quantity: z
    .number()
    .int("quantity debe ser un entero")
    .positive("quantity debe ser mayor a 0"),
});

export const CreateOrderSchema = z
  .object({
    restaurantId: z.string().min(1, "restaurantId es requerido"),
    items: z
      .array(OrderItemSchema)
      .min(1, "Al menos un item requerido"),
    serviceType: z.enum(["MESA", "DELIVERY"]).default("MESA"),
    tableNumber: z.number().int().positive().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    deliveryAddress: z.string().optional(),
    paymentMethod: z.enum(["CASH", "MOBILE_PAYMENT", "TRANSFER"]).default("CASH"),
    clientId: z.string().min(1).optional(), // solo ADMIN/OPERATOR
  })
  .superRefine((data, ctx) => {
    if (data.serviceType === "DELIVERY" && !data.deliveryAddress?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryAddress"],
        message: "deliveryAddress es requerido para servicio DELIVERY",
      });
    }
  });

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export function formatZodErrors(
  error: z.ZodError
): Record<string, string[]> {
  const issues: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.length
      ? issue.path.join(".")
      : "body";
    const message =
      typeof issue.message === "string"
        ? issue.message
        : "Valor inválido";
    if (!issues[field]) issues[field] = [];
    issues[field].push(message);
  }
  return issues;
}
