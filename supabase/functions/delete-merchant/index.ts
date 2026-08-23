// Supabase Edge Function: delete-merchant
//
// Elimina completamente un comercio y la cuenta de su propietario:
// 1. Borra el registro en `merchants`.
// 2. Borra el perfil en `profiles` (si no fue eliminado en cascada).
// 3. Borra al propietario en Supabase Auth vía auth.admin.deleteUser.
//
// Seguridad: exige rol superadmin (JWT verificado) y usa la service_role
// key EXCLUSIVAMENTE dentro del servidor.
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

function validatePayload(payload: DeleteMerchantPayload):
  | { error: string }
  | { merchantId: string; ownerId: string } {
  const merchantId =
    typeof payload.merchantId === 'string' ? payload.merchantId.trim() : '';
  const ownerId =
    typeof payload.ownerId === 'string' ? payload.ownerId.trim() : '';
  if (merchantId === '' || ownerId === '') {
    return {
      error: 'Se requiere el identificador del comercio y del propietario.',
    };
  }
  return { merchantId, ownerId };
}

async function deleteTableRow(
  serviceClient: ReturnType<typeof buildServiceRoleClient>,
  table: string,
  column: string,
  value: string,
): Promise<void> {
  const { error } = await serviceClient.from(table).delete().eq(column, value);
  if (error !== null) {
    throw new Error(`Error al eliminar ${table}: ${error.message}`);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await assertSuperadmin(req.headers.get('Authorization'));
    if (!authResult.ok) {
      return authResult.response;
    }

    let payload: DeleteMerchantPayload;
    try {
      payload = (await req.json()) as DeleteMerchantPayload;
    } catch {
      return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
    }

    const validated = validatePayload(payload);
    if ('error' in validated) {
      return jsonResponse(validated, 400);
    }

    const serviceClient = buildServiceRoleClient();
    await deleteTableRow(serviceClient, 'merchants', 'id', validated.merchantId);
    await deleteTableRow(serviceClient, 'profiles', 'id', validated.ownerId);

    const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(
      validated.ownerId,
    );
    if (deleteUserError !== null) {
      return jsonResponse(
        { error: `Error al eliminar la cuenta del propietario: ${deleteUserError.message}` },
        400,
      );
    }

    return jsonResponse({ deleted: true });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : 'Error interno del servidor.';
    return jsonResponse({ error: message }, 500);
  }
});
