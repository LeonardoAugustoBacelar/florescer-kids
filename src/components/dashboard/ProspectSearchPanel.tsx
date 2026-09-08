"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  enrichProspectEmailsAction,
  runProspectSearchAction,
} from "@/lib/actions/prospect";

// Espelha a ordem de CATEGORIAS em overpass.ts. Fica aqui, e não importado do
// módulo de actions, porque arquivo "use server" só deve exportar função —
// constante atravessando essa fronteira chega undefined no cliente.
const NOMES_CATEGORIA = [
  "escolas",
  "creches",
  "berçários",
  "psicólogos",
  "fonoaudiólogos",
  "clínicas",
  "consultórios",
];

const TIPOS = [
  { valor: "ESCOLA_INFANTIL", rotulo: "Escolas infantis" },
  { valor: "CRECHE", rotulo: "Creches" },
  { valor: "CLINICA_PEDIATRICA", rotulo: "Pediatras" },
  { valor: "PSICOLOGIA", rotulo: "Psicólogos infantis" },
  { valor: "FONOAUDIOLOGIA", rotulo: "Fonoaudiólogos" },
];

type Fase =
  | { nome: "parado" }
  | { nome: "buscando"; categoria: string; feitas: number; total: number }
  | { nome: "emails"; feitos: number; total: number; comEmail: number }
  | {
      nome: "pronto";
      novos: number;
      atualizados: number;
      comEmail: number;
      falhas: string[];
    };

export default function ProspectSearchPanel({
  pendentesDeEmail,
}: {
  pendentesDeEmail: number;
}) {
  const router = useRouter();
  const [raioKm, setRaioKm] = useState(20);
  const [tipos, setTipos] = useState<string[]>(TIPOS.map((t) => t.valor));
  const [fase, setFase] = useState<Fase>({ nome: "parado" });
  const [erro, setErro] = useState<string | null>(null);

  const rodando = fase.nome === "buscando" || fase.nome === "emails";

  function alternarTipo(valor: string) {
    setTipos((atual) =>
      atual.includes(valor)
        ? atual.filter((t) => t !== valor)
        : [...atual, valor]
    );
  }

  /**
   * Chama o enriquecimento repetidamente até a fila zerar.
   *
   * O laço vive aqui no navegador de propósito: cada chamada é uma execução
   * curta e independente no servidor, então uma fila grande não depende de
   * nenhuma requisição sobreviver por minutos — e a barra anda a cada lote.
   */
  async function buscarEmails(total: number) {
    let feitos = 0;
    let comEmail = 0;
    setFase({ nome: "emails", feitos, total, comEmail });

    // Teto de segurança: se o servidor parar de diminuir a fila, a tela para
    // em vez de girar pra sempre.
    for (let volta = 0; volta < 200; volta++) {
      const r = await enrichProspectEmailsAction(5);
      feitos += r.processados;
      comEmail += r.comEmail;
      setFase({ nome: "emails", feitos, total, comEmail });
      if (r.restantes === 0 || r.processados === 0) break;
    }
    return comEmail;
  }

  async function iniciar() {
    setErro(null);
    let novos = 0;
    let atualizados = 0;
    let comEmail = 0;
    const falhas: string[] = [];

    try {
      // Uma categoria por chamada: cada uma responde em segundos e a tela diz
      // qual está rodando, em vez de um botão parado por minutos.
      for (let indice = 0; indice < NOMES_CATEGORIA.length; indice++) {
        setFase({
          nome: "buscando",
          categoria: NOMES_CATEGORIA[indice] ?? "",
          feitas: indice,
          total: NOMES_CATEGORIA.length,
        });
        const r = await runProspectSearchAction({ raioKm, tipos, indice });
        if (r.falhou) falhas.push(r.categoria);
        novos += r.novos;
        atualizados += r.atualizados;
        comEmail += r.comEmail;
      }

      // Boa parte das fichas do OSM já vem com e-mail; o enriquecimento só
      // precisa cobrir as que têm site e não têm endereço publicado.
      const dosSites = await buscarEmails(novos);
      setFase({
        nome: "pronto",
        novos,
        atualizados,
        comEmail: comEmail + dosSites,
        falhas,
      });
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
      setFase({ nome: "parado" });
    }
  }

  async function soEmails() {
    setErro(null);
    try {
      const comEmail = await buscarEmails(pendentesDeEmail);
      setFase({ nome: "pronto", novos: 0, atualizados: 0, comEmail, falhas: [] });
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
      setFase({ nome: "parado" });
    }
  }

  const progresso =
    fase.nome === "emails" && fase.total > 0
      ? Math.min(100, Math.round((fase.feitos / fase.total) * 100))
      : 0;

  return (
    <div className="rounded-lg border border-primary-100 bg-white p-5">
      <h2 className="font-bold text-primary-700">Buscar parceiros na região</h2>
      <p className="mt-1 text-sm text-primary-700/70">
        Procura escolas, creches e consultórios em volta de Cotia no
        OpenStreetMap, escreve a mensagem de cada um e traz tudo pra fila
        abaixo. Nenhum e-mail é enviado nesta etapa.
      </p>

      <div className="mt-5">
        <label className="flex items-baseline justify-between text-sm font-semibold text-primary-700">
          Raio da busca
          <span className="font-mono text-xs font-normal text-primary-700/60">
            {raioKm} km de Cotia
          </span>
        </label>
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={raioKm}
          disabled={rodando}
          onChange={(e) => setRaioKm(Number(e.target.value))}
          className="mt-2 w-full accent-primary-700"
        />
        <p className="text-xs text-primary-700/60">
          Comece perto: parceria a até 10 km é a que vira aula presencial.
        </p>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-primary-700">Tipos de parceiro</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIPOS.map((t) => {
            const ativo = tipos.includes(t.valor);
            return (
              <button
                key={t.valor}
                type="button"
                disabled={rodando}
                onClick={() => alternarTipo(t.valor)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  ativo
                    ? "bg-primary-700 text-white"
                    : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                }`}
              >
                {t.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {erro && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {erro}
        </p>
      )}

      {fase.nome === "buscando" && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-primary-700/70">
            <span>Procurando {fase.categoria} no mapa...</span>
            <span className="font-mono">
              {fase.feitas + 1}/{fase.total}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-50">
            <div
              className="h-full rounded-full bg-primary-700 transition-all duration-300"
              style={{ width: `${Math.round((fase.feitas / fase.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {fase.nome === "emails" && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-primary-700/70">
            <span>Procurando e-mail nos sites...</span>
            <span className="font-mono">
              {fase.feitos}/{fase.total} · {fase.comEmail} achados
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-50">
            <div
              className="h-full rounded-full bg-primary-700 transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {fase.nome === "pronto" && (
        <>
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
            {fase.novos} novos · {fase.atualizados} atualizados ·{" "}
            {fase.comEmail} com e-mail encontrado. A fila está abaixo.
          </p>
          {fase.falhas.length > 0 && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              O servidor do OpenStreetMap recusou {fase.falhas.join(", ")} desta
              vez — é sobrecarga passageira nas instâncias públicas. Buscar de
              novo daqui a alguns minutos completa o que faltou.
            </p>
          )}
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={iniciar}
          disabled={rodando || tipos.length === 0}
          className="rounded-md bg-primary-700 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {fase.nome === "buscando"
            ? `Buscando ${fase.categoria}...`
            : fase.nome === "emails"
              ? "Procurando e-mails..."
              : "Buscar agora"}
        </button>

        {pendentesDeEmail > 0 && !rodando && (
          <button
            onClick={soEmails}
            className="rounded-md border border-primary-100 px-5 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            Só procurar e-mails ({pendentesDeEmail} pendentes)
          </button>
        )}
      </div>
    </div>
  );
}
