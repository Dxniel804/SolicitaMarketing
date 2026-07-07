"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_code_or_token: "Link inválido — faltam parâmetros de confirmação.",
  "Token has expired or is invalid": "Esse link expirou ou já foi usado. Peça um novo link de acesso.",
  "Email link is invalid or has expired": "Esse link expirou ou já foi usado. Peça um novo link de acesso.",
  inactivity_timeout: "Você ficou muito tempo sem acessar o sistema. Peça um novo código de acesso para entrar novamente.",
  session_rejected: "Sua sessão não foi aceita pelo servidor. Entre novamente.",
  no_profile: "Login autenticado, mas sua conta não tem um perfil ativo no sistema. Fale com o administrador do marketing.",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");

  const [mode, setMode] = useState<"solicitante" | "equipe">("solicitante");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSolicitante(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !area.trim()) {
      setError("Preencha nome, e-mail e área para continuar.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        data: { name: name.trim(), area: area.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!code.trim()) {
      setError("Digite o código recebido por e-mail.");
      return;
    }
    setVerifying(true);
    const supabase = createClient();
    try {
      // Verifying the 6-digit code directly (instead of relying on the email's
      // link) avoids the classic PKCE "code challenge does not match" failure
      // that happens when the link is opened in a different browser/app than
      // the one that requested it.
      const { data, error: err } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: "email",
      });
      if (err) {
        setVerifying(false);
        setError(`Erro do Supabase: ${err.message} (status ${err.status ?? "?"})`);
        return;
      }
      // TEMP DIAGNOSTIC: confirm the browser client actually holds a session
      // right after verifyOtp resolves, before we navigate anywhere.
      const { data: sessionData } = await supabase.auth.getSession();
      setVerifying(false);
      if (!sessionData.session) {
        setError(
          `verifyOtp disse sucesso (user ${data.user?.id ?? "?"}) mas getSession() não encontrou sessão no navegador.`
        );
        return;
      }
      setError(`OK: sessão criada para ${sessionData.session.user.email}. Indo para /home...`);
      setTimeout(() => {
        window.location.href = "/home";
      }, 1500);
    } catch (e) {
      setVerifying(false);
      setError(`Exceção JS: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleEquipe(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (err) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    window.location.href = "/home";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-xl font-bold text-vm-ink mb-1">Central de Solicitações ao Marketing</h1>
        <p className="text-sm text-vm-muted mb-6">VendaMais</p>

        {authError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg p-3 mb-4">
            {AUTH_ERROR_MESSAGES[authError] ?? authError}
          </div>
        )}

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode("solicitante")}
            className={`flex-1 py-2 rounded-md text-sm font-semibold ${
              mode === "solicitante" ? "bg-white shadow-sm" : "text-vm-muted"
            }`}
          >
            Solicitante
          </button>
          <button
            type="button"
            onClick={() => setMode("equipe")}
            className={`flex-1 py-2 rounded-md text-sm font-semibold ${
              mode === "equipe" ? "bg-white shadow-sm" : "text-vm-muted"
            }`}
          >
            Equipe de marketing
          </button>
        </div>

        {mode === "solicitante" ? (
          sent ? (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <p className="text-sm text-vm-ink">
                Enviamos um código de acesso para <strong>{email}</strong>. Digite-o abaixo para
                entrar (é mais confiável do que clicar no link do e-mail, que às vezes abre num
                navegador diferente do que você está usando aqui).
              </p>
              <Field label="Código recebido por e-mail" value={code} onChange={setCode} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={verifying}
                className="w-full bg-vm-ink text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {verifying ? "Confirmando..." : "Confirmar código →"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setError("");
                }}
                className="w-full text-xs text-vm-muted underline"
              >
                Usar outro e-mail / pedir novo código
              </button>
            </form>
          ) : (
            <form onSubmit={handleSolicitante} className="space-y-3">
              <Field label="Nome" value={name} onChange={setName} />
              <Field label="Área" value={area} onChange={setArea} />
              <Field label="E-mail" value={email} onChange={setEmail} type="email" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-vm-ink text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Cadastrar e entrar →"}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleEquipe} className="space-y-3">
            <Field label="E-mail" value={email} onChange={setEmail} type="email" />
            <PasswordField label="Senha" value={password} onChange={setPassword} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-vm-ink text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-vm-ink"
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm outline-none focus:border-vm-ink"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Esconder senha" : "Mostrar senha"}
          className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.29 20.29 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}
