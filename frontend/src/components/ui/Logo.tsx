import { Link } from "@/components/ui/Link";
import { focusRing } from "@/lib/utils";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 rounded-lg ${focusRing} ${className}`} aria-label="Converter home">
      <svg viewBox="0 0 32 32" aria-hidden="true" className="h-9 w-9">
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <rect x="8" y="6" width="14" height="18" rx="2.5" className="fill-primary-soft" />
        <path d="M16.5 6.8V11.2c0 .6.5 1.1 1.1 1.1h4.2" className="stroke-primary" strokeWidth="1.4" fill="none" />
        <path d="M11.5 15.5h8M11.5 18.5h5.5" className="stroke-primary" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-ink">Converter</span>
    </Link>
  );
}
