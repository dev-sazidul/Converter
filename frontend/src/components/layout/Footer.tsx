import { Link } from "@/components/ui/Link";
import { AdSlot } from "@/components/ads/AdSlot";
import { availableTools } from "@/lib/tools";
import { container, focusRing } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className={`${container} pt-8`}>
        <AdSlot slot="footer" />
      </div>
      <div className={cnGrid()}>
        <div>
          <p className="text-base font-semibold text-ink">Convarter</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
            PDF tools for everyday work. Documents are processed for the task and then deleted.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Tools</h2>
          <ul className="mt-3 space-y-2">
            {availableTools().map((tool) => (
              <li key={tool.slug}>
                <Link className={`text-sm text-muted hover:text-primary ${focusRing} rounded-sm`} to={`/${tool.slug}`}>
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Product</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><FooterLink to="/">Home</FooterLink></li>
            <li><FooterLink to="/convert-pdf">Convert PDF</FooterLink></li>
            <li><FooterLink to="/tools">All tools</FooterLink></li>
            <li><FooterLink to="/about">About</FooterLink></li>
            <li><FooterLink to="/help">Help</FooterLink></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Legal</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><FooterLink to="/privacy">Privacy</FooterLink></li>
            <li><FooterLink to="/terms">Terms</FooterLink></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className={`${container} py-4 text-xs text-muted`}>
          © {new Date().getFullYear()} Convarter. Files stay on the server only until the download expires.
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className={`text-muted hover:text-primary ${focusRing} rounded-sm`}>
      {children}
    </Link>
  );
}

function cnGrid() {
  return `${container} grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4`;
}
