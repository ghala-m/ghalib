import type { GridMonth } from "@/lib/semester-grid";

export type CalendarPdfMark = { date: string; label: string };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Builds the term calendar as a real text-based PDF (see transcript-pdf.ts for why: jsPDF draws
 * every box itself from plain numbers, so the oklch()-based theme that made the old html2canvas
 * screenshot export unreliable on this app never enters the picture).
 *
 * Layout follows the student's own hand-drawn wall-planner design exactly, which nests the other
 * way round from a typical calendar grid: MONTHS are ROWS (stacked top to bottom, one per month —
 * never split across pages, the whole point of the design is seeing the whole term at a glance),
 * WEEKS are column-groups placed side by side within their month's row (first week of the month
 * nearest the month label, later weeks continuing outward), and DAYS are seven narrow, tall
 * sub-columns within each week (Saturday nearest the week's start, Friday at the far end) — tall
 * rather than wide specifically so there's real room to jot a note under each date, which was an
 * explicit requirement of the design.
 *
 * A month's week-blocks stretch to fill the full row width regardless of how many weeks that
 * month has (so a 2-week September and a 5-week November are equally wide overall, just with
 * fewer/more, correspondingly wider/narrower, week-blocks) — matching the reference image, where
 * a short month's boxes are visibly wider than a long month's.
 *
 * Sized as a large single sheet (A3 landscape) rather than A4: with up to ~5 weeks × 7 days per
 * row, A4 leaves each day column too narrow to write in, which defeats the design's own point.
 * This is meant for poster/large-format printing (or panning around on screen); scale-to-fit will
 * shrink it for a regular printer, just with smaller handwriting room.
 *
 * Colors in the hand-drawn design were for labeling regions during the design conversation, not
 * a requirement for the printed output — this renders as a plain black-and-white grid (light gray
 * tints on header cells only) so it prints cleanly on any printer.
 *
 * ENGLISH ONLY, always — see transcript-pdf.ts's note on jsPDF's standard fonts having no Arabic
 * glyphs.
 */
export async function exportTermCalendarPdf(opts: {
  semesterName: string;
  months: GridMonth[];
  marksByDate: Map<string, CalendarPdfMark[]>;
  todayIso: string;
}): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a3", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 28;
  const marginR = 28;
  const marginTop = 46;
  const monthLabelW = 26;
  const headerH = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(opts.semesterName || "Semester", marginL, 30);

  const rowsTop = marginTop;
  const rowsBottom = pageH - 20;
  const rowH = (rowsBottom - rowsTop) / opts.months.length;
  const rowContentW = pageW - marginL - marginR - monthLabelW;
  // Rightmost x of the week/day area (month label sits to the right of it, at the page's right edge).
  const rightEdge = pageW - marginR;

  opts.months.forEach((month, rowIdx) => {
    const rowTop = rowsTop + rowIdx * rowH;

    // Month-label column, right edge of the row, full row height. NOTE: jsPDF's `align: "center"`
    // combined with `angle` computes the wrong anchor point (verified empirically — it can place
    // the text dozens of points outside the intended box, which is why month names were vanishing:
    // the week-block rectangles drawn afterward simply painted over the mispositioned text). This
    // centers it manually instead: with `angle: 90` the given (x, y) is the BOTTOM of the text and
    // it grows upward, so y needs nudging down by half the text's rendered width to end up centered.
    doc.setFillColor(238, 238, 238);
    doc.setDrawColor(170);
    doc.rect(rightEdge - monthLabelW, rowTop, monthLabelW, rowH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    const monthLabel = (MONTH_NAMES[month.monthIndex] ?? "").slice(0, 3);
    const monthLabelWidth = doc.getTextWidth(monthLabel);
    doc.text(monthLabel, rightEdge - monthLabelW / 2 + 4, rowTop + rowH / 2 + monthLabelWidth / 2, {
      angle: 90,
    });
    doc.setTextColor(0);

    const weekCount = month.weeks.length || 1;
    const weekBlockW = rowContentW / weekCount;

    month.weeks.forEach((week, weekIdxInMonth) => {
      const blockRight = rightEdge - monthLabelW - weekIdxInMonth * weekBlockW;
      const blockLeft = blockRight - weekBlockW;

      // Week header (top of the block): the week number.
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(170);
      doc.rect(blockLeft, rowTop, weekBlockW, headerH, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(20);
      doc.text(String(week.weekNumber), blockLeft + weekBlockW / 2, rowTop + headerH / 2 + 3, {
        align: "center",
      });
      doc.setTextColor(0);

      const dayColW = weekBlockW / 7;
      const dayTop = rowTop + headerH;
      const dayH = rowH - headerH;

      week.days.forEach((day, dayIdx) => {
        // Saturday (index 0) nearest the block's right edge, Friday (index 6) at its left edge.
        const dRight = blockRight - dayIdx * dayColW;
        const dLeft = dRight - dayColW;
        const isToday = day.date === opts.todayIso;

        doc.setDrawColor(190);
        doc.setFillColor(255, 255, 255);
        doc.rect(dLeft, dayTop, dayColW, dayH, "FD");
        if (day.overflow) {
          doc.setFillColor(245, 245, 245);
          doc.rect(dLeft, dayTop, dayColW, dayH, "F");
          doc.setDrawColor(190);
          doc.rect(dLeft, dayTop, dayColW, dayH, "S");
        }
        if (isToday) {
          doc.setDrawColor(0);
          doc.setLineWidth(1.2);
          doc.rect(dLeft + 1, dayTop + 1, dayColW - 2, dayH - 2, "S");
          doc.setLineWidth(0.2);
          doc.setDrawColor(190);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(0);
        doc.text(String(day.dayOfMonth), dLeft + 3, dayTop + 10);

        const marks = opts.marksByDate.get(day.date) ?? [];
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5);
        const maxLines = Math.max(0, Math.floor((dayH - 16) / 7));
        marks.slice(0, maxLines).forEach((m, li) => {
          const truncated = m.label.length > 14 ? `${m.label.slice(0, 13)}…` : m.label;
          doc.text(asciiSafe(truncated), dLeft + 3, dayTop + 20 + li * 7, {
            maxWidth: dayColW - 6,
          });
        });
      });
    });
  });

  doc.save("term-calendar.pdf");
}

function asciiSafe(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[^\x20-\x7E]/g, "").trim();
}
