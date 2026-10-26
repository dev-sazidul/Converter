export type CategoryId = "all" | "organize" | "optimize" | "convert" | "edit" | "security";

export type ToolStatus = "available" | "soon";

export type ToolDefinition = {
  slug: string;
  name: string;
  description: string;
  summary: string;
  category: Exclude<CategoryId, "all">;
  status: ToolStatus;
  icon: string;
  accept: string[];
  acceptLabel: string;
  multiple: boolean;
  reorder: boolean;
  minFiles: number;
  maxFiles: number;
  minMessage: string;
  selectLabel: string;
  dropLabel: string;
  actionLabel: string;
  processingLabel: string;
  endpoint?: string;
  featured?: boolean;
  seoTitle: string;
  seoDescription: string;
};

export const categories: { id: CategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "organize", label: "Organize" },
  { id: "optimize", label: "Optimize" },
  { id: "convert", label: "Convert" },
  { id: "edit", label: "Edit" },
  { id: "security", label: "Security" },
];

export const tools: ToolDefinition[] = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    description: "Join several PDFs into one file, in the order you choose.",
    summary: "Combine PDFs from top to bottom. Drag a file to change the order before merging.",
    category: "organize",
    status: "available",
    icon: "files",
    accept: ["application/pdf"],
    acceptLabel: "PDF",
    multiple: true,
    reorder: true,
    minFiles: 2,
    maxFiles: 20,
    minMessage: "Add at least two PDF files to merge.",
    selectLabel: "Select PDF files",
    dropLabel: "or drop PDFs here",
    actionLabel: "Merge PDF",
    processingLabel: "Merging PDFs…",
    endpoint: "/api/v1/tools/merge",
    featured: true,
    seoTitle: "Merge PDF online — Convarter",
    seoDescription: "Combine multiple PDF files into one document, in the order you choose. Files are deleted automatically.",
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    description: "Extract page ranges or save each page as its own PDF.",
    summary: "Pull out the pages you need, split every page, or break the file into equal parts.",
    category: "organize",
    status: "available",
    icon: "scissors",
    accept: ["application/pdf"],
    acceptLabel: "PDF",
    multiple: false,
    reorder: false,
    minFiles: 1,
    maxFiles: 1,
    minMessage: "Add a PDF to split.",
    selectLabel: "Select PDF file",
    dropLabel: "or drop a PDF here",
    actionLabel: "Split PDF",
    processingLabel: "Splitting PDF…",
    endpoint: "/api/v1/tools/split",
    featured: true,
    seoTitle: "Split PDF online — Convarter",
    seoDescription: "Separate a PDF by page ranges, into individual pages, or every few pages. Download a PDF or a ZIP.",
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    description: "Shrink large PDFs while keeping the document readable.",
    summary: "Choose how small the file should get. Photos shrink the most. Text that is already compact may stay the same size.",
    category: "optimize",
    status: "available",
    icon: "minimize",
    accept: ["application/pdf"],
    acceptLabel: "PDF",
    multiple: true,
    reorder: false,
    minFiles: 1,
    maxFiles: 20,
    minMessage: "Add a PDF to compress.",
    selectLabel: "Select PDF files",
    dropLabel: "or drop PDFs here",
    actionLabel: "Compress PDF",
    processingLabel: "Compressing PDF…",
    endpoint: "/api/v1/tools/compress",
    featured: true,
    seoTitle: "Compress PDF online — Convarter",
    seoDescription: "Reduce PDF file size with real image and structure compression. Download the smaller file when it's ready.",
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    description: "Turn pages clockwise by 90, 180, or 270 degrees.",
    summary: "Rotate every page, or only the pages you list. The rest of the document stays as it is.",
    category: "organize",
    status: "available",
    icon: "rotate",
    accept: ["application/pdf"],
    acceptLabel: "PDF",
    multiple: true,
    reorder: false,
    minFiles: 1,
    maxFiles: 20,
    minMessage: "Add a PDF to rotate.",
    selectLabel: "Select PDF files",
    dropLabel: "or drop PDFs here",
    actionLabel: "Rotate PDF",
    processingLabel: "Rotating PDF…",
    endpoint: "/api/v1/tools/rotate",
    seoTitle: "Rotate PDF pages online — Convarter",
    seoDescription: "Rotate selected PDF pages clockwise by 90, 180, or 270 degrees and download the corrected file.",
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Save each PDF page as a JPG image.",
    summary: "Convert every page, or a range, into JPG images. One page downloads directly. Several pages come in a ZIP.",
    category: "convert",
    status: "available",
    icon: "fileImage",
    accept: ["application/pdf"],
    acceptLabel: "PDF",
    multiple: false,
    reorder: false,
    minFiles: 1,
    maxFiles: 1,
    minMessage: "Add a PDF to convert.",
    selectLabel: "Select PDF file",
    dropLabel: "or drop a PDF here",
    actionLabel: "Convert to JPG",
    processingLabel: "Converting to JPG…",
    endpoint: "/api/v1/tools/pdf-to-jpg",
    seoTitle: "PDF to JPG online — Convarter",
    seoDescription: "Convert PDF pages into JPG images at screen, standard, or high resolution.",
  },
  {
    slug: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Turn JPG or PNG images into a single PDF.",
    summary: "Arrange images in order and place them on a fitted page, A4, or US Letter.",
    category: "convert",
    status: "available",
    icon: "imagePlus",
    accept: ["image/jpeg", "image/png"],
    acceptLabel: "JPG or PNG",
    multiple: true,
    reorder: true,
    minFiles: 1,
    maxFiles: 20,
    minMessage: "Add at least one JPG or PNG image.",
    selectLabel: "Select images",
    dropLabel: "or drop images here",
    actionLabel: "Create PDF",
    processingLabel: "Creating PDF…",
    endpoint: "/api/v1/tools/jpg-to-pdf",
    seoTitle: "JPG to PDF online — Convarter",
    seoDescription: "Combine JPG and PNG images into one PDF. Fit the page to each image or use A4 or Letter.",
  },
  soon("pdf-to-word", "PDF to Word", "Turn a PDF into an editable Word document.", "convert", "fileText"),
  soon("word-to-pdf", "Word to PDF", "Convert a Word document into a PDF.", "convert", "fileText"),
  soon("pdf-to-excel", "PDF to Excel", "Pull tables out of a PDF into a spreadsheet.", "convert", "spreadsheet"),
  soon("excel-to-pdf", "Excel to PDF", "Save a spreadsheet as a PDF.", "convert", "spreadsheet"),
  soon("pdf-to-powerpoint", "PDF to PowerPoint", "Turn PDF pages into editable slides.", "convert", "monitor"),
  soon("powerpoint-to-pdf", "PowerPoint to PDF", "Save a slide deck as a PDF.", "convert", "monitor"),
  soon("html-to-pdf", "HTML to PDF", "Save a web page as a PDF.", "convert", "globe"),
  soon("pdf-to-pdfa", "PDF to PDF/A", "Save a PDF in the PDF/A archive format.", "convert", "fileCheck"),
  soon("edit-pdf", "Edit PDF", "Add text, shapes, and comments to a PDF.", "edit", "pen"),
  soon("watermark-pdf", "Watermark", "Stamp text or an image across a PDF.", "edit", "droplets"),
  soon("page-numbers", "Page numbers", "Add page numbers in the position you choose.", "edit", "hash"),
  soon("repair-pdf", "Repair PDF", "Recover a PDF that won't open correctly.", "optimize", "wrench"),
  soon("ocr-pdf", "OCR PDF", "Make a scanned PDF searchable.", "optimize", "scan"),
  soon("protect-pdf", "Protect PDF", "Add a password before sharing a PDF.", "security", "lock"),
  soon("unlock-pdf", "Unlock PDF", "Remove a password from a PDF you can open.", "security", "unlock"),
  soon("sign-pdf", "Sign PDF", "Place a signature on a PDF.", "security", "pen"),
];

function soon(
  slug: string,
  name: string,
  description: string,
  category: Exclude<CategoryId, "all">,
  icon: string,
): ToolDefinition {
  return {
    slug,
    name,
    description,
    summary: `${description} This tool is not available yet.`,
    category,
    status: "soon",
    icon,
    accept: [],
    acceptLabel: "file",
    multiple: false,
    reorder: false,
    minFiles: 1,
    maxFiles: 1,
    minMessage: "",
    selectLabel: "",
    dropLabel: "",
    actionLabel: "",
    processingLabel: "",
    seoTitle: `${name} — coming soon — Convarter`,
    seoDescription: `${description} This Convarter tool is planned and not available yet.`,
  };
}

export function getTool(slug: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export function availableTools(): ToolDefinition[] {
  return tools.filter((tool) => tool.status === "available");
}

export const convertColumns: { title: string; slugs: string[] }[] = [
  {
    title: "Convert to PDF",
    slugs: ["jpg-to-pdf", "word-to-pdf", "powerpoint-to-pdf", "excel-to-pdf", "html-to-pdf"],
  },
  {
    title: "Convert from PDF",
    slugs: ["pdf-to-jpg", "pdf-to-word", "pdf-to-powerpoint", "pdf-to-excel", "pdf-to-pdfa"],
  },
];

export function convertColumnTools() {
  return convertColumns.map((column) => ({
    title: column.title,
    tools: column.slugs.map((slug) => getTool(slug)).filter((tool): tool is ToolDefinition => Boolean(tool)),
  }));
}
