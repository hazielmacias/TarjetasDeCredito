// Supabase Edge Function: join-room
// Une al usuario actual a una sala.
// Lógica:
//   1. Si el usuario ya tiene un room_device registrado, lo reutiliza (no crear otro)
//   2. Si no, busca un room con el nombre "Sala {access_code}"
//   3. Si tampoco existe, lo crea
//
// Importante: una vez creado, el room puede ser renombrado por el usuario desde
// Ajustes sin que esto afecte la asociación user↔room (que vive en room_devices).

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
    const accessCode = String(body?.access_code || '').trim().toLowerCase();
    const deviceName = String(body?.device_name || 'Dispositivo').trim();

    if (!accessCode || accessCode.length < 3) return json({ error: 'Código inválido' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const userId = userData.user.id;

    // PASO 1: ¿Este usuario ya está unido a alguna sala? Si sí, reutilizarla.
    const { data: existingDevice } = await admin
      .from('room_devices')
      .select('room_id, room:rooms(*)')
      .eq('user_id', userId)
      .maybeSingle();

    let room;
    let created = false;

    if (existingDevice?.room) {
      room = existingDevice.room;
    } else {
      // PASO 2: Buscar una sala existente con el código como nombre
      const roomName = `Sala ${accessCode}`;
      const { data: existingRoom } = await admin
        .from('rooms')
        .select('*')
        .eq('name', roomName)
        .maybeSingle();

      if (existingRoom) {
        room = existingRoom;
      } else {
        // PASO 3: Crear nueva sala
        const { data: createdRoom, error: createErr } = await admin
          .from('rooms')
          .insert({ name: roomName, owner_name: 'Haziel', partner_name: 'Areli' })
          .select()
          .single();
        if (createErr) return json({ error: createErr.message }, 500);
        room = createdRoom;
        created = true;
      }

      // Registrar el dispositivo
      const { error: devErr } = await admin
        .from('room_devices')
        .insert({
          room_id: room.id,
          user_id: userId,
          device_name: deviceName,
          last_seen_at: new Date().toISOString()
        });

      if (devErr && !devErr.message?.includes('duplicate')) {
        return json({ error: devErr.message }, 500);
      }
    }

    // Actualizar last_seen_at
    await admin
      .from('room_devices')
      .update({ last_seen_at: new Date().toISOString(), device_name: deviceName })
      .eq('user_id', userId);

    return json({
      room,
      message: created ? 'Sala creada' : 'Unido a la sala'
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
