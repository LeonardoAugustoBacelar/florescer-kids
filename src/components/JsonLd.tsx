/**
 * Injeta um bloco JSON-LD (schema.org) na página.
 *
 * É como o Google entende o que a página descreve — quem atende, onde, por
 * quanto, com que avaliação — em vez de tentar deduzir isso do texto corrido.
 * Sem isso, o site é só um monte de parágrafos pro robô.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // O `<` vai escapado porque o JSON carrega texto escrito por pessoas
      // (bio da professora, comentários das mães): um "</script>" perdido no
      // meio fecharia a tag antes da hora e quebraria a página.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
