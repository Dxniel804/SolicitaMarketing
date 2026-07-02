-- 0001_schema.sql
-- Core schema for Central de Solicitações ao Marketing.
-- Run this file, then 0002..0006 in order, via the Supabase SQL editor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: 1:1 extension of auth.users, holds app-specific fields + role.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text,
  area text,
  role text not null default 'solicitante' check (role in ('solicitante','admin','gestor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- request_types
-- ---------------------------------------------------------------------------
create table if not exists public.request_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_weight int not null check (default_weight > 0),
  default_min_business_days int not null check (default_min_business_days >= 0),
  description text,
  requires_attachment boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- weekly_capacities
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_capacities (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  week_end date not null,
  capacity_points int not null default 20 check (capacity_points >= 0),
  is_blocked boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint week_is_mon_fri check (week_end = week_start + 4)
);

-- ---------------------------------------------------------------------------
-- code_counters: atomic per-year sequence for request codes (MKT-YYYY-NNNN)
-- ---------------------------------------------------------------------------
create table if not exists public.code_counters (
  year int primary key,
  last_seq int not null default 0
);

-- ---------------------------------------------------------------------------
-- requests: the big table.
-- ---------------------------------------------------------------------------
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,

  -- bloco 1: solicitante
  requester_id uuid not null references public.profiles(id),
  requester_name text not null,
  area text not null,
  email text not null,
  whatsapp text,
  approver_name text not null,
  approver_email text,
  confidential boolean not null default false,

  -- bloco 2: identificação da demanda
  title text not null,
  request_type_id uuid not null references public.request_types(id),
  client_or_project text,
  is_commercial_opportunity boolean not null default false,
  commercial_owner text,
  crm_link text,

  -- bloco 3: objetivo
  what_needs_to_be_done text not null,
  objective text not null,
  problem_to_solve text,
  expected_action text,

  -- bloco 4: público-alvo
  target_audience text not null,
  audience_profile text,
  segment text,
  company text,
  audience_knows_vendamais text check (audience_knows_vendamais in ('sim','nao','parcialmente')),

  -- bloco 5: conteúdo obrigatório
  mandatory_content text,
  base_text text,
  reference_links text,
  forbidden_content text,

  -- bloco 6: formato de entrega
  channel text not null,
  output_format text not null,
  dimensions text,
  needs_editable_version boolean not null default false,
  needs_spanish_version boolean not null default false,
  needs_english_version boolean not null default false,

  -- bloco 7: prazo
  desired_delivery_date date not null,
  real_use_date date not null,
  is_deadline_flexible boolean not null default false,
  consequence_if_late text,

  -- bloco 8: prioridade
  priority_requested text not null check (priority_requested in ('Baixa','Normal','Alta','Crítica')),
  priority_approved text check (priority_approved in ('Baixa','Normal','Alta','Crítica')),
  priority_justification text,
  impact_type text default '' check (impact_type in ('', 'Comunicação interna','Cliente ativo','Prospecção','Proposta comercial','Campanha','Evento','Diretoria','Lançamento','Outro')),

  -- status / lifecycle
  status text not null default 'Recebido' check (status in (
    'Recebido','Em triagem','Aguardando briefing','Aguardando aprovação de prazo',
    'Aprovado para produção','Em produção','Em revisão','Ajustes solicitados',
    'Entregue','Cancelado','Recusado'
  )),

  -- internal / computed
  default_weight int not null,
  adjusted_weight int,
  min_business_days int not null,
  min_possible_date date,
  system_suggested_date date,
  approved_delivery_date date,
  delivery_week_start date,
  viability_status text not null default 'verde' check (viability_status in ('verde','amarelo','vermelho')),
  inviability_reason text,
  reserve_capacity boolean not null default false,
  responsavel text,
  internal_notes text,

  final_delivery_link text,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- request_files
-- ---------------------------------------------------------------------------
create table if not exists public.request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- request_comments
-- ---------------------------------------------------------------------------
create table if not exists public.request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id uuid references public.profiles(id),
  comment text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- status_history (general audit log)
-- ---------------------------------------------------------------------------
create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  old_status text,
  new_status text,
  changed_by uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- effort_allocations (weight-splitting across weeks, for weight >= 8 requests)
-- ---------------------------------------------------------------------------
create table if not exists public.effort_allocations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  allocated_points int not null check (allocated_points > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- holidays
-- ---------------------------------------------------------------------------
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  name text not null,
  type text not null default 'nacional' check (type in ('nacional','local','ferias','bloqueio')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- email_logs
-- ---------------------------------------------------------------------------
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete set null,
  email_type text not null check (email_type in ('recebido','nova','briefing','aprovado','reprogramado','entrega','comentario')),
  recipient text not null,
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('sent','failed','pending_no_api_key','pending'))
);
