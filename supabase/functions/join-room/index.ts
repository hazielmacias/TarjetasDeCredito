// Supabase Edge Function: join-room
// Une al usuario actual a una sala mediante un código compartido.
// Si la sala no existe, la crea.
// Requiere que el usuario ya esté autenticado (anónimo o no).

import { createClient } from 'jsr:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json({ error: 'Missing env vars' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const accessCode = String(body?.access_code || '').trim();
    const deviceName = String(body?.device_name || 'Dispositivo').trim();

    if (!accessCode || accessCode.length < 3) return json({ error: 'Código inválido' }, 400);

    // Admin client para operaciones sin RLS
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Determinar room: usamos el access_code como clave lógica.
    // Para mantenerlo simple: el código normalizado (trim + lower) mapea a un nombre de room único.
    const normalized = accessCode.toLowerCase();

    // Buscar sala existente por nombre derivado del código
    const roomName = `Sala ${normalized}`;
    let { data: existing } = await admin
      .from('rooms')
      .select('*')
      .eq('name', roomName)
      .maybeSingle();

    let room;
    if (existing) {
      room = existing;
    } else {
      const { data: created, error: createErr } = await admin
        .from('rooms')
        .insert({ name: roomName, owner_name: 'Haziel', partner_name: 'Areli' })
        .select()
        .single();
      if (createErr) return json({ error: createErr.message }, 500);
      room = created;
    }

    // Insertar/actualizar device
    const { error: devErr } = await admin
      .from('room_devices')
      .upsert({
        room_id: room.id,
        user_id: userData.user.id,
        device_name: deviceName,
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (devErr) return json({ error: devErr.message }, 500);

    // Generar sesión para que el cliente pueda usar el JWT
    const { data: refreshed, error: refreshErr } = await userClient.auth.refreshSession();
    const session = refreshed?.session ?? null;
    if (refreshErr) console.warn('refresh err', refreshErr);

    return json({
      room,
      session: session || undefined,
      message: existing ? 'Unido a la sala' : 'Sala creada'
    });
  } catch (e) {
    return json({ error: e.message || 'Server error' }, 500);
  }
});

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
