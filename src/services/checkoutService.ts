export async function simulatePaymentProofUpload(
  file: Blob,
  merchantId: string,
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  if (!file) throw new Error('No se proporcionó un comprobante.');
  return `${merchantId}-proof`;
}
