import { createClient } from 'jsr:@supabase/supabase-js@2.45.4';

Deno.serve(async (req) => {
  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const users = [
      { email: 'haziel@nf.local', password: 'nf-haziel-2026', name: 'Haziel' },
      { email: 'areli@nf.local', password: 'nf-areli-2026', name: 'Areli' }
    ];

    const results = [];

    for (const u of users) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name }
      });

      if (error && !error.message?.includes('already')) {
        results.push({ email: u.email, ok: false, error: error.message });
      } else {
        results.push({ email: u.email, ok: true, user_id: data?.user?.id });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
