import {
  assertSuperadmin,
  buildServiceRoleClient,
  corsHeaders,
  jsonResponse,
} from '../_shared/superadmin-guard.ts';

interface DeleteMerchantPayload {
  merchantId?: unknown;
  ownerId?: unknown;
}

type ServiceClient = ReturnType<typeof buildServiceRoleClient>;
type DeleteResult = { error: string; status: number } | null;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validatePayload(payload: DeleteMerchantPayload): { error: string } | {
  merchantId: string;
  ownerId: string;
} {
  const merchantId = readString(payload.merchantId);
  const ownerId = readString(payload.ownerId);
  if (!UUID_PATTERN.test(merchantId) || !UUID_PATTERN.test(ownerId)) {
    return { error: 'Los identificadores del comercio y del propietario no son válidos.' };
  }
  return { merchantId, ownerId };
}

async function getMerchantOwner(
  serviceClient: ServiceClient,
  merchantId: string,
): Promise<{ ownerId: string } | { error: string; status: number }> {
  const { data, error } = await serviceClient
    .from('merchants')
    .select('owner_id')
    .eq('id', merchantId)
    .maybeSingle();
  if (error !== null) return { error: error.message, status: 400 };
  if (data === null) return { error: 'El comercio no existe.', status: 404 };
  return { ownerId: data.owner_id };
}

async function getStaffUserIds(
  serviceClient: ServiceClient,
  merchantId: string,
): Promise<string[]> {
  const { data, error } = await serviceClient
    .from('merchant_staff')
    .select('user_id')
    .eq('merchant_id', merchantId);
  if (error !== null) throw new Error(error.message);
  return (data ?? []).map((staff) => staff.user_id);
}

async function hasOtherMerchantLinks(
  serviceClient: ServiceClient,
  userId: string,
  merchantId: string,
): Promise<boolean> {
  const [ownerResult, staffResult] = await Promise.all([
    serviceClient.from('merchants').select('id').eq('owner_id', userId).neq('id', merchantId).maybeSingle(),
    serviceClient.from('merchant_staff').select('id').eq('user_id', userId).neq('merchant_id', merchantId).maybeSingle(),
  ]);
  return ownerResult.data !== null || staffResult.data !== null;
}

async function deleteAuthUserIfUnused(
  serviceClient: ServiceClient,
  userId: string,
  merchantId: string,
): Promise<DeleteResult> {
  if (await hasOtherMerchantLinks(serviceClient, userId, merchantId)) return null;
  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error === null) return null;
  if (error.message.toLowerCase().includes('not found')) return null;
  return { error: error.message, status: 400 };
}

async function deleteUnsharedStaff(
  serviceClient: ServiceClient,
  merchantId: string,
  userIds: string[],
): Promise<DeleteResult> {
  for (const userId of userIds) {
    const result = await deleteAuthUserIfUnused(serviceClient, userId, merchantId);
    if (result !== null) return result;
  }
  return null;
}

async function deleteMerchantRecord(
  serviceClient: ServiceClient,
  merchantId: string,
): Promise<DeleteResult> {
  const { error } = await serviceClient.from('merchants').delete().eq('id', merchantId);
  return error === null ? null : { error: error.message, status: 400 };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const authResult = await assertSuperadmin(req.headers.get('Authorization'));
  if (!authResult.ok) return authResult.response;

  let payload: DeleteMerchantPayload;
  try {
    payload = (await req.json()) as DeleteMerchantPayload;
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
  }
  const validated = validatePayload(payload);
  if ('error' in validated) return jsonResponse(validated, 400);

  try {
    const serviceClient = buildServiceRoleClient();
    const owner = await getMerchantOwner(serviceClient, validated.merchantId);
    if ('error' in owner) return jsonResponse({ error: owner.error }, owner.status);
    if (owner.ownerId !== validated.ownerId) {
      return jsonResponse({ error: 'El propietario no corresponde al comercio.' }, 409);
    }
    const staffUserIds = await getStaffUserIds(serviceClient, validated.merchantId);
    const staffDeletion = await deleteUnsharedStaff(serviceClient, validated.merchantId, staffUserIds);
    if (staffDeletion !== null) return jsonResponse({ error: staffDeletion.error }, staffDeletion.status);
    const merchantDeletion = await deleteMerchantRecord(serviceClient, validated.merchantId);
    if (merchantDeletion !== null) return jsonResponse({ error: merchantDeletion.error }, merchantDeletion.status);
    const ownerDeletion = await deleteAuthUserIfUnused(serviceClient, validated.ownerId, validated.merchantId);
    if (ownerDeletion !== null) return jsonResponse({ error: ownerDeletion.error }, ownerDeletion.status);
    return jsonResponse({ deleted: true });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Error interno del servidor.';
    return jsonResponse({ error: message }, 500);
  }
});
