"use client";

import { useActionState, useMemo, useState } from "react";
import { createBookingAction, type BookingState } from "@/lib/actions/booking";
import { getDaySlots, SCHEDULE_RULES } from "@/lib/schedule";
import { formatDateBR, parseDateOnly } from "@/lib/date";
import WhatsAppInlineButton from "@/components/WhatsAppInlineButton";

const initialState: BookingState = {};

export default function BookingForm({
  teacherId,
  teacherWhatsapp,
  bookedSlots = [],
  blockedDates = [],
}: {
  teacherId: string;
  teacherWhatsapp: string;
  bookedSlots?: { date: string; startTime: string }[];
  blockedDates?: string[];
}) {
  const [state, formAction, isPending] = useActionState(
    createBookingAction,
    initialState
  );
  const [date, setDate] = useState("");
  const [childName, setChildName] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);

  const takenTimesForDate = useMemo(
    () =>
      new Set(
        bookedSlots.filter((b) => b.date === date).map((b) => b.startTime)
      ),
    [bookedSlots, date]
  );

  const bookedCountForDate = useMemo(
    () => bookedSlots.filter((b) => b.date === date).length,
    [bookedSlots, date]
  );

  const dayIsFull = bookedCountForDate >= SCHEDULE_RULES.maxBookingsPerDay;
  const dayIsBlocked = date ? blockedDates.includes(date) : false;

  const slotsForDay = useMemo(
    () =>
      date
        ? getDaySlots(parseDateOnly(date)).map((slot) => ({
            ...slot,
            taken: takenTimesForDate.has(slot.startTime),
          }))
        : [],
    [date, takenTimesForDate]
  );

  const availableSlotsForDay =
    dayIsFull || dayIsBlocked ? [] : slotsForDay.filter((s) => !s.taken);

  if (state.success) {
    const dateLabel = date ? formatDateBR(parseDateOnly(date)) : "";
    const receiptMessage = `Olá! Acabei de agendar uma aula${
      childName ? ` para ${childName}` : ""
    }${dateLabel ? ` no dia ${dateLabel}` : ""}${
      selectedSlot ? ` às ${selectedSlot.startTime}` : ""
    }. Segue o comprovante do PIX:`;

    return (
      <div className="rounded-lg border border-primary-100 bg-primary-50 p-6 text-center">
        <p className="font-bold text-primary-700">
          Solicitação de aula enviada!
        </p>
        <p className="mt-2 text-sm text-primary-700/80">
          A professora vai confirmar o horário em breve. Acompanhe em
          &quot;Minha área&quot; — o link da videochamada aparece lá assim que
          a aula for confirmada.
        </p>
        <p className="mt-4 text-sm text-primary-700/80">
          Já pagou pelo PIX? Envie o comprovante para confirmar sua vaga:
        </p>
        <div className="mt-3 flex justify-center">
          <WhatsAppInlineButton
            phone={teacherWhatsapp}
            message={receiptMessage}
            label="Enviar comprovante no WhatsApp"
          />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="teacherId" value={teacherId} />

      <div className="rounded-md bg-primary-50 p-3 text-xs text-primary-700/80">
        <p className="font-semibold text-primary-700">Horários de atendimento:</p>
        <p className="mt-1">
          Segunda a sexta, a partir das {SCHEDULE_RULES.weekdayStart}. Sábado
          e domingo, a partir das {SCHEDULE_RULES.weekendStart}. Até no máximo{" "}
          {SCHEDULE_RULES.maxBookingsPerDay} aulas por dia.
        </p>
      </div>

      <label className="block text-sm font-medium text-primary-700">
        Nome da criança
        <input
          name="childName"
          required
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          className="mt-1 w-full rounded-md border border-primary-100 bg-white px-4 py-2.5 text-sm text-primary-700 outline-none focus:border-primary-400"
        />
      </label>

      <label className="block text-sm font-medium text-primary-700">
        Data da aula
        <input
          name="date"
          type="date"
          required
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSelectedSlot(null);
          }}
          className="mt-1 w-full rounded-md border border-primary-100 bg-white px-4 py-2.5 text-sm text-primary-700 outline-none focus:border-primary-400"
        />
      </label>

      {date && dayIsBlocked && (
        <p className="text-sm text-accent-600">
          A professora não está disponível nesse dia. Escolha outra data.
        </p>
      )}

      {date && !dayIsBlocked && dayIsFull && (
        <p className="text-sm text-accent-600">
          Esse dia já atingiu o limite de {SCHEDULE_RULES.maxBookingsPerDay}{" "}
          aulas. Escolha outra data.
        </p>
      )}

      {date && !dayIsBlocked && !dayIsFull && availableSlotsForDay.length === 0 && (
        <p className="text-sm text-accent-600">
          Todos os horários desse dia já estão reservados. Escolha outra data.
        </p>
      )}

      {slotsForDay.length > 0 && !dayIsBlocked && (
        <label className="block text-sm font-medium text-primary-700">
          Horário
          <select
            name="slot"
            required
            className="mt-1 w-full rounded-md border border-primary-100 bg-white px-4 py-2.5 text-sm text-primary-700 outline-none focus:border-primary-400"
            onChange={(e) => {
              const [start, end] = e.target.value.split("|");
              const form = e.target.closest("form")!;
              (form.elements.namedItem("startTime") as HTMLInputElement).value = start;
              (form.elements.namedItem("endTime") as HTMLInputElement).value = end;
              setSelectedSlot(start && end ? { startTime: start, endTime: end } : null);
            }}
          >
            <option value="">Selecione...</option>
            {slotsForDay.map((slot) => (
              <option
                key={slot.startTime}
                value={`${slot.startTime}|${slot.endTime}`}
                disabled={dayIsFull || slot.taken}
              >
                {slot.startTime} às {slot.endTime}
                {dayIsFull || slot.taken ? " (indisponível)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <input type="hidden" name="startTime" />
      <input type="hidden" name="endTime" />

      <label className="block text-sm font-medium text-primary-700">
        Observações (opcional)
        <textarea
          name="notes"
          rows={3}
          className="mt-1 w-full rounded-md border border-primary-100 bg-white px-4 py-2.5 text-sm text-primary-700 outline-none focus:border-primary-400"
        />
      </label>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || availableSlotsForDay.length === 0}
        className="btn-press w-full rounded-md bg-accent-500 px-6 py-3 font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Solicitar aula"}
      </button>
    </form>
  );
}
