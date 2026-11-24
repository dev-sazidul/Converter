"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Link, NavLink } from "@/components/ui/Link";
import { MoreMenu } from "@/components/layout/MoreMenu";
import { ConvertSection } from "@/components/tools/ConvertSection";
import { Logo } from "@/components/ui/Logo";
import { availableTools, tools } from "@/lib/tools";
import { cn, container, focusRing } from "@/lib/utils";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-lg px-3 py-2 text-sm font-medium",
    focusRing,
    isActive ? "text-primary" : "text-ink/80 hover:bg-primary-soft hover:text-ink",
  );

export function Header() {
  const pathname = usePathname();
  const onConvertPage = pathname === "/convert-pdf";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const convertRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const featured = tools.filter((tool) => tool.featured && tool.status === "available");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConvertOpen(false);
        setMoreOpen(false);
        setMobileOpen(false);
      }
    }
    function onPointer(event: MouseEvent) {
      if (!convertRef.current?.contains(event.target as Node)) setConvertOpen(false);
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, []);

  useEffect(() => {
    setConvertOpen(false);
    setMoreOpen(false);
    setMobileOpen(false);
    setMobileMoreOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/90 backdrop-blur">
      <div className={cn(container, "flex h-16 items-center gap-3")}>
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary">
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          {featured.map((tool) => (
            <NavLink key={tool.slug} to={`/${tool.slug}`} className={linkClass}>
              {tool.name}
            </NavLink>
          ))}
          <NavLink to="/blog" className={linkClass}>
            Blog
          </NavLink>
          <div className="relative" ref={convertRef}>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-soft",
                focusRing,
                convertOpen || onConvertPage ? "text-primary" : "text-ink/80",
              )}
              aria-expanded={convertOpen}
              aria-haspopup="true"
              aria-controls="convert-pdf-menu"
              onClick={() => {
                setMoreOpen(false);
                setConvertOpen((open) => !open);
              }}
            >
              Convert PDF
              <ChevronDown className={cn("h-4 w-4 transition-transform", convertOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {convertOpen && (
              <div
                id="convert-pdf-menu"
                className="absolute right-0 top-12 w-[40rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-6 shadow-card"
                role="menu"
              >
                <ConvertSection variant="menu" onNavigate={() => setConvertOpen(false)} />
                <Link
                  to="/convert-pdf"
                  className={cn("mt-4 inline-flex text-sm font-medium text-primary hover:underline", focusRing, "rounded-sm")}
                  onClick={() => setConvertOpen(false)}
                >
                  Open the Convert PDF page
                </Link>
              </div>
            )}
          </div>
        </nav>
        <div className="ml-auto hidden items-center gap-1 sm:flex">
          <Link to="/help" className={cn("rounded-lg px-3 py-2 text-sm font-medium text-ink/80 hover:bg-primary-soft", focusRing)}>
            Help
          </Link>
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-primary-soft",
                focusRing,
                moreOpen ? "text-primary" : "text-ink",
              )}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              aria-controls="more-menu"
              aria-label="More"
              title="More"
              onClick={() => {
                setConvertOpen(false);
                setMoreOpen((open) => !open);
              }}
            >
              <span className="grid grid-cols-3 gap-[3px]" aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => (
                  <span key={index} className="h-[3.5px] w-[3.5px] rounded-full bg-current" />
                ))}
              </span>
            </button>
            {moreOpen && (
              <div
                id="more-menu"
                className="z-40 max-h-[min(32rem,calc(100vh-5.5rem))] overflow-y-auto rounded-2xl border border-line bg-white p-6 shadow-card max-lg:fixed max-lg:inset-x-4 max-lg:top-16 lg:absolute lg:right-0 lg:top-12 lg:w-[min(52rem,calc(100vw-3rem))]"
                role="menu"
              >
                <MoreMenu onNavigate={() => setMoreOpen(false)} />
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className={cn("ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line sm:ml-0 lg:hidden", focusRing)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
      {mobileOpen && (
        <nav id="mobile-nav" className="border-t border-line bg-white px-4 py-3 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            <NavLink to="/" end className={linkClass} onClick={() => setMobileOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/convert-pdf" className={linkClass} onClick={() => setMobileOpen(false)}>
              Convert PDF
            </NavLink>
            <NavLink to="/blog" className={linkClass} onClick={() => setMobileOpen(false)}>
              Blog
            </NavLink>
            {availableTools().map((tool) => (
              <NavLink key={tool.slug} to={`/${tool.slug}`} className={linkClass} onClick={() => setMobileOpen(false)}>
                {tool.name}
              </NavLink>
            ))}
            <NavLink to="/help" className={linkClass} onClick={() => setMobileOpen(false)}>
              Help
            </NavLink>
            <button
              type="button"
              className={cn("rounded-lg px-3 py-2 text-left text-sm font-medium text-ink/80 hover:bg-primary-soft", focusRing)}
              aria-expanded={mobileMoreOpen}
              onClick={() => setMobileMoreOpen((open) => !open)}
            >
              More
            </button>
            {mobileMoreOpen && (
              <div className="rounded-2xl border border-line p-4">
                <MoreMenu onNavigate={() => setMobileOpen(false)} />
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
