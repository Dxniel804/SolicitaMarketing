import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import type { Me } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  let res: Response;
  try {
    // no-store: resposta autenticada por usuário não pode ir para o Data Cache
    // compartilhado do Next, e o perfil deve refletir mudanças de role na hora.
    res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
  } catch (e) {
    throw new Error(
      `Falha de rede ao contatar a API em ${process.env.NEXT_PUBLIC_API_BASE_URL}/me: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  // Só falta de autenticação/perfil manda de volta ao login; erro de
  // infraestrutura (5xx, API fora) precisa aparecer como erro, não como logout.
  if (res.status === 401) {
    redirect("/login?auth_error=session_rejected");
  }
  if (res.status === 403) {
    redirect("/login?auth_error=no_profile");
  }
  if (!res.ok) {
    throw new Error(`API /me respondeu ${res.status} — falha de infraestrutura, não de autenticação.`);
  }

  const me: Me = await res.json();

  return (
    <div className="flex min-h-screen bg-vm-bg">
      <Sidebar role={me.role} />
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
