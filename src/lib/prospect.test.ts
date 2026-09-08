import { describe, expect, it } from "vitest";
import {
  BASE,
  BUSCAS,
  classificar,
  distanciaKm,
  escolherEmail,
  extrairEmails,
  redigirPrimeiroContato,
  valeContatar,
  ehRedePublica,
  type PlaceBruto,
  type ProspectKind,
} from "./prospect";

function place(over: Partial<PlaceBruto> = {}): PlaceBruto {
  return {
    placeId: "abc",
    name: "Escola Infantil Girassol",
    address: "Rua X, Cotia",
    location: BASE,
    phone: "1140028922",
    website: "https://girassol.com.br",
    businessStatus: "OPERATIONAL",
    ...over,
  };
}

describe("classificação", () => {
  it("usa o nome antes da categoria do mapa", () => {
    // A ficha vem como point_of_interest, mas o nome entrega que é creche.
    expect(classificar("Creche Pequeno Príncipe", ["point_of_interest"])).toBe(
      "CRECHE"
    );
  });

  it("cai na categoria do OpenStreetMap quando o nome não diz nada", () => {
    expect(classificar("Espaço Aurora", ["school"])).toBe("ESCOLA_INFANTIL");
    expect(classificar("Espaço Aurora", ["kindergarten"])).toBe("CRECHE");
    expect(classificar("Recanto", ["childcare"])).toBe("CRECHE");
    expect(classificar("Consultório", ["speech_therapist"])).toBe("FONOAUDIOLOGIA");
  });

  it("separa fono de psicologia", () => {
    expect(classificar("Clínica de Fonoaudiologia Falar", [])).toBe(
      "FONOAUDIOLOGIA"
    );
    expect(classificar("Psicologia Infantil Cotia", [])).toBe("PSICOLOGIA");
  });

  it("devolve OUTRO em vez de chutar", () => {
    expect(classificar("Padaria do Bairro", [])).toBe("OUTRO");
  });
});

describe("distância", () => {
  it("é zero na própria base", () => {
    expect(distanciaKm(BASE, BASE)).toBeCloseTo(0);
  });

  it("bate com a distância real de Cotia até a Sé", () => {
    const se = { lat: -23.5505, lng: -46.6333 };
    expect(distanciaKm(BASE, se)).toBeGreaterThan(25);
    expect(distanciaKm(BASE, se)).toBeLessThan(35);
  });
});

describe("filtro da fila", () => {
  it("aceita o que está aberto, perto e com contato", () => {
    expect(valeContatar(place())).toBe(true);
  });

  it("descarta ficha fechada", () => {
    // Este é o que mais aparece na prática: escola que mudou de endereço
    // continua na base do Google como CLOSED_PERMANENTLY.
    expect(valeContatar(place({ businessStatus: "CLOSED_PERMANENTLY" }))).toBe(
      false
    );
  });

  it("descarta quem não tem nenhum canal de contato", () => {
    expect(valeContatar(place({ phone: null, website: null, email: null }))).toBe(
      false
    );
  });

  it("aceita quem só tem e-mail — o OSM costuma trazer só isso", () => {
    expect(
      valeContatar(
        place({ phone: null, website: null, email: "contato@escola.com.br" })
      )
    ).toBe(true);
  });

  it("descarta o que está fora do raio", () => {
    const campinas = { lat: -22.9099, lng: -47.0626 };
    expect(valeContatar(place({ location: campinas }))).toBe(false);
  });
});

describe("e-mails do site", () => {
  it("extrai e remove duplicata", () => {
    const html = `<a href="mailto:Contato@Escola.com.br">Contato@Escola.com.br</a>`;
    expect(extrairEmails(html)).toEqual(["contato@escola.com.br"]);
  });

  it("ignora o e-mail do fornecedor do site", () => {
    // Rodapé de template traz o endereço de quem fez o site, não da escola.
    const html = `contato@escola.com.br e suporte@wixpress.com`;
    expect(extrairEmails(html)).toEqual(["contato@escola.com.br"]);
  });

  it("não confunde arquivo com e-mail", () => {
    expect(extrairEmails(`<img src="logo@2x.png">`)).toEqual([]);
  });

  it("prefere o endereço institucional ao pessoal", () => {
    expect(
      escolherEmail(["joana.silva@escola.com.br", "secretaria@escola.com.br"])
    ).toBe("secretaria@escola.com.br");
  });

  it("devolve null quando não achou nada", () => {
    expect(escolherEmail([])).toBe(null);
  });

  it("prefere o e-mail do domínio do próprio site", () => {
    // Caso real: o Colégio Desafio publica no rodapé o endereço da agência que
    // fez a página. Sem esta regra, o primeiro contato ia pro fornecedor.
    expect(
      escolherEmail(
        ["sac@qlocal.com.br", "secretaria@colegiodesafio.com.br"],
        "https://www.colegiodesafio.com.br"
      )
    ).toBe("secretaria@colegiodesafio.com.br");
  });

  it("aceita o que houver quando nenhum e-mail é do domínio do site", () => {
    expect(
      escolherEmail(["contato@gmail.com"], "https://escola.com.br")
    ).toBe("contato@gmail.com");
  });
});

describe("primeiro contato", () => {
  const dados = {
    professora: { nome: "Gilda", whatsapp: "(11) 97040-6208" },
    siteUrl: "https://florescerkids.com.br",
  };

  it("cita o nome da instituição — é o que separa de disparo em massa", () => {
    const { subject, body } = redigirPrimeiroContato({
      ...dados,
      prospect: { name: "Escola Girassol", kind: "ESCOLA_INFANTIL", distanceKm: 3 },
    });
    expect(subject).toContain("Escola Girassol");
    expect(body).toContain("Escola Girassol");
    expect(body).toContain("Gilda");
  });

  it("oferece visita quando é perto, e flexibilidade quando é longe", () => {
    const perto = redigirPrimeiroContato({
      ...dados,
      prospect: { name: "A", kind: "CRECHE", distanceKm: 2 },
    });
    const longe = redigirPrimeiroContato({
      ...dados,
      prospect: { name: "B", kind: "CRECHE", distanceKm: 18 },
    });
    expect(perto.body).toContain("pessoalmente");
    expect(longe.body).toContain("online");
  });

  it("muda o pedido conforme o tipo de parceiro", () => {
    // Escola recebe convite de palestra; consultório recebe encaminhamento.
    const escola = redigirPrimeiroContato({
      ...dados,
      prospect: { name: "A", kind: "ESCOLA_INFANTIL", distanceKm: 5 },
    });
    const fono = redigirPrimeiroContato({
      ...dados,
      prospect: { name: "B", kind: "FONOAUDIOLOGIA", distanceKm: 5 },
    });
    expect(escola.subject).toContain("Roda de conversa");
    expect(fono.subject).toContain("encaminhamento");
  });

  it("todo tipo de parceiro tem texto próprio", () => {
    const tipos = [...Object.keys(BUSCAS), "OUTRO"] as ProspectKind[];
    for (const kind of tipos) {
      const { subject, body } = redigirPrimeiroContato({
        ...dados,
        prospect: { name: "X", kind, distanceKm: 5 },
      });
      expect(subject.length, kind).toBeGreaterThan(10);
      expect(body, kind).toContain("Gilda");
    }
  });
});

describe("rede pública", () => {
  it("reconhece escola estadual e municipal", () => {
    expect(ehRedePublica("Escola Estadual Batista Cepelos")).toBe(true);
    expect(ehRedePublica("Escola Municipal Francisca Manoel")).toBe(true);
    expect(ehRedePublica("EMEI Jardim Nomura")).toBe(true);
  });

  it("não marca escola particular", () => {
    // O sinal muda a expectativa, não o texto: particular converte em aula
    // mais rápido, pública dá alcance. Errar aqui bagunça a priorização.
    expect(ehRedePublica("Colégio Talento")).toBe(false);
    expect(ehRedePublica("Escola Infantil Girassol")).toBe(false);
  });
});
