"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  FileSearch2,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Portfolio", icon: LayoutDashboard },
  { href: "/follow-ups", label: "Follow-ups", icon: ListChecks },
  { href: "/evidence", label: "Evidence", icon: FileSearch2 },
  { href: "/imports", label: "Imports", icon: FileUp },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = (
    <nav aria-label="Primary navigation" className="space-y-1">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === "/" || pathname.startsWith("/projects/")
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileMenuOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white px-4 py-6 lg:block">
        <Link href="/" className="mb-9 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
            <Activity size={21} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-wide">
              ONTRACK
            </span>
            <span className="block text-xs text-slate-500">
              Project Intelligence
            </span>
          </span>
        </Link>
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Workspace
        </p>
        {navLinks}
        <div className="absolute inset-x-4 bottom-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FolderKanban size={16} aria-hidden="true" />
            Decision support
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Assessments are based on project data and operational evidence.
          </p>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white px-4 py-6 transition-transform lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
              <Activity size={21} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-wide">
                ONTRACK
              </span>
              <span className="block text-xs text-slate-500">
                Project Intelligence
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {navLinks}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              Portfolio intelligence
            </span>
          </div>
          <span className="hidden text-xs text-slate-500 sm:inline">
            Source data · Operational evidence · Assessment
          </span>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
