"use client";

import { useActionState, useTransition } from "react";
import { X } from "lucide-react";
import {
  addBlockedDateAction,
  removeBlockedDateAction,
  type BlockedDateState,
} from "@/lib/actions/blockedDates";
import { formatDateBR } from "@/lib/date";

const initialState: BlockedDateState = {};

type BlockedDate = {
  id: string;
  date: Date;
  reason: string | null;
};

export default function BlockedDatesManager({
  blockedDates,
}: {
  blockedDates: BlockedDate[];
}) {
  const [state, formAction, isPending] = useActionState(
    addBlockedDateAction,
    initialState
  );
  const [isRemoving, startRemoving] = useTransition();

  return (
    <div>
      <p className="text-sm text-primary-700/70">
        Bloqueie um dia (viagem, feriado, imprevisto) e ele para de aparecer
        como disponível em <code>/horarios</code> e no agendamento — mães não
        conseguem marcar aula nesse dia.
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-primary-700">
          Data
          <input
            name="date"
            type="date"
            required
            className="mt-1 block rounded-md border border-primary-100 bg-white px-3 py-2 text-sm text-primary-700 outline-none focus:border-primary-400"
          />
        </label>
        <label className="flex-1 text-sm font-medium text-primary-700">
          Motivo (opcional, só pra você)
          <input
            name="reason"
            placeholder="Ex: viagem, feriado..."
            className="mt-1 w-full rounded-md border border-primary-100 bg-white px-3 py-2 text-sm text-primary-700 outline-none focus:border-primary-400"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {isPending ? "Bloqueando..." : "Bloquear dia"}
        </button>
      </form>

      {state.error && (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      )}

      {blockedDates.length > 0 && (
        <ul className="mt-5 space-y-2">
          {blockedDates.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 rounded-md border border-primary-100 bg-white px-3 py-2 text-sm"
            >
              <span className="text-primary-700">
                {formatDateBR(b.date)}
                {b.reason && (
                  <span className="text-primary-700/60"> — {b.reason}</span>
                )}
              </span>
              <button
                type="button"
                disabled={isRemoving}
                onClick={() =>
                  startRemoving(() => removeBlockedDateAction(b.id))
                }
                className="rounded-md p-1 text-primary-700/60 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Desbloquear dia"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
