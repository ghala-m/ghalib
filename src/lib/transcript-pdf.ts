import type { Course } from "@/lib/queries";
import type { TermGroup } from "@/routes/_authenticated/transcript";

/**
 * Builds the transcript as a real text-based PDF (selectable/searchable/small, not a screenshot)
 * using jsPDF + jspdf-autotable — arguably the single most widely used PDF-generation combo in
 * the JS ecosystem, so this is the "more established library" fallback if the screenshot-based
 * export (`export-pdf.ts`, used for the visual plan/calendar pages) ever proves unreliable on
 * some browser/machine.
 *
 * DELIBERATELY ENGLISH-ONLY, ALWAYS — regardless of the app's current UI language. Two reasons:
 * 1. jsPDF's built-in fonts (Helvetica/Times/Courier) have no Arabic glyphs and no bidi/shaping
 *    support — Arabic text would render as empty boxes or reversed-and-disconnected letters.
 *    Embedding a custom Arabic font + a full bidi-reordering pass is a real project on its own,
 *    not a quick addition, and was intentionally out of scope here.
 * 2. A transcript is the one document from this app most likely to leave it entirely — attached
 *    to a scholarship form, an exchange application, a job application — where an English,
 *    university-transcript-style layout is simply the expected register.
 * Course codes/titles in this app are, in practice, already English (standard course-catalog
 * convention), so this only affects the small amount of surrounding chrome text.
 */
export async function exportTranscriptPdfNative(opts: {
  studentName: string;
  major: string;
  university: string;
  generatedOn: string;
  groups: TermGroup[];
  finalCgpa: number | null;
  finalCredits: number;
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
  doc.text("Academic Transcript", marginX, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(asciiSafe(opts.studentName) || "—", marginX, y);
  y += 14;
  const subLine = [asciiSafe(opts.major), asciiSafe(opts.university)].filter(Boolean).join(" · ");
  if (subLine) {
    doc.text(subLine, marginX, y);
    y += 14;
  }
  doc.text(`Generated on ${opts.generatedOn}`, marginX, y);
  doc.setTextColor(0);
  y += 24;

  // Summary strip
  const stats: [string, string][] = [
    ["Cumulative GPA", opts.finalCgpa != null ? opts.finalCgpa.toFixed(3) : "—"],
    ["Total Credits", String(opts.finalCredits)],
    ["Terms Completed", String(opts.groups.filter((g) => g.courses.length > 0).length)],
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

  for (const group of opts.groups) {
    if (!group.courses.length) continue;

    // Keep a term's heading glued to at least its first row rather than stranded at a page
    // bottom.
    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      y = 50;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(asciiSafe(group.label) || "Term", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    const termGpaText = group.semGpa != null ? `Term GPA ${group.semGpa.toFixed(3)}` : "Term GPA —";
    doc.text(`${termGpaText}  ·  ${group.semCh} credits`, pageWidth - marginX, y, {
      align: "right",
    });
    doc.setTextColor(0);
    y += 8;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Code", "Course Title", "Credits", "Grade"]],
      body: group.courses.map((c: Course) => [
        asciiSafe(c.code) || "—",
        asciiSafe(c.name) || "—",
        c.credits != null ? String(c.credits) : "—",
        c.final_grade ?? "—",
      ]),
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: 20 },
      headStyles: { fillColor: [230, 230, 235], textColor: 20, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      columnStyles: {
        0: { cellWidth: 70 },
        2: { cellWidth: 60, halign: "center" },
        3: { cellWidth: 60, halign: "center" },
      },
    });
    // @ts-expect-error autoTable attaches this at runtime; not in the type defs.
    y = doc.lastAutoTable.finalY + 20;
  }

  doc.save("transcript.pdf");
}

/**
 * Strips characters outside the WinAnsi range jsPDF's standard fonts can render (roughly Latin-1)
 * so an accidental non-Latin character (an Arabic note pasted into a course name, say) degrades
 * to nothing instead of jsPDF throwing or silently drawing a blank glyph box.
 */
function asciiSafe(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[^\x20-\x7E]/g, "").trim();
}
