import type { Entry } from "@workspace/api-client-react";

const SOURCE_LABELS: Record<string, string> = {
  BOE: "BOE (Estado)",
  BOC: "BOC (Canarias)",
  BOP_LPA: "BOP Las Palmas",
  BOP_TFE: "BOP Tenerife",
};

function formatDateEs(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCsv(entries: Entry[], filename: string = "boletines"): void {
  const headers = ["Fuente", "Título", "Categoría", "Fecha", "Leído", "Guardado", "URL"];
  const rows = entries.map((e) => [
    SOURCE_LABELS[e.source] ?? e.source,
    e.title,
    e.category ?? "",
    formatDateEs(e.publishedAt),
    e.isRead ? "Sí" : "No",
    e.isBookmarked ? "Sí" : "No",
    e.url,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToPdf(
  entries: Entry[],
  title: string = "Boletines Oficiales",
  filename: string = "boletines"
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const primaryColor: [number, number, number] = [26, 54, 93];
  const accentColor: [number, number, number] = [180, 130, 0];
  const today = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 297, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Gestoría Canarias — Boletines Oficiales", 10, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generado el ${today}`, 297 - 10, 11, { align: "right" });

  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 10, 28);

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${entries.length} ${entries.length === 1 ? "entrada" : "entradas"}`, 10, 34);

  autoTable(doc, {
    startY: 38,
    head: [["Fuente", "Título", "Categoría", "Fecha", "Leído", "URL"]],
    body: entries.map((e) => [
      SOURCE_LABELS[e.source] ?? e.source,
      e.title,
      e.category ?? "—",
      formatDateEs(e.publishedAt),
      e.isRead ? "Sí" : "No",
      e.url,
    ]),
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    bodyStyles: { fontSize: 7, textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 100 },
      2: { cellWidth: 36 },
      3: { cellWidth: 22 },
      4: { cellWidth: 14 },
      5: { cellWidth: 70, textColor: [37, 99, 235] },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        297 / 2,
        210 - 5,
        { align: "center" }
      );
    },
  });

  doc.save(`${filename}_${new Date().toISOString().split("T")[0]}.pdf`);
}
