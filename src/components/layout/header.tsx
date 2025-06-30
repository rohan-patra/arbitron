import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b p-4">
      <nav className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          Arbitron
        </Link>
        <div>
          <Link href="/dashboard" className="mr-4">
            Dashboard
          </Link>
          <Link href="/strategies" className="mr-4">
            Strategies
          </Link>
          <Link href="/portfolio">Portfolio</Link>
        </div>
      </nav>
    </header>
  );
}
