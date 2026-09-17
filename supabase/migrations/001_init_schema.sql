-- =====================================================
-- Nuestras Finanzas — Schema v1
-- =====================================================

-- Salas (rooms)
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Nuestras Finanzas',
  owner_name text,
  partner_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Dispositivos vinculados
CREATE TABLE public.room_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text,
  push_subscription jsonb,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_room_devices_room ON public.room_devices(room_id);

-- Tarjetas
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  owner text NOT NULL CHECK (owner IN ('Haziel', 'Areli')),
  name text NOT NULL,
  bank text,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  cutoff_day int NOT NULL CHECK (cutoff_day BETWEEN 1 AND 31),
  payment_day int NOT NULL CHECK (payment_day BETWEEN 1 AND 31),
  color text DEFAULT '#0075de',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_room ON public.cards(room_id);

-- Pagos
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial')),
  month int NOT NULL,
  year int NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_room ON public.payments(room_id);
CREATE INDEX idx_payments_card ON public.payments(card_id);
CREATE INDEX idx_payments_due ON public.payments(due_date);

-- Categorías
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#62aef0',
  icon text DEFAULT 'tag',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_room ON public.categories(room_id);

-- Gastos
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  payment_method text NOT NULL DEFAULT 'card' CHECK (payment_method IN ('card', 'cash', 'transfer')),
  amount numeric(12,2) NOT NULL,
  place text NOT NULL,
  owner text CHECK (owner IN ('Haziel', 'Areli')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  month int NOT NULL,
  year int NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_room ON public.expenses(room_id);
CREATE INDEX idx_expenses_card ON public.expenses(card_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_month_year ON public.expenses(year, month);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Helper: room del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_room_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT room_id FROM public.room_devices WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Policies
CREATE POLICY "Users can read their room" ON public.rooms
  FOR SELECT USING (id = public.get_user_room_id());

CREATE POLICY "Users can update their room" ON public.rooms
  FOR UPDATE USING (id = public.get_user_room_id());

CREATE POLICY "Users can read their devices" ON public.room_devices
  FOR SELECT USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can insert their device" ON public.room_devices
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their device" ON public.room_devices
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can read their cards" ON public.cards
  FOR SELECT USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can insert cards" ON public.cards
  FOR INSERT WITH CHECK (room_id = public.get_user_room_id());

CREATE POLICY "Users can update cards" ON public.cards
  FOR UPDATE USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can delete cards" ON public.cards
  FOR DELETE USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can read their payments" ON public.payments
  FOR SELECT USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can insert payments" ON public.payments
  FOR INSERT WITH CHECK (room_id = public.get_user_room_id());

CREATE POLICY "Users can update payments" ON public.payments
  FOR UPDATE USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can delete payments" ON public.payments
  FOR DELETE USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can read their categories" ON public.categories
  FOR SELECT USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can insert categories" ON public.categories
  FOR INSERT WITH CHECK (room_id = public.get_user_room_id());

CREATE POLICY "Users can update categories" ON public.categories
  FOR UPDATE USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can delete categories" ON public.categories
  FOR DELETE USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can read their expenses" ON public.expenses
  FOR SELECT USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (room_id = public.get_user_room_id());

CREATE POLICY "Users can update expenses" ON public.expenses
  FOR UPDATE USING (room_id = public.get_user_room_id());

CREATE POLICY "Users can delete expenses" ON public.expenses
  FOR DELETE USING (room_id = public.get_user_room_id());
