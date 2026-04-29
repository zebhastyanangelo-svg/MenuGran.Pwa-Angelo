export default function RiderActivePage({
  params,
}: {
  params: { orderId: string };
}) {
  return (
    <div>
      <h1>Pedido Activo: {params.orderId}</h1>
    </div>
  );
}
