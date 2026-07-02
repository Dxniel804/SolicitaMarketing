-- 0004_seed_request_types.sql
-- The 24 request types from the client's spec (spec.txt), seeded as defaults.
-- Idempotent: safe to re-run (name is unique, ON CONFLICT DO NOTHING).

insert into public.request_types (name, default_weight, default_min_business_days, requires_attachment) values
  ('Mensagem de WhatsApp', 1, 1, false),
  ('Texto simples', 1, 2, false),
  ('Ajuste simples em material existente', 1, 2, true),
  ('Post simples', 1, 3, false),
  ('Arte simples para redes sociais', 1, 3, false),
  ('E-mail marketing', 1, 3, false),
  ('Copy para postagem', 1, 2, false),
  ('Carrossel', 2, 5, false),
  ('Proposta comercial simples', 2, 3, false),
  ('Apresentação simples', 2, 4, false),
  ('Peça para evento simples', 2, 5, false),
  ('Folder', 3, 7, false),
  ('Proposta comercial personalizada', 3, 5, true),
  ('Apresentação comercial personalizada', 3, 5, false),
  ('Sequência de e-mails', 3, 7, false),
  ('Kit de peças para campanha pequena', 4, 10, false),
  ('Landing page simples', 4, 10, false),
  ('Material institucional novo', 5, 12, false),
  ('Campanha de marketing', 5, 15, false),
  ('Material completo para evento', 6, 20, false),
  ('Lançamento de produto ou serviço', 8, 30, false),
  ('Projeto especial de marketing', 8, 30, false),
  ('Reformulação de página do site', 8, 20, false),
  ('Criação de nova área no site', 13, 30, false)
on conflict (name) do nothing;
