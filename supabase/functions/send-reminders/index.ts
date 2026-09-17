// Supabase Edge Function: send-reminders
// Envía notificaciones push para:
//  - Pagos próximos a vencer (en 1-2 días)
//  - Cortes próximos a ocurrir (en 1 día)
// Se debe programar con cron para correr todos los días a las 9:00 hora local.
// Para que las notificaciones push reales funcionen, configura las variables:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@email.com)

import webpush from 'npm:web-push@8.0.1';
import { createClient } from 'jsr:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return json({ error: 'VAPID keys no configuradas' }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inDays = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    // 1. Pagos próximos
    const { data: payments } = await admin
      .from('payments')
      .select('id, room_id, amount, due_date, status, card:cards(name, owner)')
      .in('status', ['pending', 'partial'])
      .lte('due_date', inDays(2))
      .gte('due_date', inDays(-1));

    // 2. Cortes próximos
    const { data: cards } = await admin
      .from('cards')
      .select('id, room_id, name, owner, cutoff_day')
      .eq('active', true);

    const tasks: { roomId: string; payload: any }[] = [];

    for (const p of payments || []) {
      const card = Array.isArray(p.card) ? p.card[0] : p.card;
      const days = Math.round((new Date(p.due_date).getTime() - today.getTime()) / 86400000);
      const title = days <= 0 ? 'Pago vence hoy' : days === 1 ? 'Pago mañana' : `Pago en ${days} días`;
      const body = `${card?.name || 'Tarjeta'} · ${formatMXN(p.amount)}${card?.owner ? ' · ' + card.owner : ''}`;
      tasks.push({ roomId: p.room_id, payload: { title, body, tag: `pay-${p.id}`, url: '/payments' } });
    }

    for (const c of cards || []) {
      const proxCorte = nextDayOfMonth(c.cutoff_day);
      const diff = Math.round((proxCorte.getTime() - today.getTime()) / 86400000);
      if (diff === 1 || diff === 0) {
        const title = diff <= 0 ? 'Corte de tarjeta hoy' : 'Corte de tarjeta mañana';
        const body = `${c.name}${c.owner ? ' · ' + c.owner : ''} · día ${c.cutoff_day}`;
        tasks.push({
          roomId: c.room_id,
          payload: { title, body, tag: `cut-${c.id}-${today.toISOString().slice(0, 10)}`, url: '/cards' }
        });
      }
    }

    let sent = 0;
    let failed = 0;

    for (const t of tasks) {
      const { data: devices } = await admin
        .from('room_devices')
        .select('push_subscription')
        .eq('room_id', t.roomId)
        .not('push_subscription', 'is', null);

      for (const d of devices || []) {
        const sub = d.push_subscription as PushSub;
        if (!sub?.endpoint || !sub?.keys) continue;
        try {
          await webpush.sendNotification(sub, JSON.stringify(t.payload), { TTL: 86400 });
          sent++;
        } catch (e) {
          failed++;
          // 404/410 significa suscripción inválida: la limpiamos
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await admin
              .from('room_devices')
              .update({ push_subscription: null })
              .eq('room_id', t.roomId)
              .contains('push_subscription', { endpoint: sub.endpoint });
          } else {
            console.error('push error', e);
          }
        }
      }
    }

    return json({ sent, failed, queued: tasks.length });
  } catch (e) {
    return json({ error: e.message || 'Server error' }, 500);
  }
});

function nextDayOfMonth(day: number) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const candidate = new Date(y, m, day);
  if (candidate <= today) candidate.setMonth(m + 1);
  candidate.setHours(0, 0, 0, 0);
  return candidate;
}

function formatMXN(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
