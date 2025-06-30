import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="border-r p-4">
      <nav className="flex flex-col">
        <Link href="/dashboard" className="mb-2">
          Dashboard
        </Link>
        <Link href="/strategies" className="mb-2">
          Strategies
        </Link>
        <Link href="/portfolio" className="mb-2">
          Portfolio
        </Link>
        <Link href="/settings">Settings</Link>
      </nav>
    </aside>
  );
}
