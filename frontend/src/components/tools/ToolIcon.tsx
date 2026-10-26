import {
  Droplets,
  FileCheck,
  FileImage,
  FileSpreadsheet,
  FileText,
  Files,
  Globe,
  Hash,
  ImagePlus,
  Lock,
  Minimize2,
  Monitor,
  PenLine,
  RotateCw,
  ScanLine,
  Scissors,
  Unlock,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const toolIcons: Record<string, LucideIcon> = {
  files: Files,
  scissors: Scissors,
  minimize: Minimize2,
  rotate: RotateCw,
  fileImage: FileImage,
  imagePlus: ImagePlus,
  fileText: FileText,
  spreadsheet: FileSpreadsheet,
  monitor: Monitor,
  pen: PenLine,
  lock: Lock,
  unlock: Unlock,
  hash: Hash,
  wrench: Wrench,
  scan: ScanLine,
  droplets: Droplets,
  globe: Globe,
  fileCheck: FileCheck,
};

export function ToolIcon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const Icon = toolIcons[name] ?? Files;
  return <Icon className={className} aria-hidden="true" />;
}
