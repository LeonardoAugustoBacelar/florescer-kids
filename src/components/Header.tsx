import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/actions/auth";
import MobileNav from "@/components/MobileNav";

export default async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-primary-100 bg-white/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-700 text-lg font-bold text-white">
            FK
          </span>
          <span className="text-lg font-bold tracking-tight text-primary-700">
            Florescer Kids
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-primary-600 md:flex">
          <Link href="/#servicos" className="nav-link transition-colors hover:text-primary-700">
            Serviços
          </Link>
          <Link href="/professoras" className="nav-link transition-colors hover:text-primary-700">
            Professora
          </Link>
          <Link href="/horarios" className="nav-link transition-colors hover:text-primary-700">
            Horários
          </Link>
          <Link href="/domicilio" className="nav-link transition-colors hover:text-primary-700">
            A domicílio
          </Link>
          <Link href="/blog" className="nav-link transition-colors hover:text-primary-700">
            Artigos
          </Link>
          <Link href="/#depoimentos" className="nav-link transition-colors hover:text-primary-700">
            Como trabalhamos
          </Link>
          <Link href="/#contato" className="nav-link transition-colors hover:text-primary-700">
            Contato
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                Minha área
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="btn-press rounded-md border border-primary-100 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="btn-press rounded-md bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
              >
                Criar conta
              </Link>
            </>
          )}
        </div>

        <MobileNav isAuthed={Boolean(session?.user)} signOutAction={signOutAction} />
      </div>
    </header>
  );
}
