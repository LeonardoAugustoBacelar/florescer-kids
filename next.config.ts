import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // O domínio antigo (florecerkids.com.br, sem o "s") continua registrado e
  // apontando pra Vercel. Em vez de tirá-lo do ar, mandamos tudo pro domínio
  // certo: quem tem o link antigo continua chegando, e o histórico de SEO já
  // indexado é transferido em vez de perdido.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "florecerkids.com.br" }],
        destination: "https://florescerkids.com.br/:path*",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // Sem SENTRY_AUTH_TOKEN configurado, o upload de source maps é pulado
  // automaticamente (stack traces minificados no Sentry, mas captura de
  // erro funciona normalmente).
  org: undefined,
  project: undefined,
});
