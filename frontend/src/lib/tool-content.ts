export type ToolFaq = { question: string; answer: string };

export type ToolCopy = {
  heading: string;
  intro: string;
  steps: string[];
  limits: string;
  faqs: ToolFaq[];
  related: string[];
};

export const toolContent: Record<string, ToolCopy> = {
  "merge-pdf": {
    heading: "Merge PDF online",
    intro:
      "Use this free merge PDF tool when you have two or more PDFs that should become one file. You set the order before the pages are joined from top to bottom.",
    steps: [
      "Add at least two PDF files.",
      "Drag a file up or down if the order should change.",
      "Choose Merge PDF and download the combined document.",
    ],
    limits:
      "Password-protected PDFs are rejected. The merge keeps the page order you set, but it does not redesign the pages or repair a damaged file.",
    faqs: [
      {
        question: "Can I change the page order before merging?",
        answer: "Yes. Drag the files into the order you want. The finished PDF follows that order from top to bottom.",
      },
      {
        question: "How many PDFs can I merge at once?",
        answer: "You can add up to the file limit shown on the page. Each file also has to stay within the size and page limits.",
      },
      {
        question: "Does merging keep bookmarks and form fields?",
        answer: "The tool joins the pages. It does not promise to keep bookmarks, comments, or interactive form fields.",
      },
    ],
    related: ["split-pdf", "compress-pdf", "rotate-pdf"],
  },
  "split-pdf": {
    heading: "Split PDF online",
    intro:
      "Split a PDF online when you only need some pages, one file per page, or equal groups of pages. A single result downloads as a PDF. Several results download as a ZIP.",
    steps: [
      "Add one PDF.",
      "Choose page ranges, every page, or a split every few pages.",
      "Download the PDF or the ZIP of the parts.",
    ],
    limits:
      "This tool splits pages. It does not extract a photo from inside a page or unlock a password-protected PDF.",
    faqs: [
      {
        question: "Can I extract only a few pages?",
        answer: "Yes. Enter the page ranges you need and the other pages stay out of the download.",
      },
      {
        question: "What do I get if every page is split?",
        answer: "Each page becomes its own PDF, and those files are packed into a ZIP.",
      },
      {
        question: "Can I split more than one PDF in the same task?",
        answer: "No. Split PDF takes one document so the page numbers stay clear.",
      },
    ],
    related: ["merge-pdf", "rotate-pdf", "pdf-to-jpg"],
  },
  "compress-pdf": {
    heading: "Compress PDF online",
    intro:
      "Compress a PDF online when a file is too large to send. Photos and scanned images usually shrink the most. A PDF that is already small text may barely change.",
    steps: [
      "Add one or more PDFs.",
      "Choose how small you want the file to get.",
      "Download the result and check the size shown on the result page.",
    ],
    limits:
      "Compression can make pictures look softer. It cannot shrink every file, and it does not unlock a password-protected PDF.",
    faqs: [
      {
        question: "Why is my compressed PDF almost the same size?",
        answer: "Text and files that are already compressed have little left to remove. The result page tells you when the size stayed about the same.",
      },
      {
        question: "Will the text stay readable?",
        answer: "The stronger settings reduce image quality first. Text that is already compact usually stays readable, but a very small setting can soften pictures.",
      },
      {
        question: "Can I compress several PDFs together?",
        answer: "Yes, up to the file limit shown on the page. Each PDF is compressed and returned for download.",
      },
    ],
    related: ["merge-pdf", "pdf-to-jpg", "split-pdf"],
  },
  "rotate-pdf": {
    heading: "Rotate PDF pages online",
    intro:
      "Rotate PDF pages that were scanned sideways or upside down. Turn every page, or list only the pages that need a quarter, half, or three-quarter turn.",
    steps: [
      "Add a PDF.",
      "Choose 90, 180, or 270 degrees clockwise.",
      "Leave the page list empty for every page, or enter the pages to rotate, then download.",
    ],
    limits:
      "Rotation is clockwise only. Pages you do not list stay as they are. A password-protected PDF is rejected.",
    faqs: [
      {
        question: "Can I rotate a single page?",
        answer: "Yes. Enter that page number and the other pages stay in their original orientation.",
      },
      {
        question: "Which direction does the page turn?",
        answer: "Pages turn clockwise by 90, 180, or 270 degrees.",
      },
      {
        question: "Does rotating crop the page?",
        answer: "No. The page turns. The tool does not crop, resize, or rewrite the content.",
      },
    ],
    related: ["merge-pdf", "split-pdf", "compress-pdf"],
  },
  "pdf-to-jpg": {
    heading: "PDF to JPG converter",
    intro:
      "Convert PDF pages to JPG images when you need a picture of each page. Choose screen, standard, or high resolution. One page downloads as a JPG. Several pages come in a ZIP.",
    steps: [
      "Add one PDF.",
      "Choose the resolution and, if you want, a page range.",
      "Download the JPG or the ZIP of images.",
    ],
    limits:
      "The JPG is a picture of the page. Text in the image cannot be edited as a document, and a higher resolution makes a larger file.",
    faqs: [
      {
        question: "Do I get one image per page?",
        answer: "Yes. Each selected page becomes its own JPG.",
      },
      {
        question: "Which resolution should I choose?",
        answer: "Screen is smaller. Standard fits most sharing. High keeps more detail and creates a larger image.",
      },
      {
        question: "Can I turn the JPG files back into a PDF?",
        answer: "Yes. Use JPG to PDF after you have the images.",
      },
    ],
    related: ["jpg-to-pdf", "compress-pdf", "pdf-to-word"],
  },
  "jpg-to-pdf": {
    heading: "JPG to PDF converter",
    intro:
      "Convert JPG and JPEG images into one PDF. Put the pictures in order, then fit the page to each image or place them on A4 or US Letter.",
    steps: [
      "Add one or more .jpg or .jpeg files.",
      "Drag them into the order you want.",
      "Choose the page size and download the PDF.",
    ],
    limits:
      "Only JPG and JPEG files are accepted. PNG, HEIC, and other image types are rejected. The PDF contains the pictures; it does not run OCR.",
    faqs: [
      {
        question: "Can I add a PNG?",
        answer: "No. This tool accepts .jpg and .jpeg files only. The file contents are checked, not just the name.",
      },
      {
        question: "Can I put several photos in one PDF?",
        answer: "Yes. Add the images, arrange them, and they are placed in that order.",
      },
      {
        question: "What does fit the page mean?",
        answer: "Each page matches its image. A4 and Letter put the image on a standard paper size instead.",
      },
    ],
    related: ["pdf-to-jpg", "merge-pdf", "html-to-pdf"],
  },
  "pdf-to-word": {
    heading: "PDF to Word converter",
    intro:
      "Convert a PDF to an editable Word document. Selectable text, tables, and images are copied into the DOCX. A complex layout may not match the PDF exactly.",
    steps: [
      "Add one PDF that contains selectable text.",
      "Start the conversion and wait for the Word file.",
      "Open the DOCX and check headings, tables, and spacing before you share it.",
    ],
    limits:
      "Scanned pages without selectable text are not read, because OCR is not available. Columns, text boxes, and tight layouts can move.",
    faqs: [
      {
        question: "Will the Word file look exactly like the PDF?",
        answer: "Not always. Simple text usually comes across. Complex layouts, columns, and decorative spacing can change.",
      },
      {
        question: "Can it convert a scanned PDF?",
        answer: "No. A scan without selectable text needs OCR, and OCR is not available yet.",
      },
      {
        question: "Which Word format do I download?",
        answer: "The download is a .docx file you can open in Word or another editor that supports DOCX.",
      },
    ],
    related: ["word-to-pdf", "pdf-to-excel", "pdf-to-powerpoint"],
  },
  "word-to-pdf": {
    heading: "Word to PDF converter",
    intro:
      "Convert a Word document to PDF from a .doc or .docx file. The converter checks the file contents, so renaming another file to .docx will not work.",
    steps: [
      "Add one .doc or .docx file.",
      "Start the conversion.",
      "Download the PDF and review pages where a special font might have been substituted.",
    ],
    limits:
      "Fonts that are not installed on the server are substituted, so a line can wrap differently. The tool converts one Word file at a time.",
    faqs: [
      {
        question: "Do you accept both DOC and DOCX?",
        answer: "Yes. Both .doc and .docx are accepted after the file contents are checked.",
      },
      {
        question: "Why does the PDF look slightly different?",
        answer: "A font that is not on the server is replaced. That can change line breaks or spacing.",
      },
      {
        question: "Can I convert the PDF back to Word?",
        answer: "Yes. Use PDF to Word, then check the layout because the two conversions are not perfect mirrors.",
      },
    ],
    related: ["pdf-to-word", "excel-to-pdf", "powerpoint-to-pdf"],
  },
  "pdf-to-excel": {
    heading: "PDF to Excel converter",
    intro:
      "Convert PDF tables into an Excel workbook. Each detected table is placed on a sheet. A page with no table contributes its selectable text in rows instead.",
    steps: [
      "Add one PDF that has real tables or selectable text.",
      "Start the conversion.",
      "Open the workbook and check that columns still line up.",
    ],
    limits:
      "This is not a picture of the page. Scanned tables without selectable text cannot be extracted. Merged cells and unusual layouts may need cleanup.",
    faqs: [
      {
        question: "Does every page become a spreadsheet image?",
        answer: "No. The tool extracts tables and selectable text. It does not paste a picture of the page into Excel.",
      },
      {
        question: "What happens when a page has no table?",
        answer: "Selectable text from that page is listed in rows. A scanned page with no text cannot be converted.",
      },
      {
        question: "Will the columns match the PDF exactly?",
        answer: "Simple tables usually do. Complex or nested tables can shift and should be reviewed.",
      },
    ],
    related: ["excel-to-pdf", "pdf-to-word", "pdf-to-powerpoint"],
  },
  "excel-to-pdf": {
    heading: "Excel to PDF converter",
    intro:
      "Convert an Excel spreadsheet to PDF from an .xls or .xlsx workbook. The file type is checked from its contents before the PDF is created.",
    steps: [
      "Add one .xls or .xlsx file.",
      "Start the conversion.",
      "Download the PDF and check wide sheets, where columns can land on more than one page.",
    ],
    limits:
      "A wide sheet may break across pages. Fonts that are not installed on the server are substituted. Macros are not run.",
    faqs: [
      {
        question: "Are both XLS and XLSX supported?",
        answer: "Yes. Both formats are accepted after the file contents are checked.",
      },
      {
        question: "Will every sheet be included?",
        answer: "The workbook is printed to PDF. Very wide sheets can span multiple pages, so review the download.",
      },
      {
        question: "Can I turn the PDF tables back into Excel?",
        answer: "Yes. Use PDF to Excel. Review the cells, because a PDF table is not always a perfect spreadsheet.",
      },
    ],
    related: ["pdf-to-excel", "word-to-pdf", "powerpoint-to-pdf"],
  },
  "pdf-to-powerpoint": {
    heading: "PDF to PowerPoint converter",
    intro:
      "Convert PDF pages into PowerPoint slides. Editable mode places selectable text on the slides. Picture mode keeps each page as an image when the layout matters more than editing.",
    steps: [
      "Add one PDF.",
      "Choose editable text or a picture of each page.",
      "Download the PPTX and check the slides.",
    ],
    limits:
      "Editable mode can move complex layouts. Picture mode keeps the look but the text is not editable. Scanned text is not recognized with OCR.",
    faqs: [
      {
        question: "When should I use picture mode?",
        answer: "Use picture mode when the page design matters more than editing the words. Each page becomes an image on a slide.",
      },
      {
        question: "Is the editable text identical to the PDF?",
        answer: "Selectable text is copied, but columns and tight layouts may not land in the same place.",
      },
      {
        question: "Can I save the slides as a PDF again?",
        answer: "Yes. Use PowerPoint to PDF after you finish editing the deck.",
      },
    ],
    related: ["powerpoint-to-pdf", "pdf-to-word", "pdf-to-jpg"],
  },
  "powerpoint-to-pdf": {
    heading: "PowerPoint to PDF converter",
    intro:
      "Convert a PowerPoint presentation to PDF from a .ppt or .pptx file. The converter checks the file contents before it builds the PDF.",
    steps: [
      "Add one .ppt or .pptx file.",
      "Start the conversion.",
      "Download the PDF and review slides that use an unusual font.",
    ],
    limits:
      "Fonts missing on the server are substituted. Animations and speaker notes are not a separate interactive slideshow in the PDF.",
    faqs: [
      {
        question: "Do you accept PPT and PPTX?",
        answer: "Yes. Both .ppt and .pptx are accepted after the file contents are checked.",
      },
      {
        question: "Are animations kept?",
        answer: "The PDF shows the slides as pages. It is not an interactive slideshow, so animations are not played.",
      },
      {
        question: "Can I edit the slides after converting to PDF?",
        answer: "Use PDF to PowerPoint if you need slides again. Check the layout after that conversion.",
      },
    ],
    related: ["pdf-to-powerpoint", "word-to-pdf", "excel-to-pdf"],
  },
  "html-to-pdf": {
    heading: "HTML to PDF converter",
    intro:
      "Convert HTML to PDF from a file you upload or from a public http or https address. Private, local, and file addresses are blocked.",
    steps: [
      "Upload an .html or .htm file, or enter a public web address.",
      "Choose A4 or Letter.",
      "Download the PDF.",
    ],
    limits:
      "An uploaded HTML file is rendered without scripts and without network access, so external images and JavaScript will not run. Pages that need a login cannot be fetched.",
    faqs: [
      {
        question: "Can I convert a local or private address?",
        answer: "No. Local, private, and file addresses are blocked. Only a public http or https address is requested.",
      },
      {
        question: "Will JavaScript on my HTML file run?",
        answer: "No. Uploaded HTML is rendered with scripts and network access turned off.",
      },
      {
        question: "Can I choose the paper size?",
        answer: "Yes. Choose A4 or US Letter before the PDF is created.",
      },
    ],
    related: ["word-to-pdf", "jpg-to-pdf", "pdf-to-pdfa"],
  },
  "pdf-to-pdfa": {
    heading: "PDF to PDF/A converter",
    intro:
      "Convert a PDF to PDF/A-1b, PDF/A-2b, or PDF/A-3b for a more archival copy. Before the download is offered, the file is checked for a PDF/A marker, an output intent, and a readable structure.",
    steps: [
      "Add one PDF.",
      "Choose PDF/A-1b, PDF/A-2b, or PDF/A-3b.",
      "Download the file after the marker check passes.",
    ],
    limits:
      "The check is not a full ISO or veraPDF certification. Some PDFs with unusual fonts, transparency, or encryption cannot be converted.",
    faqs: [
      {
        question: "Is this a certified PDF/A file?",
        answer: "The converter writes PDF/A markers and checks that those markers, an output intent, and the page structure are present. That is not a full ISO certification.",
      },
      {
        question: "Which PDF/A level should I choose?",
        answer: "PDF/A-1b is the strictest common archive profile. PDF/A-2b and PDF/A-3b allow newer PDF features. Pick the level your archive asked for.",
      },
      {
        question: "Will a password-protected PDF convert?",
        answer: "No. Password-protected PDFs are rejected.",
      },
    ],
    related: ["compress-pdf", "merge-pdf", "html-to-pdf"],
  },
};

export function getToolCopy(slug: string): ToolCopy | undefined {
  return toolContent[slug];
}
