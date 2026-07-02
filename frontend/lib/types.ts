export type Role = "solicitante" | "admin" | "gestor";

export interface Me {
  id: string;
  name: string;
  role: Role;
  area: string | null;
  active: boolean;
}

export interface RequestType {
  id: string;
  name: string;
  default_weight: number;
  default_min_business_days: number;
  description: string | null;
  requires_attachment: boolean;
  active: boolean;
}

export interface WeeklyCapacity {
  week_start: string;
  week_end: string;
  capacity_points: number;
  is_blocked: boolean;
  notes: string | null;
  occupied: number | null;
  available: number | null;
  pct: number | null;
  tag: string | null;
}

export const STATUS_LIST = [
  "Recebido",
  "Em triagem",
  "Aguardando briefing",
  "Aguardando aprovação de prazo",
  "Aprovado para produção",
  "Em produção",
  "Em revisão",
  "Ajustes solicitados",
  "Entregue",
  "Cancelado",
  "Recusado",
] as const;

export type Status = (typeof STATUS_LIST)[number];

export const OPEN_STATUSES: Status[] = [
  "Recebido",
  "Em triagem",
  "Aguardando briefing",
  "Aguardando aprovação de prazo",
  "Aprovado para produção",
  "Em produção",
  "Em revisão",
  "Ajustes solicitados",
];

export type Priority = "Baixa" | "Normal" | "Alta" | "Crítica";
export type ViabilityLevel = "verde" | "amarelo" | "vermelho";

export interface RequestRow {
  id: string;
  code: string;
  title: string;
  requester_id: string;
  requester_name: string;
  area: string;
  email: string;
  whatsapp: string | null;
  approver_name: string;
  approver_email: string | null;
  confidential: boolean;

  request_type_id: string;
  client_or_project: string | null;
  is_commercial_opportunity: boolean;
  commercial_owner: string | null;
  crm_link: string | null;

  what_needs_to_be_done: string;
  objective: string;
  problem_to_solve: string | null;
  expected_action: string | null;

  target_audience: string;
  audience_profile: string | null;
  segment: string | null;
  company: string | null;
  audience_knows_vendamais: string | null;

  mandatory_content: string | null;
  base_text: string | null;
  reference_links: string | null;
  forbidden_content: string | null;

  channel: string;
  output_format: string;
  dimensions: string | null;
  needs_editable_version: boolean;
  needs_spanish_version: boolean;
  needs_english_version: boolean;

  desired_delivery_date: string;
  real_use_date: string;
  is_deadline_flexible: boolean;
  consequence_if_late: string | null;

  priority_requested: Priority;
  priority_approved: Priority | null;
  priority_justification: string | null;
  impact_type: string | null;

  status: Status;

  default_weight: number;
  adjusted_weight: number | null;
  min_business_days: number;
  min_possible_date: string | null;
  system_suggested_date: string | null;
  approved_delivery_date: string | null;
  delivery_week_start: string | null;
  viability_status: ViabilityLevel;
  inviability_reason: string | null;
  reserve_capacity: boolean;
  responsavel: string | null;
  internal_notes: string | null;

  final_delivery_link: string | null;
  delivered_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface ViabilityPreviewOut {
  level: ViabilityLevel;
  message: string;
  reasons: string[];
  alerts: string[];
  weight: number;
  min_days: number;
  min_possible_date: string | null;
  suggested_date: string | null;
  capacity: number;
  occupied_before: number;
  available_before: number;
}

export interface QueueRow {
  id: string;
  order: number;
  request_type_name: string;
  area: string;
  status: Status;
  delivery_week_start: string | null;
  effective_date: string | null;
}

export interface CalendarItem {
  id: string;
  code_or_type: string;
  status: Status;
  weight: number;
  responsavel: string | null;
  effective_date: string;
}

export interface CalendarWeek {
  week_start: string;
  week_end: string;
  capacity: number;
  occupied: number;
  available: number;
  pct: number;
  tag: string;
  items: CalendarItem[];
}

export interface DashboardOut {
  open_count: number;
  in_production_count: number;
  awaiting_briefing_count: number;
  awaiting_approval_count: number;
  delivered_this_month_count: number;
  delayed_count: number;
  current_week_capacity: number;
  current_week_occupied: number;
  current_week_available: number;
  current_week_pct: number;
  by_status: Record<string, number>;
  open_delta_pct: number | null;
  awaiting_approval_delta_pct: number | null;
  delivered_delta_pct: number | null;
}

export interface ActivityItem {
  request_code: string;
  request_title: string;
  new_status: Status;
  created_at: string;
}

export interface ReportsSummary {
  total_by_month: Record<string, number>;
  total_by_area: Record<string, number>;
  total_by_type: Record<string, number>;
  total_by_priority: Record<string, number>;
  delivered_on_time: number;
  delivered_late: number;
  returned_for_briefing_count: number;
  avg_triage_days: number | null;
  avg_production_days: number | null;
}

export interface RequestFile {
  id: string;
  file_name: string;
  file_type: string | null;
  signed_url: string;
  created_at: string;
}

export interface RequestComment {
  id: string;
  user_id: string | null;
  comment: string;
  is_internal: boolean;
  created_at: string;
}
