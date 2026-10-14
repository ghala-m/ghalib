export async function createStudyPdf(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  await document.fonts.ready;
  const host = document.createElement("div");
  host.className = "study-pdf-host";
  host.dir = element.dir || document.documentElement.dir;
  const clone = element.cloneNode(true) as HTMLElement;
  host.appendChild(clone); document.body.appendChild(host);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  try {
    clone.querySelectorAll("[data-export-hide]").forEach(node => node.remove());
    const nodes = Array.from(clone.children);
    const pages: HTMLElement[] = [];
    let page = document.createElement("div"); page.className = "study-pdf-page"; host.append(page); pages.push(page);
    const maxHeight = 980;
    for (const node of nodes) {
      const children = node.matches("ul,ol") ? Array.from(node.children).map(child => { const list = node.cloneNode(false); list.appendChild(child.cloneNode(true)); return list; }) : [node];
      for (const block of children) {
        page.appendChild(block);
        if (page.scrollHeight > maxHeight && page.childElementCount > 1) {
          page.removeChild(block);
          page = document.createElement("div"); page.className = "study-pdf-page"; host.append(page); pages.push(page); page.appendChild(block);
        }
      }
    }
    clone.remove();
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: getComputedStyle(host).backgroundColor, logging: false });
      const height = canvas.height * 186 / canvas.width;
      if (i) pdf.addPage();
      // Oversized single blocks are scaled as a unit, never cut through text.
      const scale = Math.min(1, 265 / height);
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 12, 12, 186 * scale, height * scale);
      pdf.setFontSize(9); pdf.text(`${i + 1} / ${pages.length}`, 105, 289, { align: "center" });
    }
    return pdf.output("blob");
  } finally { host.remove(); }
}
export function downloadStudyPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export async function shareStudyPdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  downloadStudyPdf(blob, filename);
}