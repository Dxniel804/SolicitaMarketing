"""The 6 automatic email templates, transcribed verbatim from spec.txt
(lines 783-823), plus a 7th ("comentario") used for admin comment
notifications (not in the original 6, but referenced by the prototype's
`detSendComment`, CentraldeSolicitações.dc.html line 1108)."""

from datetime import date


def _br(d: date | None) -> str:
    return d.strftime("%d/%m/%Y") if d else "—"


def received_email(code: str, title: str, type_name: str, desired_date: date | None, suggested_date: date | None) -> tuple[str, str]:
    subject = f"Solicitação recebida: {code} - {title}"
    body = (
        "Sua solicitação foi recebida pelo marketing.\n\n"
        f"Código: {code}\nTipo: {type_name}\nData desejada: {_br(desired_date)}\n"
        f"Data provável calculada: {_br(suggested_date)}\nStatus: Recebido\n\n"
        "O prazo solicitado ainda não está confirmado. O marketing fará a triagem "
        "considerando briefing, prioridade, fila atual e capacidade semanal."
    )
    return subject, body


def new_request_email(
    code: str, requester_name: str, area: str, type_name: str, weight: int, priority: str,
    desired_date: date | None, suggested_date: date | None, viability_label: str,
) -> tuple[str, str]:
    subject = f"Nova solicitação de marketing: {type_name} - {requester_name}"
    body = (
        "Uma nova solicitação foi aberta.\n\n"
        f"Código: {code}\nSolicitante: {requester_name}\nÁrea: {area}\nTipo: {type_name}\n"
        f"Peso estimado: {weight}\nPrioridade: {priority}\nData desejada: {_br(desired_date)}\n"
        f"Data sugerida pelo sistema: {_br(suggested_date)}\nStatus de viabilidade: {viability_label}\n\n"
        "Acesse o sistema para fazer a triagem."
    )
    return subject, body


def briefing_incomplete_email(code: str, pendencias: str) -> tuple[str, str]:
    subject = f"Solicitação precisa de complemento: {code}"
    body = (
        "Sua solicitação foi analisada, mas ainda faltam informações para entrar na fila de produção.\n\n"
        f"Pendências:\n{pendencias}\n\n"
        "Assim que as informações forem complementadas, o marketing fará nova triagem."
    )
    return subject, body


def approved_email(code: str, type_name: str, approved_date: date | None) -> tuple[str, str]:
    subject = f"Prazo aprovado: {code}"
    body = (
        "Sua solicitação foi aprovada para produção.\n\n"
        f"Código: {code}\nTipo: {type_name}\nData aprovada de entrega: {_br(approved_date)}\n"
        "Status: Aprovado para produção"
    )
    return subject, body


def reprogrammed_email(code: str, desired_date: date | None, new_date: date | None, reason: str) -> tuple[str, str]:
    subject = f"Nova previsão de entrega: {code}"
    body = (
        "O prazo solicitado não foi viável considerando a fila atual e a capacidade semanal.\n\n"
        f"Data solicitada: {_br(desired_date)}\nNova data prevista: {_br(new_date)}\nMotivo: {reason}\n\n"
        "A solicitação seguirá na fila conforme a nova previsão."
    )
    return subject, body


def delivered_email(code: str, type_name: str, delivered_date: date | None, final_link: str | None) -> tuple[str, str]:
    subject = f"Solicitação entregue: {code}"
    body = (
        "A solicitação foi concluída.\n\n"
        f"Código: {code}\nTipo: {type_name}\nData de entrega: {_br(delivered_date)}\n"
        f"Link ou arquivo final: {final_link or '—'}"
    )
    return subject, body


def comment_email(code: str, message: str) -> tuple[str, str]:
    subject = f"Atualização na solicitação: {code}"
    body = f'O marketing enviou uma mensagem sobre sua solicitação {code}:\n\n"{message}"'
    return subject, body
