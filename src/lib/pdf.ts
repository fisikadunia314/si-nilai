/** Generate LEGER NILAI (PDF) — auto portrait/landscape, pagination otomatis. */
import PDFDocument from "pdfkit";
import type { LegerInfo, LegerRow } from "@/lib/excel";

export async function buildLegerPdf(info: LegerInfo, componentNames: string[], rows: LegerRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const nComp = componentNames.length;
    const portraitUsable = 515; // A4 portrait - 2*40
    const landscapeUsable = 770; // A4 landscape - 2*36
    const fixedPortrait = 26 + 58 + 130 + 108; // No, NIS, Nama, Akhir+Ket
    const perCompPortrait = (portraitUsable - fixedPortrait) / Math.max(nComp, 1);
    const useLandscape = perCompPortrait < 38;

    const doc = new PDFDocument({
      size: "A4",
      layout: useLandscape ? "landscape" : "portrait",
      margins: useLandscape ? { top: 36, bottom: 36, left: 36, right: 36 } : { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
      info: { Title: `Leger Nilai - ${info.subjectName} ${info.className}`, Creator: "SiNilai" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const noW = 26, nisW = 58, namaW = useLandscape ? 150 : 130, akhirW = 62, ketW = 52;
    const compW = (W - noW - nisW - namaW - akhirW - ketW) / Math.max(nComp, 1);

    const BLUE = "#1d56eb", GREY = "#64748b", RED = "#dc2626", LINE = "#cbd5e1";

    const drawHeaderBlock = () => {
      doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text(info.schoolName.toUpperCase(), { align: "center" });
      if (info.schoolAddress) doc.font("Helvetica").fontSize(8).fillColor(GREY).text(info.schoolAddress, { align: "center" });
      doc.moveDown(0.2);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).lineWidth(1.4).stroke(BLUE);
      doc.moveDown(0.35);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("LEGER NILAI", { align: "center" });
      doc.font("Helvetica").fontSize(9).fillColor("#0f172a")
        .text(`${info.subjectName} (${info.subjectCode})  •  Kelas ${info.className}  •  Semester ${info.semester} TA ${info.year}`, { align: "center" })
        .text(`Guru: ${info.teacherName}   |   KKM: ${info.passingGrade}`, { align: "center" });
      doc.moveDown(0.5);
    };

    const drawTableHeader = (y: number) => {
      doc.rect(doc.page.margins.left, y, W, 22).fill(BLUE);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
      let x = doc.page.margins.left;
      const cells: Array<[string, number]> = [
        ["NO", noW], ["NIS", nisW], ["NAMA SISWA", namaW],
        ...componentNames.map((n): [string, number] => [n.toUpperCase(), compW]),
        ["AKHIR", akhirW], ["KET.", ketW],
      ];
      for (const [label, w] of cells) {
        doc.text(label, x + 2, y + 4, { width: w - 4, align: "center", ellipsis: true, lineBreak: false });
        x += w;
      }
      return y + 22;
    };

    drawHeaderBlock();
    let y = drawTableHeader(doc.y);
    const rowH = 19;

    const ensureRowSpace = () => {
      if (y + rowH > doc.page.height - doc.page.margins.bottom - 60) {
        doc.addPage();
        drawHeaderBlock();
        y = drawTableHeader(doc.y);
      }
    };

    rows.forEach((r, i) => {
      ensureRowSpace();
      if (i % 2 === 1) doc.rect(doc.page.margins.left, y, W, rowH).fill("#eff6ff");
      doc.fillColor("#0f172a").font("Helvetica").fontSize(7.5);
      let x = doc.page.margins.left;
      const cells: Array<[string, number, "left" | "center"]> = [
        [String(i + 1), noW, "center"],
        [r.nis, nisW, "center"],
        [r.name, namaW, "left"],
        ...r.values.map((v): [string, number, "center"] => [v == null ? "-" : String(v), compW, "center"]),
        [r.final == null ? "-" : String(r.final), akhirW, "center"],
        [r.passed == null ? "-" : r.passed ? "Tuntas" : "Remedial", ketW, "center"],
      ];
      for (const [text, w, align] of cells) {
        const isKet = w === ketW;
        doc.fillColor(isKet && r.passed === false ? RED : "#0f172a");
        doc.text(text, x + 2, y + 5, { width: w - 4, align, ellipsis: true, lineBreak: false });
        x += w;
      }
      doc.moveTo(doc.page.margins.left, y + rowH).lineTo(doc.page.width - doc.page.margins.right, y + rowH).lineWidth(0.4).stroke(LINE);
      y += rowH;
    });

    y += 26;
    if (y + 90 > doc.page.height - doc.page.margins.bottom) { doc.addPage(); y = doc.page.margins.top + 10; }
    const tanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
    const rightX = doc.page.width - doc.page.margins.right - 220;
    doc.fillColor("#0f172a").font("Helvetica").fontSize(9);
    doc.text(`Dicetak pada ${tanggal}`, rightX, y, { width: 220, align: "center" });
    doc.text("Guru Mata Pelajaran,", rightX, y + 14, { width: 220, align: "center" });
    doc.moveDown(3.2);
    doc.font("Helvetica-Bold").text(info.teacherName, rightX, doc.y, { width: 220, align: "center", underline: true });

    // Footer nomor halaman
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font("Helvetica").fontSize(7).fillColor(GREY).text(`SiNilai • Leger Nilai • Halaman ${i + 1} dari ${range.count}`, doc.page.margins.left, doc.page.height - 22, { width: W, align: "center" });
    }

    doc.end();
  });
}
