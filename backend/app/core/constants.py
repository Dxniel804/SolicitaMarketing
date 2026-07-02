"""Shared constants mirroring the prototype's fixed lists/maps.

Source: CentraldeSolicitações.dc.html lines 743-765, 761-762.
"""

STATUS_LIST = [
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
]

CONSUMING_STATUSES = {
    "Aprovado para produção",
    "Em produção",
    "Em revisão",
    "Ajustes solicitados",
}

CLOSED_STATUSES = {"Entregue", "Cancelado", "Recusado"}

PRIORITY_LEVELS = ["Baixa", "Normal", "Alta", "Crítica"]

PRIORITY_BASE = {"Baixa": 10, "Normal": 40, "Alta": 70, "Crítica": 100}

IMPACT_BONUS = {
    "": 0,
    "Comunicação interna": 5,
    "Cliente ativo": 10,
    "Prospecção": 5,
    "Proposta comercial": 20,
    "Campanha": 20,
    "Evento": 25,
    "Diretoria": 25,
    "Lançamento": 30,
    "Outro": 0,
}

VIABILITY_LEVELS = ("verde", "amarelo", "vermelho")

DEFAULT_CAPACITY_POINTS = 20

REQUIRED_DRAFT_FIELDS = [
    "nome",
    "area",
    "email",
    "aprovador",
    "titulo",
    "tipoId",
    "oQue",
    "objetivo",
    "publico",
    "canal",
    "formato",
    "dataDesejada",
    "dataUso",
]
