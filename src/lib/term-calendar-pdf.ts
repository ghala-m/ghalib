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
const WEEKDAY_NAMES = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]; // Saturday-first, matches semester-grid.ts

// Loosely matches the color language from the hand-drawn design (semester = blue, month = purple,
// weeks = pink, days = yellow) — approximated as flat RGB fills since jsPDF draws its own boxes
// rather than reading them off the page's CSS (see transcript-pdf.ts for why that matters).
const COLOR_SEMESTER_BAND: [number, number, number] = [186, 230, 245];
const COLOR_WEEK_CELL: [number, number, number] = [248, 210, 225];
const COLOR_DAY_CELL: [number, number, number] = [252, 244, 200];
const COLOR_OVERFLOW_CELL: [number, number, number] = [237, 237, 232];
const COLOR_TODAY_BORDER: [number, number, number] = [230, 120, 60];

/**
 * Builds the term calendar as a real text-based PDF (see transcript-pdf.ts for why: jsPDF draws
 * every box and color itself from plain numbers, so it can't be tripped up by the oklch()-based
 * theme that made the old html2canvas screenshot export unreliable on this app specifically —
 * every CSS custom property in styles.css is defined in oklch(), which html2canvas cannot parse).
 *
 * One page per calendar month, landscape, following the student's own paper-planner layout:
 * a week-number column on the left, then one column per day (Saturday → Friday). Days that
 * spill into the adjacent month stay in the grid (so every week has 7 cells) but are shaded and
 * labelled in black rather than the current month's accent color — matching the physical planner
 * convention of muting "not really this month" days without hiding them.
 *
 * ENGLISH ONLY, always — see transcript-pdf.ts's note on jsPDF's standard fonts having no Arabic
 * glyphs. Course/event titles here are truncated hard rather than wrapped, since day cells are
 * meant to leave blank space for the student's own handwritten notes, not print an essay.
 */
export async function exportTermCalendarPdf(opts: {
  semesterName: string;
  months: GridMonth[];
  marksByDate: Map<string, CalendarPdfMark[]>;
  todayIso: string;
}): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });

  opts.months.forEach((month, monthIdx) => {
    if (monthIdx > 0) doc.addPage();
    drawMonthPage(doc, month, opts);
  });

  doc.save("term-calendar.pdf");
}

function drawMonthPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF's own type is awkward to import by name here
  doc: any,
  month: GridMonth,
  opts: { semesterName: string; marksByDate: Map<string, CalendarPdfMark[]>; todayIso: string },
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 30;
  const marginTop = 30;

  // Header band: semester name (left) + month/year (right), on the blue "semester" band.
  doc.setFillColor(...COLOR_SEMESTER_BAND);
  doc.rect(marginX, marginTop, pageW - marginX * 2, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(opts.semesterName || "Semester", marginX + 10, marginTop + 17);
  doc.text(`${MONTH_NAMES[month.monthIndex]} ${month.year}`, pageW - marginX - 10, marginTop + 17, {
    align: "right",
  });
  doc.setTextColor(0);

  const gridTop = marginTop + 26;
  const gridBottom = pageH - 24;
  const weekColW = 46;
  const dayColW = (pageW - marginX * 2 - weekColW) / 7;
  const rowH = (gridBottom - gridTop - 18) / month.weeks.length;
  const headerH = 18;

  // Weekday header row
  doc.setFillColor(235, 235, 230);
  doc.rect(marginX, gridTop, weekColW, headerH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  WEEKDAY_NAMES.forEach((label, i) => {
    const x = marginX + weekColW + i * dayColW;
    doc.rect(x, gridTop, dayColW, headerH, "FD");
    doc.text(label, x + dayColW / 2, gridTop + 12, { align: "center" });
  });

  let y = gridTop + headerH;
  for (const week of month.weeks) {
    // Week-number cell (pink)
    doc.setFillColor(...COLOR_WEEK_CELL);
    doc.setDrawColor(150);
    doc.rect(marginX, y, weekColW, rowH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text(String(week.weekNumber), marginX + weekColW / 2, y + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(90);
    doc.text("wk", marginX + weekColW / 2, y + 23, { align: "center" });
    doc.setTextColor(0);

    week.days.forEach((day, i) => {
      const x = marginX + weekColW + i * dayColW;
      const isToday = day.date === opts.todayIso;
      doc.setFillColor(...(day.overflow ? COLOR_OVERFLOW_CELL : COLOR_DAY_CELL));
      doc.setDrawColor(150);
      doc.rect(x, y, dayColW, rowH, "FD");
      if (isToday) {
        doc.setDrawColor(...COLOR_TODAY_BORDER);
        doc.setLineWidth(1.4);
        doc.rect(x + 1, y + 1, dayColW - 2, rowH - 2, "S");
        doc.setLineWidth(0.2);
        doc.setDrawColor(150);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      // Overflow (adjacent-month) days are printed plain black rather than the current month's
      // color, so they read as "for reference" without disappearing — same idea as the on-screen
      // calendar's day-number color (src/components/app/SemesterGrid.tsx).
      doc.setTextColor(day.overflow ? 0 : 150, day.overflow ? 0 : 70, day.overflow ? 0 : 20);
      doc.text(String(day.dayOfMonth), x + 4, y + 12);
      doc.setTextColor(0);

      const marks = opts.marksByDate.get(day.date) ?? [];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      const maxLines = Math.max(0, Math.floor((rowH - 16) / 8));
      marks.slice(0, maxLines).forEach((m, li) => {
        const truncated = m.label.length > 16 ? `${m.label.slice(0, 15)}…` : m.label;
        doc.text(asciiSafe(truncated), x + 4, y + 22 + li * 8, { maxWidth: dayColW - 8 });
      });
      if (marks.length > maxLines) {
        doc.setFontSize(5.5);
        doc.text(`+${marks.length - maxLines} more`, x + 4, y + rowH - 4);
      }
    });

    y += rowH;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text("Generated by Ghalib", marginX, pageH - 10);
  doc.setTextColor(0);
}

function asciiSafe(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[^\x20-\x7E]/g, "").trim();
}
