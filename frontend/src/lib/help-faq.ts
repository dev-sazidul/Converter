export const helpFaqs = [
  {
    question: "Are my files stored on the server?",
    answer:
      "No. Uploaded originals are removed as soon as processing finishes, and finished downloads stay in a temporary folder for about 1 hour (or until a server restart) before being deleted. BestConvert does not keep a document library.",
  },
  {
    question: "Why didn't compression make my PDF smaller?",
    answer:
      "A PDF made mostly of vector text and subsetted fonts has very little redundant image data to shrink. You still receive a valid PDF, and the result page tells you when the size stayed about the same.",
  },
  {
    question: "Which tools are available to use?",
    answer:
      "All 22 PDF tools on bestconvert.site—including Merge, Split, Compress, Rotate, Edit, Watermark, Page Numbers, Repair, OCR, Protect, Unlock, Sign, and all document format converters—are active and process files on the server.",
  },
  {
    question: "Why was my file rejected even though it has a .pdf or .jpg extension?",
    answer:
      "The server checks the actual file contents (file signature), not just the filename. Renaming a PNG to .jpg or a damaged file to .pdf will be rejected. Only real JPG/JPEG files work in JPG to PDF, and Office tools require genuine DOC/DOCX, XLS/XLSX, or PPT/PPTX files.",
  },
  {
    question: "Why can't PDF to Word or PDF to Excel read my scanned PDF?",
    answer:
      "Scanned PDFs are images of pages rather than selectable text. Run OCR PDF first to embed a searchable text layer, or review the page in Edit PDF.",
  },
  {
    question: "Can Unlock PDF remove a password I forgot?",
    answer:
      "No. Unlock PDF only removes password protection when you supply the valid password and confirm you are authorized to unlock the document.",
  },
  {
    question: "Is Sign PDF a cryptographic digital signature?",
    answer:
      "No. Sign PDF places a visual image-based signature (drawn or uploaded) onto the PDF pages. It does not issue an X.509 cryptographic certificate.",
  },
];
