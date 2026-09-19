export type PlanPdfCourse = {
  code: string | null;
  name: string;
  credits: number | null;
  term: string | null;
  status: string; // already-localized-to-English label, e.g. "Completed" / "In progress" / "Planned"
  finalGrade: string | null;
};

export type PlanPdfCategory = {
  key: string; // "prep" | "general" | "college" | "major" | "major_elective"
  label: string; // English display label
  courses: PlanPdfCourse[];
};

// Approximates each category's on-screen accent hue (see --cat-* in styles.css, defined in
// oklch()) as a flat RGB dot — see transcript-pdf.ts for why jsPDF can't read the real oklch
// value directly. Doesn't need to match exactly, just stay visually distinct per category.
const CATEGORY_DOT_COLOR: Record<string, [number, number, number]> = {
  prep: [140, 140, 145],
  general: [70, 110, 200],
  college: [40, 150, 120],
  major: [220, 140, 40],
  major_elective: [150, 90, 200],
};

/**
 * Builds the academic plan as a real text-based PDF (jsPDF + jspdf-autotable — same approach as
 * transcript-pdf.ts, for the same reason: the old html2canvas screenshot export was unreliable
 * on this app's oklch()-based theme). One table per category (prep/general/college/major/
 * elective), matching the on-screen page's grouping. English only — see transcript-pdf.ts.
 */
export async function exportPlanPdf(opts: {
  studentName: string;
  major: string;
  currentTerm: string;
  generatedOn: string;
  overallGpa: number | string;
  semesterGpa: number | string;
  totalCredits: number | string;
  categories: PlanPdfCategory[];
}): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Academic Plan", marginX, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(asciiSafe(opts.studentName) || "—", marginX, y);
  y += 14;
  const subLine = [asciiSafe(opts.major), asciiSafe(opts.currentTerm)].filter(Boolean).join(" · ");
  if (subLine) {
    doc.text(subLine, marginX, y);
    y += 14;
  }
  doc.text(`Generated on ${opts.generatedOn}`, marginX, y);
  doc.setTextColor(0);
  y += 24;

  const stats: [string, string][] = [
    ["Overall GPA", String(opts.overallGpa)],
    ["Semester GPA", String(opts.semesterGpa)],
    ["Total Credits", String(opts.totalCredits)],
  ];
  const statW = (pageWidth - marginX * 2) / stats.length;
  doc.setDrawColor(210);
  doc.rect(marginX, y, pageWidth - marginX * 2, 40);
  stats.forEach(([label, value], i) => {
    const x = marginX + i * statW;
    if (i > 0) doc.line(x, y, x, y + 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(value, x + statW / 2, y + 17, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(label, x + statW / 2, y + 30, { align: "center" });
    doc.setTextColor(0);
  });
  y += 56;

  for (const cat of opts.categories) {
    if (!cat.courses.length) continue;

    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      y = 50;
    }

    const dot = CATEGORY_DOT_COLOR[cat.key] ?? [120, 120, 120];
    doc.setFillColor(...dot);
    doc.circle(marginX + 4, y - 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(cat.label, marginX + 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(
      `${cat.courses.length} course${cat.courses.length === 1 ? "" : "s"}`,
      pageWidth - marginX,
      y,
      {
        align: "right",
      },
    );
    doc.setTextColor(0);
    y += 8;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Code", "Course Title", "Credits", "Term", "Status", "Grade"]],
      body: cat.courses.map((c) => [
        asciiSafe(c.code) || "—",
        asciiSafe(c.name) || "—",
        c.credits != null ? String(c.credits) : "—",
        asciiSafe(c.term) || "—",
        c.status,
        c.finalGrade ?? "—",
      ]),
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: 20 },
      headStyles: { fillColor: [230, 230, 235], textColor: 20, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      columnStyles: {
        0: { cellWidth: 60 },
        2: { cellWidth: 45, halign: "center" },
        3: { cellWidth: 70 },
        4: { cellWidth: 70 },
        5: { cellWidth: 45, halign: "center" },
      },
    });
    // @ts-expect-error autoTable attaches this at runtime; not in the type defs.
    y = doc.lastAutoTable.finalY + 20;
  }

  doc.save("academic-plan.pdf");
}

function asciiSafe(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[^\x20-\x7E]/g, "").trim();
}
