import { ArrowUpRight, Sparkles, Image, Video, Cpu } from "lucide-react";
import { focusRing } from "@/lib/utils";

export type EcosystemToolsProps = {
  variant?: "default" | "compact" | "footer";
  className?: string;
};

export const sisterTools = [
  {
    name: "ImageCustomize",
    tagline: "Free Online Image Resizer, Compressor & Format Converter",
    url: "https://imagecustomize.site",
    description:
      "Resize, crop, compress, and convert PNG, WebP, JPG, and GIF images instantly in your browser with zero quality loss or watermarks.",
    badge: "Free Sister Tool",
    icon: Image,
    highlight: "Batch Image Optimization",
  },
  {
    name: "BestDownloader",
    tagline: "Free Social & Stock Video Downloader",
    url: "https://bestdownloader.site",
    description:
      "Save video and audio clips from top social networks and stock media platforms in high definition without watermarks or accounts.",
    badge: "Free Sister Tool",
    icon: Video,
    highlight: "HD Video & Audio",
  },
  {
    name: "FutureSolutionAI",
    tagline: "Custom Software, Web App & AI Studio",
    url: "https://futuresolutionai.com",
    description:
      "Engineering bespoke cloud applications, AI automation agents, enterprise data workflows, and modern web solutions for growing businesses.",
    badge: "Parent Studio",
    icon: Cpu,
    highlight: "Custom Web & AI Engineering",
  },
];

export function EcosystemTools({ variant = "default", className = "" }: EcosystemToolsProps) {
  if (variant === "footer") {
    return (
      <div className={`border-t border-line/80 pt-8 pb-4 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Ecosystem
            </span>
            <a
              href="https://futuresolutionai.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-primary transition-colors ${focusRing} rounded-sm`}
            >
              A Product of FutureSolutionAI
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
          <p className="text-xs text-muted">
            Explore sister utilities crafted for productivity and performance.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {sisterTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex flex-col justify-between rounded-xl border border-line bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card ${focusRing}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-muted/10 px-2 py-0.5 text-[11px] font-medium text-muted">
                      {tool.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-ink group-hover:text-primary flex items-center gap-1 transition-colors">
                    {tool.name}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </h3>
                  <p className="mt-1 text-xs font-medium text-muted line-clamp-1">{tool.tagline}</p>
                  <p className="mt-2 text-xs leading-5 text-muted/90 line-clamp-2">{tool.description}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className={`rounded-3xl border border-line bg-gradient-to-b from-primary-soft/20 via-white to-white p-6 sm:p-10 shadow-card ${className}`}>
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>A Product of FutureSolutionAI</span>
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          FutureSolutionAI Product Ecosystem
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted">
          Converter is part of a suite of free web productivity tools and AI solutions engineered by{" "}
          <a
            href="https://futuresolutionai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline underline-offset-2"
          >
            FutureSolutionAI
          </a>
          . Use our sister platforms for instant image optimization and media downloads.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {sisterTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-card ${focusRing}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-primary-soft/80 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {tool.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink group-hover:text-primary flex items-center gap-1.5 transition-colors">
                  {tool.name}
                  <ArrowUpRight className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </h3>
                <p className="mt-1 text-xs font-medium text-primary/90">{tool.highlight}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{tool.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs font-semibold text-primary">
                <span>Visit {tool.name}</span>
                <span className="text-muted text-[11px] group-hover:text-primary transition-colors">Free online &rarr;</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

