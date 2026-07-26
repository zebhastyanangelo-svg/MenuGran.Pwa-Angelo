export default async function RiderActivePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  
  return (
    <div>
      <h1>Pedido Activo: {orderId}</h1>
    </div>
  );
}
