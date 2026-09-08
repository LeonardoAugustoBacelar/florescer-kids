"use client";

import { useState, useTransition } from "react";
import { ehRedePublica } from "@/lib/prospect";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  saveProspectDraftAction,
  saveProspectNotesAction,
  sendProspectContactAction,
  setProspectStatusAction,
} from "@/lib/actions/prospect";

type Prospect = {
  id: string;
  whatsAppMessage?: string;
  name: string;
  kind: string;
  status: string;
  address: string;
  distanceKm: number;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  ratingCount: number | null;
  draftSubject: string | null;
  draftBody: string | null;
  notes: string | null;
  contactedAt: Date | null;
};

const KIND_LABELS: Record<string, string> = {
  ESCOLA_INFANTIL: "Escola infantil",
  CRECHE: "Creche",
  CLINICA_PEDIATRICA: "Pediatria",
  PSICOLOGIA: "Psicologia",
  FONOAUDIOLOGIA: "Fonoaudiologia",
  OUTRO: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  ENCONTRADO: "Na fila",
  APROVADO: "Aprovado, pronto pra enviar",
  CONTATADO: "Contatado",
  RESPONDEU: "Respondeu",
  SEM_RESPOSTA: "Sem resposta",
  DESCARTADO: "Descartado",
};

const STATUS_CORES: Record<string, string> = {
  ENCONTRADO: "bg-primary-50 text-primary-700",
  APROVADO: "bg-amber-50 text-amber-700",
  CONTATADO: "bg-blue-50 text-blue-700",
  RESPONDEU: "bg-green-50 text-green-700",
  SEM_RESPOSTA: "bg-zinc-100 text-zinc-600",
  DESCARTADO: "bg-zinc-100 text-zinc-500",
};

export default function ProspectCard({ prospect }: { prospect: Prospect }) {
  const [aberto, setAberto] = useState(false);
  const [subject, setSubject] = useState(prospect.draftSubject ?? "");
  const [body, setBody] = useState(prospect.draftBody ?? "");
  const [notes, setNotes] = useState(prospect.notes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editado =
    subject !== (prospect.draftSubject ?? "") || body !== (prospect.draftBody ?? "");

  function rodar(fn: () => Promise<unknown>) {
    setErro(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setErro((e as Error).message);
      }
    });
  }

  return (
    <div className="rounded-lg border border-primary-100 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-primary-700">
            {prospect.name}
            {ehRedePublica(prospect.name) && (
              <span
                title="Escola da rede pública: dá alcance e costuma lotar a roda de conversa, mas converte em aula mais devagar que a particular."
                className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              >
                pública
              </span>
            )}
          </p>
          <p className="text-sm text-primary-700/70">
            {KIND_LABELS[prospect.kind] ?? prospect.kind} ·{" "}
            {prospect.distanceKm.toFixed(1)} km
            {prospect.rating
              ? ` · ${prospect.rating.toFixed(1)}★ (${prospect.ratingCount ?? 0})`
              : ""}
          </p>
          <p className="text-xs text-primary-700/60">{prospect.address}</p>
          <p className="mt-1 text-xs text-primary-700/60">
            {prospect.email ? (
              <span className="font-medium text-primary-700">{prospect.email}</span>
            ) : (
              <span className="text-amber-700">
                sem e-mail — contato por telefone
              </span>
            )}
            {prospect.phone ? ` · ${prospect.phone}` : ""}
            {prospect.website ? (
              <>
                {" · "}
                <a
                  href={prospect.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  site
                </a>
              </>
            ) : null}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            STATUS_CORES[prospect.status] ?? "bg-zinc-100 text-zinc-600"
          }`}
        >
          {STATUS_LABELS[prospect.status] ?? prospect.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          onClick={() => setAberto((v) => !v)}
          className="text-xs font-semibold text-accent-600 hover:underline"
        >
          {aberto ? "Fechar" : "Ler e editar a mensagem"}
        </button>

        {prospect.phone && prospect.whatsAppMessage && (
          <a
            href={buildWhatsAppLink(
              `55${prospect.phone.replace(/\D/g, "").replace(/^55/, "")}`,
              prospect.whatsAppMessage
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-green-700 hover:underline"
          >
            Abrir no WhatsApp
          </a>
        )}
      </div>

      {aberto && (
        <div className="mt-4 space-y-3 border-t border-primary-100 pt-4">
          <div>
            <label className="text-xs font-semibold text-primary-700/70">
              Assunto
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-md border border-primary-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-primary-700/70">
              Mensagem
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="mt-1 w-full rounded-md border border-primary-100 px-3 py-2 font-mono text-xs leading-relaxed"
            />
            <p className="mt-1 text-xs text-primary-700/60">
              Vale reescrever à vontade — quanto menos parecer texto pronto,
              mais responde.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-primary-700/70">
              Anotações (só suas)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Falei com a coordenadora, retornar em duas semanas..."
              className="mt-1 w-full rounded-md border border-primary-100 px-3 py-2 text-sm"
            />
            <button
              disabled={isPending}
              onClick={() => rodar(() => saveProspectNotesAction(prospect.id, notes))}
              className="mt-1 text-xs font-semibold text-accent-600 hover:underline disabled:opacity-50"
            >
              Salvar anotação
            </button>
          </div>
        </div>
      )}

      {erro && <p className="mt-3 text-xs font-medium text-red-600">{erro}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {editado && (
          <button
            disabled={isPending}
            onClick={() =>
              rodar(() => saveProspectDraftAction(prospect.id, { subject, body }))
            }
            className="rounded-md bg-primary-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            Salvar alterações
          </button>
        )}

        {prospect.status === "ENCONTRADO" && (
          <>
            <button
              disabled={isPending || editado}
              title={editado ? "Salve as alterações primeiro" : undefined}
              onClick={() =>
                rodar(() => setProspectStatusAction(prospect.id, "APROVADO"))
              }
              className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Aprovar texto
            </button>
            <button
              disabled={isPending}
              onClick={() =>
                rodar(() => setProspectStatusAction(prospect.id, "DESCARTADO"))
              }
              className="rounded-md bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
            >
              Descartar
            </button>
          </>
        )}

        {prospect.status === "APROVADO" && prospect.email && (
          <button
            disabled={isPending}
            onClick={() => rodar(() => sendProspectContactAction(prospect.id))}
            className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "Enviando..." : "Enviar e-mail"}
          </button>
        )}

        {prospect.status === "CONTATADO" && (
          <>
            <button
              disabled={isPending}
              onClick={() =>
                rodar(() => setProspectStatusAction(prospect.id, "RESPONDEU"))
              }
              className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Respondeu
            </button>
            <button
              disabled={isPending}
              onClick={() =>
                rodar(() => setProspectStatusAction(prospect.id, "SEM_RESPOSTA"))
              }
              className="rounded-md bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
            >
              Sem resposta
            </button>
          </>
        )}
      </div>
    </div>
  );
}
