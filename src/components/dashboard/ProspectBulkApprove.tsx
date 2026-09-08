"use client";

import { useState, useTransition } from "react";
import { approveAllProspectsAction } from "@/lib/actions/prospect";

export default function ProspectBulkApprove({ pendentes }: { pendentes: number }) {
  const [isPending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (pendentes === 0) return null;

  return (
    <div className="mt-4 rounded-md bg-amber-50 px-4 py-3">
      {confirmando ? (
        <>
          <p className="text-xs font-medium text-amber-900">
            Aprovar as {pendentes} mensagens sem abrir uma a uma? Elas entram na
            fila do disparo automático e começam a sair no próximo envio.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await approveAllProspectsAction();
                    setConfirmando(false);
                  } catch (e) {
                    setErro((e as Error).message);
                  }
                })
              }
              className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? "Aprovando..." : `Sim, aprovar as ${pendentes}`}
            </button>
            <button
              disabled={isPending}
              onClick={() => setConfirmando(false)}
              className="rounded-md px-4 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={() => setConfirmando(true)}
          className="text-xs font-semibold text-amber-900 underline"
        >
          Aprovar as {pendentes} de uma vez
        </button>
      )}
      {erro && <p className="mt-2 text-xs font-medium text-red-600">{erro}</p>}
    </div>
  );
}
