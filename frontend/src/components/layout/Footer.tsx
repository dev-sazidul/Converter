import { Link } from "@/components/ui/Link";
import { AdSlot } from "@/components/ads/AdSlot";
import { EcosystemTools } from "@/components/layout/EcosystemTools";
import { availableTools } from "@/lib/tools";
import { container, focusRing } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <AdSlot slot="footer" className={`${container} pt-8`} />
      <div className={cnGrid()}>
        <div>
          <p className="text-base font-semibold text-ink">BestConvert</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
            PDF tools for everyday work. Documents are processed for the task and then deleted.
          </p>
          <div className="mt-4">
            <a
              href="https://futuresolutionai.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline ${focusRing} rounded-sm`}
            >
              A Product of FutureSolutionAI &rarr;
            </a>
          </div>
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Tools</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {availableTools().map((tool) => (
              <li key={tool.slug}>
                <Link className={`text-sm text-muted hover:text-primary ${focusRing} rounded-sm whitespace-nowrap`} to={`/${tool.slug}`}>
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
            <li><FooterLink to="/blog">Blog & Guides</FooterLink></li>
            <li><FooterLink to="/about">About</FooterLink></li>
            <li><FooterLink to="/help">Help</FooterLink></li>
            <li><FooterLink to="/contact">Contact</FooterLink></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Legal & Ecosystem</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><FooterLink to="/privacy">Privacy Policy</FooterLink></li>
            <li><FooterLink to="/terms">Terms of Service</FooterLink></li>
            <li className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted">Sister Tools</li>
            <li>
              <a
                href="https://imagecustomize.site"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-muted hover:text-primary ${focusRing} rounded-sm inline-flex items-center gap-1`}
              >
                ImageCustomize
              </a>
            </li>
            <li>
              <a
                href="https://bestdownloader.site"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-muted hover:text-primary ${focusRing} rounded-sm inline-flex items-center gap-1`}
              >
                BestDownloader
              </a>
            </li>
            <li>
              <a
                href="https://futuresolutionai.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-muted hover:text-primary ${focusRing} rounded-sm inline-flex items-center gap-1`}
              >
                FutureSolutionAI
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className={`${container} pb-4`}>
        <EcosystemTools variant="footer" />
      </div>
      <div className="border-t border-line">
        <p className={`${container} py-4 text-xs text-muted flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`}>
          <span>© {new Date().getFullYear()} BestConvert. A Product of <a href="https://futuresolutionai.com" target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:text-primary underline">FutureSolutionAI</a>. All rights reserved.</span>
          <span>Files stay on the server only until the download expires.</span>
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
  return `${container} grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5`;
}
