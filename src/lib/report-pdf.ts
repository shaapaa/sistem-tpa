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

export async function loadLogoDataUrl(): Promise<{ dataUrl: string; aspect: number } | null> {
  try {
    const response = await fetch("/image/logo-tpa-flat.png")
    const blob = await response.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Logo could not be loaded"))
      reader.readAsDataURL(blob)
    })
    const aspect = await new Promise<number>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image.naturalWidth / image.naturalHeight)
      image.onerror = () => reject(new Error("Logo could not be loaded"))
      image.src = dataUrl
    })
    return { dataUrl, aspect }
  } catch {
    return null
  }
}

export async function createReportPdf({ filename, title, metadata, tables, notes = [] }: ReportPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const logo = await loadLogoDataUrl()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 14

  // Kop surat: logo + nama TPA + alamat + kontak (centered)
  if (logo) {
    const logoH = 22
    const logoW = logo.aspect >= 1 ? logoH * Math.min(logo.aspect, 2.2) : logoH
    doc.addImage(logo.dataUrl, "PNG", (pageWidth - logoW) / 2, y, logoW, logoH)
    y += logoH + 4
  }
  doc.setTextColor(32, 41, 37)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("TAMAN PENDIDIKAN AL-QUR'AN", pageWidth / 2, y, { align: "center" })
  y += 7
  doc.setFontSize(16)
  doc.text("BAITUL YATAMA", pageWidth / 2, y, { align: "center" })
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  const alamat = doc.splitTextToSize(
    "Jl. Letjend Ryacudu Perum Korpri Blok B XI No 8, Kelurahan Korpri Raya Bandar Lampung 35131",
    pageWidth - margin * 2
  )
  alamat.forEach((line: string) => {
    doc.text(line, pageWidth / 2, y, { align: "center" })
    y += 4
  })
  doc.text("Kontak: 085366886931", pageWidth / 2, y, { align: "center" })
  y += 6
  doc.setDrawColor(55, 107, 89)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 9
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
