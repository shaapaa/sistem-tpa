import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"

export interface ReportTable {
  title?: string
  head: string[]
  body: string[][]
}

export interface ReportPdfOptions {
  filename: string
  title: string
  metadata: string[]
  tables: ReportTable[]
  notes?: { title: string; body: string }[]
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Logo could not be loaded"))
    image.src = dataUrl
  })
}

export async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch("/logo-mark.svg")
    const svg = await response.text()
    const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
    const canvas = document.createElement("canvas")
    canvas.width = 128
    canvas.height = 128
    canvas.getContext("2d")?.drawImage(image, 0, 0, 128, 128)
    return canvas.toDataURL("image/png")
  } catch {
    return null
  }
}

export async function createReportPdf({ filename, title, metadata, tables, notes = [] }: ReportPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const logo = await loadLogoDataUrl()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 16

  if (logo) {
    doc.addImage(logo, "PNG", margin, y - 5, 17, 17)
  }

  doc.setTextColor(32, 41, 37)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("TPA BAITUL YATAMA", margin + (logo ? 22 : 0), y + 2)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("SISTEM MONITORING PENDIDIKAN", margin + (logo ? 22 : 0), y + 8)
  doc.setDrawColor(55, 107, 89)
  doc.setLineWidth(0.5)
  doc.line(margin, y + 15, pageWidth - margin, y + 15)

  y += 25
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(title, margin, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  metadata.forEach((line) => {
    y += 5
    doc.text(line, margin, y)
  })
  y += 5

  for (const table of tables) {
    if (table.title) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text(table.title, margin, y)
      y += 3
    }
    autoTable(doc, {
      head: [table.head],
      body: table.body,
      startY: y,
      margin: { top: 16, right: margin, bottom: 16, left: margin },
      pageBreak: "auto",
      showHead: "everyPage",
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, textColor: [32, 41, 37] },
      headStyles: { fillColor: [55, 107, 89], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 246, 240] },
    })
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
    y += 8
    if (y > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage()
      y = 20
    }
  }

  notes.forEach((note) => {
    if (y > doc.internal.pageSize.getHeight() - 35) {
      doc.addPage()
      y = 20
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text(note.title, margin, y)
    y += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(note.body || "-", margin, y, { maxWidth: pageWidth - margin * 2 })
    y += 10
  })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(105, 112, 108)
  doc.text("Dokumen ini dibuat oleh Sistem Monitoring TPA Baitul Yatama.", margin, doc.internal.pageSize.getHeight() - 10)
  doc.save(filename)
}
