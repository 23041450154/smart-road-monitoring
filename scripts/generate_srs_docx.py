#!/usr/bin/env python3
"""
Script to generate a comprehensive, professional Software Requirements Specification (SRS)
in Microsoft Word (.docx) format for the Capstone Project:
"Sistem Monitoring Lalu Lintas dan Asisten Komuter Cerdas Berbasis Computer Vision (LAJU)"
Universitas Islam Negeri Raden Fatah Palembang - NIM: 23041450154
Standard: IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018
"""

import os
import sys
import shutil
from datetime import datetime
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

# Paths
DOCS_DIR = "/home/naufal/Documents/capstone/docs"
OUTPUT_FILE = os.path.join(DOCS_DIR, "SRS_Smart_Road_Monitoring_LAJU.docx")
ARTIFACT_OUTPUT_FILE = "/home/naufal/.gemini/antigravity-cli/brain/a1e85f79-ccda-4766-bedd-53524374ee0d/SRS_Smart_Road_Monitoring_LAJU.docx"

# Image Paths
IMG_CCTV_PALEMBANG = "/home/naufal/.gemini/antigravity-cli/brain/a1e85f79-ccda-4766-bedd-53524374ee0d/scratch/live_cam4.jpg"
IMG_TRAFFIC_DETECTION = "/home/naufal/.gemini/antigravity-cli/brain/a1e85f79-ccda-4766-bedd-53524374ee0d/scratch/traffic_mp4_frame.jpg"
IMG_POTHOLE_EVIDENCE = "/home/naufal/Documents/capstone/vision/evidence/pothole-20260101T000003500000.jpg"

# Color Palette
HEX_PRIMARY = "1B365D"      # Navy Blue
HEX_SECONDARY = "007791"    # Deep Teal
HEX_ACCENT = "2563EB"       # Royal Blue
HEX_DARK_TEXT = "1F2937"    # Dark Charcoal / Body
HEX_LIGHT_BG = "F8FAFC"     # Slate Tint / Table zebra
HEX_BORDER = "CBD5E1"       # Light Slate Border
HEX_CALLOUT_BG = "F0F9FF"   # Soft Blue Callout
HEX_CALLOUT_BORDER = "0284C7"# Teal Blue Callout Border
HEX_WARN_BG = "FEF3C7"      # Soft Amber
HEX_WARN_BORDER = "D97706"  # Amber Border

COLOR_PRIMARY = RGBColor(27, 54, 93)
COLOR_SECONDARY = RGBColor(0, 119, 145)
COLOR_ACCENT = RGBColor(37, 99, 235)
COLOR_DARK_TEXT = RGBColor(31, 41, 55)
COLOR_MUTED = RGBColor(100, 116, 139)


def set_cell_shading(cell, hex_color):
    """Set background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    for child in list(tcPr):
        if child.tag.endswith('shd'):
            tcPr.remove(child)
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shading)


def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    """Set inner padding of a table cell (in twips/dxa: 20 dxa = 1 pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>\n'
        f'  <w:top w:w="{top}" w:type="dxa"/>\n'
        f'  <w:left w:w="{left}" w:type="dxa"/>\n'
        f'  <w:bottom w:w="{bottom}" w:type="dxa"/>\n'
        f'  <w:right w:w="{right}" w:type="dxa"/>\n'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)


def set_cell_borders(cell, top="single", bottom="single", left="single", right="single", color=HEX_BORDER, sz="4"):
    """Set cell borders."""
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>\n'
        f'  <w:top w:val="{top}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'  <w:left w:val="{left}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'  <w:bottom w:val="{bottom}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'  <w:right w:val="{right}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)


def format_table(table, col_widths=None, header_bg=HEX_PRIMARY):
    """Apply consistent styling, repeating headers, and borders to a table."""
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    for i, row in enumerate(table.rows):
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

        if i == 0:
            trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

        for j, cell in enumerate(row.cells):
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell, top=120, bottom=120, left=160, right=160)

            if i == 0:
                set_cell_shading(cell, header_bg)
                set_cell_borders(cell, top="single", bottom="single", left="single", right="single", color=header_bg, sz="6")
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    p.paragraph_format.line_spacing = 1.1
                    for run in p.runs:
                        run.font.bold = True
                        run.font.color.rgb = RGBColor(255, 255, 255)
                        run.font.size = Pt(9.5)
                        run.font.name = "Calibri"
            else:
                bg_color = HEX_LIGHT_BG if i % 2 == 1 else "FFFFFF"
                set_cell_shading(cell, bg_color)
                set_cell_borders(cell, top="single", bottom="single", left="single", right="single", color=HEX_BORDER, sz="4")
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    p.paragraph_format.line_spacing = 1.15
                    for run in p.runs:
                        run.font.color.rgb = COLOR_DARK_TEXT
                        run.font.size = Pt(9.0)
                        run.font.name = "Calibri"

            if col_widths and j < len(col_widths):
                cell.width = Inches(col_widths[j])


def add_callout(doc, text, title="CATATAN PENTING", callout_type="info"):
    """Insert a highlighted callout box with a colored left accent border."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)

    bg_color = HEX_CALLOUT_BG if callout_type == "info" else HEX_WARN_BG
    border_color = HEX_CALLOUT_BORDER if callout_type == "info" else HEX_WARN_BORDER

    set_cell_shading(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=160)
    set_cell_borders(cell, top="none", bottom="none", left="single", right="none", color=border_color, sz="24")

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    r_title = p.add_run(f"📌 {title}: ")
    r_title.bold = True
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(9.5)
    r_title.font.color.rgb = COLOR_PRIMARY if callout_type == "info" else RGBColor(180, 83, 9)

    r_text = p.add_run(text)
    r_text.font.name = "Calibri"
    r_text.font.size = Pt(9.0)
    r_text.font.color.rgb = COLOR_DARK_TEXT

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_before = Pt(0)
    p_space.paragraph_format.space_after = Pt(4)


def add_figure(doc, image_path, caption_text, width=Inches(5.0)):
    """Embed an image figure with centered alignment and formal caption."""
    if os.path.exists(image_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(3)
        run_img = p_img.add_run()
        run_img.add_picture(image_path, width=width)

        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(0)
        p_cap.paragraph_format.space_after = Pt(8)
        r_cap = p_cap.add_run(caption_text)
        r_cap.font.name = "Calibri"
        r_cap.font.size = Pt(9.0)
        r_cap.font.italic = True
        r_cap.font.color.rgb = COLOR_MUTED


def add_p(doc, text="", bold_prefix=None, space_after=4, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    """Add a styled body paragraph."""
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing

    if bold_prefix:
        r_prefix = p.add_run(bold_prefix)
        r_prefix.bold = True
        r_prefix.font.name = "Calibri"
        r_prefix.font.size = Pt(10.5)
        r_prefix.font.color.rgb = COLOR_DARK_TEXT

    if text:
        r_text = p.add_run(text)
        r_text.font.name = "Calibri"
        r_text.font.size = Pt(10.5)
        r_text.font.color.rgb = COLOR_DARK_TEXT

    return p


def add_bullet(doc, text, bold_prefix=None, level=0):
    """Add a styled bullet list item."""
    p = doc.add_paragraph(style='List Bullet')
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.left_indent = Inches(0.25 * (level + 1))

    if bold_prefix:
        r_prefix = p.add_run(bold_prefix)
        r_prefix.bold = True
        r_prefix.font.name = "Calibri"
        r_prefix.font.size = Pt(10)
        r_prefix.font.color.rgb = COLOR_DARK_TEXT

    r_text = p.add_run(text)
    r_text.font.name = "Calibri"
    r_text.font.size = Pt(10)
    r_text.font.color.rgb = COLOR_DARK_TEXT
    return p


def add_h1(doc, text):
    """Heading 1 with page break before (except first)."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.name = "Calibri"
    run.font.size = Pt(15)
    run.font.color.rgb = COLOR_PRIMARY
    return p


def add_h2(doc, text):
    """Heading 2."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.name = "Calibri"
    run.font.size = Pt(12.5)
    run.font.color.rgb = COLOR_SECONDARY
    return p


def add_h3(doc, text):
    """Heading 3."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.name = "Calibri"
    run.font.size = Pt(11)
    run.font.color.rgb = COLOR_ACCENT
    return p


def setup_document():
    """Create document and set up margins, headers, footers."""
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.2)   # 3.0 cm approx
        section.right_margin = Inches(1.0)  # 2.5 cm approx
        section.different_first_page_header_footer = True

        # Header for normal pages
        header = section.header
        p_hdr = header.paragraphs[0]
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_hdr.paragraph_format.space_after = Pt(0)
        r_hdr = p_hdr.add_run("LAJU — Spesifikasi Kebutuhan Perangkat Lunak (SRS) | IEEE 830")
        r_hdr.font.name = "Calibri"
        r_hdr.font.size = Pt(8.5)
        r_hdr.font.color.rgb = COLOR_MUTED

        # Footer for normal pages
        footer = section.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.paragraph_format.space_after = Pt(0)
        r_ftr_l = p_ftr.add_run("SRS-CAPSTONE-LAJU-2026-01 | NIM: 23041450154\t\tHalaman ")
        r_ftr_l.font.name = "Calibri"
        r_ftr_l.font.size = Pt(8.5)
        r_ftr_l.font.color.rgb = COLOR_MUTED

        # Page Number Field
        fldChar1 = parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w'))
        p_ftr.add_run()._r.append(fldChar1)

        r_ftr_m = p_ftr.add_run(" dari ")
        r_ftr_m.font.name = "Calibri"
        r_ftr_m.font.size = Pt(8.5)
        r_ftr_m.font.color.rgb = COLOR_MUTED

        fldChar2 = parse_xml(r'<w:fldSimple %s w:instr="NUMPAGES"/>' % nsdecls('w'))
        p_ftr.add_run()._r.append(fldChar2)

    return doc


def build_cover_page(doc):
    """Build a formal, academic & engineering cover page."""
    p_top = doc.add_paragraph()
    p_top.paragraph_format.space_before = Pt(20)
    p_top.paragraph_format.space_after = Pt(0)

    p_badge = doc.add_paragraph()
    p_badge.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_badge.paragraph_format.space_after = Pt(8)
    r_badge = p_badge.add_run("DOKUMEN REKAYASA PERANGKAT LUNAK — STANDAR IEEE STD 830-1998")
    r_badge.font.name = "Calibri"
    r_badge.font.size = Pt(9.5)
    r_badge.font.bold = True
    r_badge.font.color.rgb = COLOR_SECONDARY

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(12)
    p_title.paragraph_format.space_after = Pt(10)
    r_title = p_title.add_run("SPESIFIKASI KEBUTUHAN PERANGKAT LUNAK\n(SOFTWARE REQUIREMENTS SPECIFICATION)")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(20)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(6)
    p_sub.paragraph_format.space_after = Pt(24)
    r_sub = p_sub.add_run(
        "SISTEM MONITORING LALU LINTAS DAN ASISTEN KOMUTER CERDAS\n"
        "BERBASIS COMPUTER VISION TERINTEGRASI CCTV KOTA PALEMBANG\n(LAJU)"
    )
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(13)
    r_sub.font.bold = True
    r_sub.font.color.rgb = COLOR_DARK_TEXT

    p_div = doc.add_paragraph()
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_div.paragraph_format.space_after = Pt(24)
    r_div = p_div.add_run("―" * 40)
    r_div.font.color.rgb = COLOR_ACCENT

    p_author = doc.add_paragraph()
    p_author.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_author.paragraph_format.space_after = Pt(4)
    r_by = p_author.add_run("Disusun Oleh:\n")
    r_by.font.size = Pt(10.5)
    r_by.font.color.rgb = COLOR_MUTED
    r_name = p_author.add_run("MUHAMMAD NAUFAL AL-GHIFARI\n")
    r_name.font.size = Pt(12)
    r_name.font.bold = True
    r_name.font.color.rgb = COLOR_PRIMARY
    r_nim = p_author.add_run("NIM: 23041450154\n")
    r_nim.font.size = Pt(11)
    r_nim.font.bold = True
    r_nim.font.color.rgb = COLOR_SECONDARY

    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_inst.paragraph_format.space_before = Pt(24)
    p_inst.paragraph_format.space_after = Pt(0)
    r_inst = p_inst.add_run(
        "PROGRAM STUDI SISTEM INFORMASI\n"
        "FAKULTAS SAINS DAN TEKNOLOGI\n"
        "UNIVERSITAS ISLAM NEGERI RADEN FATAH PALEMBANG\n"
        "2026"
    )
    r_inst.font.name = "Calibri"
    r_inst.font.size = Pt(11)
    r_inst.font.bold = True
    r_inst.font.color.rgb = COLOR_DARK_TEXT

    doc.add_page_break()

    # Document Control Table
    add_h2(doc, "LEMBAR PENGENDALIAN DOKUMEN (DOCUMENT CONTROL)")
    add_p(doc, "Dokumen Spesifikasi Kebutuhan Perangkat Lunak (SRS) ini merupakan acuan formal rekayasa perangkat lunak untuk perancangan, implementasi, verifikasi, dan validasi sistem LAJU.")

    meta_data = [
        ("Identifikasi Dokumen", "SRS-CAPSTONE-LAJU-2026-01"),
        ("Judul Perangkat Lunak", "Sistem Monitoring Lalu Lintas & Asisten Komuter Cerdas (LAJU)"),
        ("Penulis / Pengembang", "Muhammad Naufal Al-Ghifari (NIM: 23041450154)"),
        ("Institusi Akademik", "UIN Raden Fatah Palembang — Fakultas Sains dan Teknologi"),
        ("Versi Dokumen", "1.0 (Final Release Candidate)"),
        ("Status Dokumen", "Disetujui untuk Implementasi & Pengujian Capstone"),
        ("Tanggal Terbit", datetime.now().strftime("%d %B %Y")),
    ]
    meta_table = doc.add_table(rows=len(meta_data), cols=2)
    for idx, (label, val) in enumerate(meta_data):
        meta_table.cell(idx, 0).text = label
        meta_table.cell(idx, 1).text = val
    format_table(meta_table, col_widths=[2.3, 4.2])

    add_h2(doc, "RIWAYAT REVISI DOKUMEN")
    headers = ["Versi", "Tanggal", "Penyusun", "Bagian Berubah", "Deskripsi Perubahan"]
    rev_rows = [
        ("0.1", "01 Sep 2026", "Naufal Al-Ghifari", "Bab 1, Bab 2", "Inisiasi ruang lingkup, latar belakang, dan perumusan kebutuhan awal."),
        ("0.5", "03 Sep 2026", "Naufal Al-Ghifari", "Bab 3, Bab 4", "Perumusan kebutuhan fungsional modul CCTV, YOLOv11, ByteTrack, dan PostGIS."),
        ("1.0", "07 Sep 2026", "Naufal Al-Ghifari", "Bab 5, 6, 7, 8", "Finalisasi kebutuhan non-fungsional, matriks use case, spesifikasi API, dan RTM."),
    ]
    rev_table = doc.add_table(rows=len(rev_rows) + 1, cols=5)
    for j, h in enumerate(headers):
        rev_table.cell(0, j).text = h
    for r_idx, row in enumerate(rev_rows, start=1):
        for c_idx, val in enumerate(row):
            rev_table.cell(r_idx, c_idx).text = val
    format_table(rev_table, col_widths=[0.6, 1.1, 1.3, 1.3, 2.2])

    add_callout(
        doc,
        "Dokumen ini disusun berdasarkan kaidah IEEE Std 830-1998 (Recommended Practice for Software Requirements Specifications) "
        "dan ISO/IEC/IEEE 29148:2018 untuk menjamin ketertelusuran (traceability), ketepatan (correctness), dan verifiabilitas dari setiap kebutuhan sistem.",
        title="STANDARISASI REKAYASA",
        callout_type="info"
    )

    doc.add_page_break()


def build_chapter_1(doc):
    """Bab 1: Pendahuluan."""
    add_h1(doc, "BAB I: PENDAHULUAN")

    add_h2(doc, "1.1 Tujuan Dokumen (Purpose)")
    add_p(
        doc,
        "Dokumen Spesifikasi Kebutuhan Perangkat Lunak (Software Requirements Specification - SRS) ini disusun "
        "untuk mendefinisikan secara menyeluruh, rinci, dan terstruktur kebutuhan fungsional maupun non-fungsional dari sistem "
        "Smart Road Monitoring & Commuter Assistant yang diberi nama sistem LAJU. "
        "Tujuan utama dari dokumen ini adalah:"
    )
    add_bullet(doc, "Menyediakan acuan resmi dan baku bagi pengembang (developer) dalam mengimplementasikan modul vision, backend FastAPI, basis data spasial PostGIS, antarmuka web Next.js, dan alur automasi n8n.", "1. Pedoman Implementasi: ")
    add_bullet(doc, "Menjadi landasan verifikasi dan validasi (pengujian sistem) bagi dosen penguji, dosen pembimbing, dan tim penilai tugas akhir/capstone di Universitas Islam Negeri Raden Fatah Palembang.", "2. Standar Pengujian: ")
    add_bullet(doc, "Menyajikan spesifikasi teknis dan operasional yang transparan bagi pemangku kepentingan instansi pemerintah (Dinas Perhubungan dan Dinas Pekerjaan Umum dan Penataan Ruang Kota Palembang) mengenai pemanfaatan integrasi CCTV publik dan inspeksi jalan cerdas.", "3. Transparansi Stakeholder: ")
    add_bullet(doc, "Menjamin konsistensi arsitektur teknis agar memenuhi kriteria reliabilitas, keamanan, efisiensi komputasi, dan kepatuhan privasi pengguna jalan.", "4. Jaminan Mutu Perangkat Lunak: ")

    add_h2(doc, "1.2 Ruang Lingkup Masalah dan Produk (Scope)")
    add_p(
        doc,
        "Kota Palembang sebagai ibu kota Provinsi Sumatera Selatan mengalami peningkatan volume kendaraan bermotor yang sangat signifikan, "
        "terutama pada koridor-koridor arteri utama seperti Jalan Jenderal Sudirman, Jalan R. Sukamto, Jalan Basuki Rahmat, kawasan Simpang Lima DPRD, "
        "Simpang Polda, dan Jembatan Ampera. Kemacetan harian pada jam sibuk pagi (06.30 - 08.30 WIB) dan jam sibuk sore (16.30 - 18.30 WIB) "
        "sering kali diperparah oleh kerusakan permukaan jalan seperti jalan berlubang (potholes) yang memaksa pengendara memperlambat laju atau berpindah lajur secara mendadak."
    )
    add_p(
        doc,
        "Sistem LAJU dirancang sebagai solusi perangkat lunak terintegrasi yang memanfaatkan kecerdasan buatan (Artificial Intelligence) dan visi komputer (Computer Vision) "
        "untuk mengubah jaringan kamera pengawas lalu lintas (CCTV) eksisting Pemerintah Kota Palembang yang sebelumnya bersifat pasif menjadi sistem pemantau aktif yang cerdas. "
        "Secara garis besar, ruang lingkup produk mencakup:"
    )
    add_bullet(doc, "Ingestion dan adaptasi stream video CCTV real-time berbasis protokol HTTP Live Streaming (HLS) dan Real-Time Streaming Protocol (RTSP) dari puluhan titik strategis persimpangan dan ruas jalan Kota Palembang.", "a. CCTV Streaming Pipeline: ")
    add_bullet(doc, "Pipeline Computer Vision deteksi kendaraan multi-kelas (motorcycle, car, bus, truck) menggunakan YOLOv11 dan pelacakan lintasan (tracking) menggunakan ByteTrack dengan mekanisme Virtual Counting Line.", "b. Traffic Analytics Engine: ")
    add_bullet(doc, "Perhitungan klasifikasi status kemacetan secara deterministik (LANCAR, SEDANG, PADAT, MACET) berdasarkan ambang batas volume kendaraan dan indikator tren perubahan arus.", "c. Klasifikasi Deterministik: ")
    add_bullet(doc, "Pendeteksian jalan berlubang (potholes) otomatis dari video survei bergerak menggunakan model YOLOv11 terlatih, disinkronkan secara temporal dengan data log GPS (.gpx) untuk mendapatkan koordinat lintang/bujur presisi, serta deduplikasi spasial otomatis dalam radius 10 meter.", "d. Mobile Pothole Inspection: ")
    add_bullet(doc, "Fitur asisten komuter cerdas yang memungkinkan pengguna menyimpan rute perjalanan harian, menghitung kepadatan lalu lintas dan potensi titik lubang di sepanjang koridor rute melalui query spasial PostGIS.", "e. Spatial Commuter Assistant: ")
    add_bullet(doc, "Mesin pengirim briefing otomatis terjadwal (Commuter Briefing) yang terintegrasi dengan n8n workflow engine untuk meneruskan laporan kondisi jalan harian ke kanal WhatsApp pengguna sebelum waktu keberangkatan.", "f. n8n & WhatsApp Dispatcher: ")
    add_bullet(doc, "Dashboard web modern berbasis Next.js 16, React 19, Tailwind CSS, Leaflet Map, dan visualisasi grafik interaktif Recharts.", "g. Web GIS Dashboard: ")

    add_p(
        doc,
        "Batasan masalah dalam sistem LAJU meliputi: (1) Sistem tidak melakukan pengenalan pelat nomor kendaraan (Automatic License Plate Recognition / ALPR) maupun pengenalan wajah guna menjamin privasi masyarakat; "
        "(2) Kualitas deteksi CCTV dipengaruhi oleh resolusi feed dan kestabilan jaringan internet publik Diskominfo; (3) Modul pothole memproses video survei rekaman jalan berkamera depan yang dilengkapi logger GPS GPX; "
        "(4) Notifikasi WhatsApp disiapkan melalui payload n8n outbox berstandar API."
    )

    add_h2(doc, "1.3 Definisi, Istilah, dan Akronim (Definitions and Acronyms)")
    defs = [
        ("SRS / SKPL", "Software Requirements Specification / Spesifikasi Kebutuhan Perangkat Lunak, dokumen formal yang memuat seluruh kebutuhan sistem."),
        ("IEEE 830-1998", "Standar internasional IEEE yang mengatur struktur, metodologi, dan format penulisan spesifikasi kebutuhan perangkat lunak."),
        ("CCTV", "Closed-Circuit Television, sistem kamera pengawas video tertutup untuk pemantauan keamanan dan lalu lintas."),
        ("HLS", "HTTP Live Streaming (RFC 8216), protokol transmisi video adaptif berbasis HTTP dengan format playlist .m3u8 dan segmen transport stream .ts."),
        ("RTSP", "Real-Time Streaming Protocol, protokol jaringan untuk mengontrol server media streaming secara langsung."),
        ("MJPEG", "Motion JPEG, format streaming video di mana setiap frame video dikompresi terpisah sebagai gambar JPEG (Content-Type: multipart/x-mixed-replace)."),
        ("YOLOv11", "You Only Look Once versi 11, arsitektur deep learning state-of-the-art berbasis Convolutional Neural Network untuk object detection real-time."),
        ("ByteTrack", "Algoritma Multi-Object Tracking (MOT) yang mempertahankan pelacakan objek bahkan ketika objek mengalami oklusi sebagian menggunakan skor deteksi rendah."),
        ("PostGIS", "Ekstensi basis data spasial untuk PostgreSQL yang menyediakan tipe data geometri, geografi, dan fungsi query spasial (ST_DWithin, ST_MakeLine)."),
        ("GPX", "GPS Exchange Format, skema XML untuk pertukaran data GPS yang memuat koordinat waypoint, route, track point, elevasi, dan timestamp UTC."),
        ("LOD", "Level of Detail, teknik optimasi rendering grafis/antarmuka yang menyederhanakan penandaan objek saat viewport diperkecil untuk menghemat memori."),
        ("n8n", "Platform otomasi alur kerja (workflow automation) berbasis open-source/node untuk mengintegrasikan REST API dengan layanan pengiriman pesan."),
        ("WKT", "Well-Known Text, representasi teks baku untuk geometri spasial vektor (seperti POINT, LINESTRING, POLYGON)."),
    ]
    def_table = doc.add_table(rows=len(defs) + 1, cols=2)
    def_table.cell(0, 0).text = "Istilah / Akronim"
    def_table.cell(0, 1).text = "Definisi dan Penjelasan Teknis"
    for r_idx, (t_term, t_desc) in enumerate(defs, start=1):
        def_table.cell(r_idx, 0).text = t_term
        def_table.cell(r_idx, 1).text = t_desc
    format_table(def_table, col_widths=[1.8, 4.7])

    add_h2(doc, "1.4 Referensi dan Standar Acuan (References)")
    add_bullet(doc, "IEEE Computer Society. (1998). IEEE Recommended Practice for Software Requirements Specifications (IEEE Std 830-1998). New York: IEEE.", "1. ")
    add_bullet(doc, "ISO/IEC/IEEE. (2018). Systems and software engineering — Life cycle processes — Requirements engineering (ISO/IEC/IEEE 29148:2018).", "2. ")
    add_bullet(doc, "Ultralytics LLC. (2024). YOLOv11: State-of-the-Art Real-Time Object Detection and Instance Segmentation.", "3. ")
    add_bullet(doc, "Zhang, Y., Sun, P., Dong, Y., et al. (2022). ByteTrack: Multi-Object Tracking by Associating Every Detection Box. European Conference on Computer Vision (ECCV).", "4. ")
    add_bullet(doc, "Open Geospatial Consortium (OGC). (2016). OpenGIS Implementation Standard for Geographic information - Simple feature access.", "5. ")
    add_bullet(doc, "Pedoman Penulisan Tugas Akhir dan Capstone Project Fakultas Sains dan Teknologi Universitas Islam Negeri Raden Fatah Palembang (2025/2026).", "6. ")

    add_h2(doc, "1.5 Gambaran Umum Dokumen (Document Overview)")
    add_p(
        doc,
        "Dokumen SRS ini diorganisasikan ke dalam delapan bab utama sesuai konvensi rekayasa perangkat lunak: "
        "Bab I menyajikan pendahuluan, tujuan, ruang lingkup, glosarium, dan acuan; "
        "Bab II mendeskripsikan perspektif produk, fungsionalitas umum, karakteristik aktor, dan batasan perancangan; "
        "Bab III menguraikan kebutuhan antarmuka eksternal (UI, perangkat keras, perangkat lunak, dan komunikasi); "
        "Bab IV mendetailkan seluruh kebutuhan fungsional dengan identifikasi kode terstruktur; "
        "Bab V menguraikan kebutuhan non-fungsional (kinerja, keandalan, keamanan, kemudahan pakai, dan pemeliharaan); "
        "Bab VI menyajikan pemodelan Use Case beserta skenario langkah alur kerjanya; "
        "Bab VII menguraikan arsitektur data, spesifikasi endpoint API, dan Matriks Ketertelusuran Kebutuhan (Requirements Traceability Matrix - RTM); "
        "serta Bab VIII menyimpulkan spesifikasi kebutuhan dan menjabarkan rencana verifikasi sistem."
    )

    doc.add_page_break()


def build_chapter_2(doc):
    """Bab 2: Deskripsi Umum Sistem."""
    add_h1(doc, "BAB II: DESKRIPSI UMUM SISTEM")

    add_h2(doc, "2.1 Perspektif Produk (Product Perspective)")
    add_p(
        doc,
        "Sistem LAJU adalah perangkat lunak mandiri (self-contained) yang berbasis arsitektur terdistribusi monorepo modern. "
        "Sistem beroperasi di lingkungan cloud/virtual private server (VPS) terpusat, dengan koneksi eksternal ke feed CCTV Pemerintah Kota Palembang, "
        "koneksi ke modul pengolah visi komputer berbasis PyTorch/Ultralytics, serta antarmuka web modern yang dapat diakses dari berbagai peramban (browser) komuter maupun operator pemerintah."
    )

    # Embed sample image of Palembang CCTV feed
    add_figure(
        doc,
        IMG_CCTV_PALEMBANG,
        "Gambar 2.1: Cuplikan Aliran Stream Live CCTV Persimpangan Jalan Kota Palembang (Diskominfo Palembang)",
        width=Inches(5.2)
    )

    add_p(
        doc,
        "Secara arsitektural, sistem LAJU terbagi ke dalam empat subsistem terintegrasi:"
    )
    add_bullet(doc, "Worker latar belakang (background worker) yang mengambil stream CCTV (HLS/RTSP), menerapkan model YOLOv11 untuk inferensi bounding box kendaraan, menjalankan ByteTrack untuk tracking kontinu ID siklis, menghitung lintasan garis virtual, dan mengirim snapshot agregat per menit ke basis data.", "1. Vision Worker Subsystem (Traffic & Pothole): ")
    add_bullet(doc, "Layanan inti berbasis Python FastAPI yang mengelola business logic, klasifikasi kepadatan deterministik, query spasial PostGIS untuk koridor rute, serta menyediakan antarmuka REST API dan streaming MJPEG ke frontend.", "2. Core API Backend Subsystem: ")
    add_bullet(doc, "Penyimpanan data relasional dan geospasial menggunakan PostgreSQL 16 yang diperkaya ekstensi PostGIS 3.4 untuk melakukan pengindeksan spasial R-Tree dan operasi geometris (ST_DWithin, ST_Buffer, ST_Distance).", "3. Spatial Database Subsystem: ")
    add_bullet(doc, "Antarmuka berbasis web responsif menggunakan Next.js 16 (App Router), React 19, TypeScript, dan Tailwind CSS dengan peta Leaflet interaktif untuk visualisasi spasial titik kamera, rute komuter, dan lokasi lubang jalan.", "4. Interactive Web GIS Dashboard: ")
    add_bullet(doc, "Layanan automasi alur kerja n8n yang memicu query ringkasan rute secara terjadwal (cron) dan memformat payload pesan WhatsApp outbox ke komuter.", "5. Dispatcher Subsystem (n8n & WhatsApp): ")

    add_h2(doc, "2.2 Fitur dan Fungsi Utama Produk (Product Functions)")
    add_p(doc, "Fitur-fitur utama sistem LAJU dirangkum dalam tabel fungsionalitas berikut:")

    funcs = [
        ("1", "Manajemen & Streaming CCTV", "Mendaftarkan, mengelompokkan, dan mendistribusikan aliran video streaming CCTV publik Palembang (HLS/RTSP) melalui proxy MJPEG dengan toleransi reconnect otomatis."),
        ("2", "Deteksi & Counting Kendaraan Real-Time", "Mendeteksi empat kelas kendaraan (motorcycle, car, bus, truck), melacak ID objek dengan ByteTrack, dan menghitung volume kendaraan yang melintasi garis hitung virtual."),
        ("3", "Klasifikasi Kepadatan Deterministik", "Menghitung tingkat kejenuhan jalan secara matematis ke dalam 4 tingkatan (LANCAR, SEDANG, PADAT, MACET) beserta tren laju kendaraan (MENINGKAT, MENURUN, STABIL)."),
        ("4", "Inspeksi Pothole Berbasis GPX", "Mendeteksi jalan berlubang dari video bergerak, mengekstrak crop bukti gambar, menginterpolasikan koordinat GPS linear dari track GPX, dan mendeduplikasi data dalam radius 10 meter."),
        ("5", "Manajemen Rute Komuter", "Menyimpan preferensi rute harian pengguna, melakukan buffer spasial pada koridor jalan, dan mengidentifikasi kamera CCTV serta lubang jalan yang dilintasi rute."),
        ("6", "Asisten Commuter Briefing", "Menyusun ringkasan kondisi lalu lintas dan titik bahaya jalan berlubang secara otomatis sebelum jam sibuk keberangkatan dan kepulangan komuter."),
        ("7", "Visualisasi Web GIS & Analitik", "Menampilkan peta spasial terintegrasi, grid pemantauan CCTV, statistik grafik historis volume kendaraan (Recharts), dan tabel verifikasi lubang jalan."),
    ]
    func_table = doc.add_table(rows=len(funcs) + 1, cols=3)
    func_table.cell(0, 0).text = "No"
    func_table.cell(0, 1).text = "Grup Fungsi Utama"
    func_table.cell(0, 2).text = "Deskripsi Kapabilitas Sistem"
    for r_idx, (f_no, f_name, f_desc) in enumerate(funcs, start=1):
        func_table.cell(r_idx, 0).text = f_no
        func_table.cell(r_idx, 1).text = f_name
        func_table.cell(r_idx, 2).text = f_desc
    format_table(func_table, col_widths=[0.5, 2.0, 4.0])

    add_h2(doc, "2.3 Karakteristik dan Persona Pengguna (User Classes and Characteristics)")
    add_p(doc, "Sistem dirancang untuk melayani empat kelompok pengguna utama dengan karakteristik dan hak akses yang berbeda:")

    users = [
        ("Masyarakat / Komuter", "Pengguna Awam (Dasar)", "Melihat kondisi lalu lintas real-time di peta, mendaftarkan rute harian, dan menerima notifikasi briefing perjalanan melalui WhatsApp.", "Harian (terutama pagi & sore)"),
        ("Operator Dishub", "Menengah (Operasional)", "Memantau matriks CCTV seluruh kota, menganalisis grafik volume kendaraan per menit, mengamati tren kemacetan, dan meninjau keaktifan feed kamera.", "Berkelanjutan / Jam Kerja"),
        ("Petugas Survei / PUPR", "Menengah (Teknis)", "Mengunggah video survei jalan dan log GPX, meninjau hasil deteksi lubang jalan, melihat bukti gambar, dan memperbarui status penanganan lubang jalan.", "Periodik / Mingguan"),
        ("Administrator Sistem", "Tinggi (Sistem / AI)", "Mengonfigurasi ambang batas CCTV, mengelola endpoint feed, melatih ulang model AI, memonitor kinerja container Docker, dan memelihara basis data.", "Sesuai Kebutuhan Maintenance"),
    ]
    user_table = doc.add_table(rows=len(users) + 1, cols=4)
    user_table.cell(0, 0).text = "Kelas Pengguna"
    user_table.cell(0, 1).text = "Tingkat Keahlian"
    user_table.cell(0, 2).text = "Tujuan & Hak Akses"
    user_table.cell(0, 3).text = "Frekuensi Pakai"
    for r_idx, (u_role, u_skill, u_goal, u_freq) in enumerate(users, start=1):
        user_table.cell(r_idx, 0).text = u_role
        user_table.cell(r_idx, 1).text = u_skill
        user_table.cell(r_idx, 2).text = u_goal
        user_table.cell(r_idx, 3).text = u_freq
    format_table(user_table, col_widths=[1.4, 1.2, 2.6, 1.3])

    add_h2(doc, "2.4 Lingkungan Operasi (Operating Environment)")
    add_bullet(doc, "Sistem Operasi Server: Linux Ubuntu 22.04 / 24.04 LTS x86_64.", "Perangkat Lunak Server: ")
    add_bullet(doc, "Runtime & Interpreter: Python 3.12, Node.js 20 LTS, Docker Engine 26+, Docker Compose v2.", "Runtime Server: ")
    add_bullet(doc, "Basis Data: PostgreSQL 16 dengan ekstensi PostGIS 3.4 (Alpine Linux Container).", "Basis Data: ")
    add_bullet(doc, "Akselerator Grafis (Opsional/Disarankan): GPU NVIDIA (CUDA 12+, VRAM minimal 6 GB) untuk inferensi paralel multi-CCTV; didukung fallback CPU inference (Intel Core i5/i7 atau AMD Ryzen).", "Perangkat Keras Pemrosesan: ")
    add_bullet(doc, "Lingkungan Klien (Browser): Google Chrome 120+, Mozilla Firefox 120+, Safari 17+, Microsoft Edge 120+ baik pada resolusi desktop maupun layar perangkat bergerak (smartphone).", "Lingkungan Klien: ")
    add_bullet(doc, "Perangkat Input Survei: Kamera aksi (Action Cam) / Smartphone dengan perekam video 1080p minimal 24 FPS serta GPS receiver berkemampuan perekaman format GPX 1.1 (frekuensi minimal 1 Hz).", "Perangkat Lapangan: ")

    add_h2(doc, "2.5 Batasan Perancangan dan Implementasi (Design and Implementation Constraints)")
    add_p(
        doc,
        "Dalam merancang dan mengimplementasikan sistem LAJU, ditetapkan sejumlah batasan teknis dan arsitektural yang ketat:"
    )
    add_bullet(doc, "Sistem tidak boleh mengekstrak, menyimpan, atau menampilkan data nomor polisi kendaraan (plat nomor) maupun biometrik wajah pengguna jalan demi menjamin kepatuhan penuh terhadap prinsip etika AI dan regulasi perlindungan data pribadi (UU PDP).", "1. Prinsip Privasi Terjaga (Privacy by Design): ")
    add_bullet(doc, "Untuk mencegah memori leak pada proses background worker yang berjalan berhari-hari, nomor pelacak ByteTrack dibatasi siklis dari 1 hingga 999 (Cyclic ID).", "2. Manajemen Memori Tracker: ")
    add_bullet(doc, "Antarmuka dashboard web menerapkan mekanisme Level of Detail (LOD) tag suppression: saat pengguna memperkecil (zoom-out) peta, label teks detail pada kendaraan disembunyikan untuk menjaga FPS browser tetap 60 FPS dan mencegah browser crash pada perangkat berdaya rendah.", "3. Pencegahan Web Crash (LOD Tag Suppression): ")
    add_bullet(doc, "Sistem menerapkan toleransi radius 10 meter (PostGIS ST_DWithin) saat mendaftarkan lubang jalan baru. Jika lubang telah terdeteksi dalam radius tersebut dalam frame-frame berdekatan, sistem hanya memperbarui confidence score tertinggi dan tidak membuat record duplikat.", "4. Deduplikasi Spasial Pothole: ")
    add_bullet(doc, "Karena ketersediaan koneksi CCTV publik dapat mengalami fluktuasi bitrate atau downtime jaringan Diskominfo, worker dilengkapi backoff reconnect eksponensial (5 detik) serta demo mode fallback terisolasi.", "5. Toleransi Kegagalan Stream: ")

    add_h2(doc, "2.6 Asumsi dan Ketergantungan (Assumptions and Dependencies)")
    add_bullet(doc, "URL stream video CCTV Kota Palembang dapat diakses secara publik atau melalui izin jaringan Pemkot tanpa enkripsi DRM tertutup.", "Asumsi 1: ")
    add_bullet(doc, "Kamera CCTV dipasang pada ketinggian dan sudut (angle) yang memadai sehingga marka jalan dan kendaraan terlihat tanpa oklusi pepohonan yang ekstrem.", "Asumsi 2: ")
    add_bullet(doc, "File log GPX yang diunggah memiliki sinkronisasi jam (UTC) yang valid dengan awal rekaman video survei jalan.", "Asumsi 3: ")
    add_bullet(doc, "Layanan eksternal penyedia WhatsApp (seperti WhatsApp Cloud API atau gateway Baileys) beroperasi normal untuk mengirim payload outbox n8n.", "Ketergantungan 1: ")

    doc.add_page_break()


def build_chapter_3(doc):
    """Bab 3: Kebutuhan Antarmuka Eksternal."""
    add_h1(doc, "BAB III: KEBUTUHAN ANTARMUKA EKSTERNAL")

    add_h2(doc, "3.1 Antarmuka Pengguna (User Interfaces)")
    add_p(
        doc,
        "Antarmuka pengguna sistem LAJU dibangun menggunakan pendekatan Single Page Application (SPA) modern yang responsif "
        "berbasis Next.js 16 App Router dan Tailwind CSS. Antarmuka terbagi atas beberapa komponen utama:"
    )
    add_bullet(doc, "Menampilkan metrik agregat kota (total CCTV online, volume kendaraan 5 menit terakhir, persentase ruas jalan padat/macet, dan jumlah lubang jalan aktif), dilengkapi grid mini CCTV interaktif.", "1. Header & Quick Stat Bar: ")
    add_bullet(doc, "Peta OpenStreetMap berbasis Leaflet yang memuat marker interaktif titik CCTV (berwarna hijau untuk LANCAR, kuning untuk SEDANG, oranye untuk PADAT, dan merah untuk MACET), garis koridor rute komuter, serta marker titik jalan berlubang dengan warna sesuai tingkat keparahan (severity).", "2. Interactive Map Panel: ")
    add_bullet(doc, "Modal dialog pop-up yang muncul saat pengguna memilih salah satu kamera, menyajikan streaming MJPEG real-time dengan bounding box kendaraan, indikator laju kendaraan per menit, breakdown tipe kendaraan, serta grafik riwayat volume 20 menit terakhir menggunakan Recharts.", "3. Camera Detail & Analytics Modal: ")
    add_bullet(doc, "Panel formulir untuk memilih titik asal (origin), titik tujuan (destination), jenis perjalanan (commute to work / commute home), dan waktu notifikasi WhatsApp yang diinginkan.", "4. Commuter Route Drawer / Modal: ")
    add_bullet(doc, "Tabel data interaktif yang menampilkan daftar lubang jalan terdeteksi, foto bukti potongan gambar (evidence crop), koordinat GPS lintang/bujur, tingkat keyakinan (confidence), serta tombol aksi pengubahan status (Active, Repaired, Unverified).", "5. Pothole Inspection & Audit Table: ")

    add_h2(doc, "3.2 Antarmuka Perangkat Keras (Hardware Interfaces)")
    add_bullet(doc, "Kamera IP publik dengan keluaran HLS (.m3u8) atau RTSP berkemampuan resolusi minimal 720p (1280x720) atau 1080p pada frekuensi 15-30 FPS.", "1. Kamera CCTV Lalu Lintas: ")
    add_bullet(doc, "Server pemrosesan dengan CPU x86_64 multi-core (minimal 4 core / 8 thread), RAM minimal 8 GB (disarankan 16 GB), dan akselerator GPU NVIDIA (VRAM minimal 6 GB) dengan antarmuka PCIe Gen 3/4.", "2. Server Komputasi AI: ")
    add_bullet(doc, "Perangkat kamera aksi (GoPro / Akaso / Smartphone) dengan mounting stabilizer pada kendaraan survei untuk merekam video jalan berformat MP4/H.264.", "3. Kamera Survei Lapangan: ")
    add_bullet(doc, "Modul penerima sinyal satelit GPS/GLONASS dengan akurasi horizontal < 5 meter dan frekuensi perekaman data minimal 1 Hz (1 data titik per detik).", "4. GPS Data Logger: ")

    add_h2(doc, "3.3 Antarmuka Perangkat Lunak (Software Interfaces)")
    add_bullet(doc, "FastAPI versi 0.110+ yang menyediakan endpoint REST API berbasis standar OpenAPI 3.1 dan dokumentasi interaktif Swagger UI.", "1. Backend Web Framework: ")
    add_bullet(doc, "PostgreSQL 16 dengan ekstensi PostGIS versi 3.4 untuk penyimpanan data relasional dan eksekusi fungsi spasial geospasial.", "2. Basis Data Spasial: ")
    add_bullet(doc, "SQLAlchemy versi 2.0 ORM dengan GeoAlchemy2 untuk pemetaan objek basis data dan manajemen transaksi terisolasi.", "3. Object Relational Mapper (ORM): ")
    add_bullet(doc, "Alembic untuk versioning, autogenerate, dan migrasi skema basis data secara deterministik.", "4. Skema Migrasi: ")
    add_bullet(doc, "Ultralytics YOLOv11 (PyTorch 2.2+) untuk inferensi neural network deteksi kendaraan dan deteksi jalan berlubang.", "5. Vision Deep Learning Engine: ")
    add_bullet(doc, "ByteTrack untuk tracking multi-objek berbasis filtering kalman dan asosiasi deteksi dua tahap.", "6. Multi-Object Tracker: ")
    add_bullet(doc, "Next.js 16 (React 19) dengan React-Leaflet dan Recharts untuk rendering antarmuka pengguna pada sisi klien.", "7. Frontend Framework: ")
    add_bullet(doc, "n8n Workflow Automation Engine yang berjalan sebagai microservice untuk penjadwalan cron dan integrasi payload WhatsApp.", "8. Workflow Automation: ")

    add_h2(doc, "3.4 Antarmuka Komunikasi (Communications Interfaces)")
    add_bullet(doc, "Protokol HTTP/1.1 dan HTTP/2 melalui koneksi aman TLS 1.3 (HTTPS) untuk seluruh pertukaran payload JSON antara frontend dan backend REST API.", "1. RESTful API Protocol: ")
    add_bullet(doc, "Protokol HTTP Live Streaming (RFC 8216) untuk penerimaan stream video CCTV dari server penyedia Diskominfo.", "2. HLS Protocol: ")
    add_bullet(doc, "Protokol streaming HTTP Multipart/x-mixed-replace (MJPEG) untuk mendistribusikan frame hasil anotasi AI dari FastAPI ke tag <img> pada peramban web klien secara real-time tanpa memerlukan plugin pihak ketiga.", "3. MJPEG Video Stream: ")
    add_bullet(doc, "Standar GeoJSON (RFC 7946) untuk merepresentasikan fitur-fitur geografis, koordinat linestring rute, dan marker titik kamera dalam pertukaran data antarmuka.", "4. Geospasial GeoJSON: ")
    add_bullet(doc, "Standar GPX 1.1 (GPS Exchange Format) berbasis XML untuk pengunggahan rute koordinat GPS dari perangkat mobile surveyor.", "5. Pertukaran Data GPX: ")

    doc.add_page_break()


def build_chapter_4(doc):
    """Bab 4: Kebutuhan Fungsional."""
    add_h1(doc, "BAB IV: KEBUTUHAN FUNGSIONAL SISTEM")

    add_p(
        doc,
        "Kebutuhan fungsional mendefinisikan secara tepat perilaku, masukan, proses kalkulasi, dan keluaran yang harus dihasilkan oleh sistem LAJU. "
        "Setiap kebutuhan fungsional diberikan kode identifikasi unik dengan format FR-[MODUL]-[NOMOR] untuk menjamin ketertelusuran kebutuhan."
    )

    add_h2(doc, "4.1 Matriks Kebutuhan Fungsional")
    req_rows = [
        # CCTV Module
        ("FR-CAM-001", "CCTV Management", "Pendaftaran & Konfigurasi Kamera CCTV"),
        ("FR-CAM-002", "CCTV Management", "Pengambilan Stream HLS/RTSP & Frame Decoding"),
        ("FR-CAM-003", "CCTV Management", "Auto-Reconnect & Fallback Ketiadaan Sinyal"),
        ("FR-CAM-004", "CCTV Management", "Distribusi Stream Video MJPEG Teranotasi"),
        ("FR-CAM-005", "CCTV Management", "Isolasi Simulasi & Demo Mode"),
        # Traffic Vision Module
        ("FR-TRF-001", "Traffic Vision", "Deteksi Objek Kendaraan Multi-Kelas (YOLOv11)"),
        ("FR-TRF-002", "Traffic Vision", "Pelacakan Objek Kontinu (ByteTrack)"),
        ("FR-TRF-003", "Traffic Vision", "Penghitungan Kendaraan Melintasi Garis Virtual"),
        ("FR-TRF-004", "Traffic Vision", "Pengelolaan ID Siklis & LOD Tag Suppression"),
        ("FR-TRF-005", "Traffic Vision", "Klasifikasi Kepadatan Deterministik 4 Tingkat"),
        ("FR-TRF-006", "Traffic Vision", "Perhitungan Tren Laju Volume Kendaraan"),
        ("FR-TRF-007", "Traffic Vision", "Agregasi & Persistensi Snapshot Berkala"),
        # Pothole Module
        ("FR-PTH-001", "Pothole Inspection", "Pengunggahan Video Survei & Parsing GPX"),
        ("FR-PTH-002", "Pothole Inspection", "Interpolasi Temporal Linear Koordinat GPS"),
        ("FR-PTH-003", "Pothole Inspection", "Deteksi Kerusakan Jalan Berbasis Model YOLOv11"),
        ("FR-PTH-004", "Pothole Inspection", "Ekstraksi Potongan Gambar Bukti (Evidence Crop)"),
        ("FR-PTH-005", "Pothole Inspection", "Deduplikasi Spasial Kerusakan Jalan (Radius 10m)"),
        ("FR-PTH-006", "Pothole Inspection", "Manajemen Status Penanganan Lubang Jalan"),
        # Route & Commute Module
        ("FR-RTE-001", "Route Management", "Pendaftaran & Konfigurasi Rute Komuter"),
        ("FR-RTE-002", "Route Management", "Pembuatan Buffer Spasial Koridor Jalan"),
        ("FR-RTE-003", "Route Management", "Asosiasi Kamera CCTV Sepanjang Rute"),
        ("FR-RTE-004", "Route Management", "Identifikasi Ancaman Lubang Jalan pada Rute"),
        ("FR-RTE-005", "Route Management", "Penyusunan Status Terpadu Koridor Perjalanan"),
        # Briefing & Notification Module
        ("FR-BRF-001", "Commuter Briefing", "Penjadwalan Otomatis Pengecekan Rute (Cron n8n)"),
        ("FR-BRF-002", "Commuter Briefing", "Penyusunan Kalimat Briefing Deterministik"),
        ("FR-BRF-003", "Commuter Briefing", "Pembentukan Payload WhatsApp Outbox"),
        ("FR-BRF-004", "Commuter Briefing", "Pencatatan Log Status Pengiriman Pesan"),
        # Web Dashboard Module
        ("FR-DSH-001", "Web GIS Dashboard", "Visualisasi Peta Spasial Terpadu (Leaflet Map)"),
        ("FR-DSH-002", "Web GIS Dashboard", "Monitoring Grid CCTV & Analitik Historis"),
    ]
    req_summary_table = doc.add_table(rows=len(req_rows) + 1, cols=3)
    req_summary_table.cell(0, 0).text = "Kode Kebutuhan"
    req_summary_table.cell(0, 1).text = "Modul Sistem"
    req_summary_table.cell(0, 2).text = "Nama Kebutuhan Fungsional"
    for r_idx, (r_code, r_mod, r_title) in enumerate(req_rows, start=1):
        req_summary_table.cell(r_idx, 0).text = r_code
        req_summary_table.cell(r_idx, 1).text = r_mod
        req_summary_table.cell(r_idx, 2).text = r_title
    format_table(req_summary_table, col_widths=[1.5, 1.8, 3.2])

    add_h2(doc, "4.2 Spesifikasi Fungsional: Modul CCTV & Streaming (FR-CAM)")
    
    fr_cam_details = [
        ("FR-CAM-001: Pendaftaran & Konfigurasi Kamera CCTV",
         "Sistem harus memungkinkan pencatatan metadata kamera pemantau yang mencakup nama persimpangan, nama ruas jalan, koordinat geografis (latitude, longitude), URL stream sumber (HLS .m3u8 atau RTSP), tipe stream, koordinat garis hitung virtual (counting line), serta nilai ambang batas kepadatan (low, medium, high threshold).",
         "Payload data kamera (nama, koordinat, stream URL, threshold).",
         "Sistem memvalidasi skema data, menyimpan ke tabel cameras, serta menghasilkan entitas geometri spasial PostGIS POINT(lon, lat, 4326).",
         "Objek kamera tersimpan dengan ID unik dan terpetakan di Web GIS.",
         "Data kamera tersimpan sukses dan dapat diakses melalui endpoint GET /api/cameras."),
        
        ("FR-CAM-002: Pengambilan Stream HLS/RTSP & Frame Decoding",
         "Sistem harus mampu membuka koneksi aliran video dari penyedia feed Diskominfo Palembang melalui pustaka OpenCV VideoCapture atau FFmpeg, mendekode paket video H.264, dan mengekstrak frame gambar berkala untuk diproses oleh modul visi komputer.",
         "URL HLS (.m3u8) atau RTSP yang aktif.",
         "Sistem melakukan koneksi socket, membaca transport stream, mendekode frame gambar ke array matriks NumPy BGR.",
         "Aliran frame video terurai siap diinferensi oleh model AI.",
         "Frame berhasil diambil secara kontinu tanpa memicu error buffer overflow."),
        
        ("FR-CAM-003: Auto-Reconnect & Fallback Ketiadaan Sinyal",
         "Sistem harus memiliki mekanisme pemulihan otomatis jika koneksi CCTV terputus secara mendadak akibat lonjakan trafik jaringan atau pemeliharaan server Diskominfo. Sistem mencoba menghubungkan ulang secara periodik dengan jeda 5 detik tanpa membuat seluruh aplikasi berhenti (crash).",
         "Status kegagalan pembacaan frame (read() returning False).",
         "Sistem mencatat log peringatan, melepaskan objek VideoCapture lama, menunggu interval backoff (5 detik), dan mencoba inisialisasi koneksi ulang. Jika kamera ditandai is_demo=True, sistem beralih ke video sampel lokal.",
         "Koneksi pulih otomatis saat feed CCTV kembali online.",
         "Aplikasi tetap berjalan normal (zero-downtime) saat satu atau lebih feed CCTV offline."),

        ("FR-CAM-004: Distribusi Stream Video MJPEG Teranotasi",
         "Sistem harus menyediakan endpoint HTTP streaming berbasis standar MJPEG (Content-Type: multipart/x-mixed-replace; boundary=frame) yang memancarkan frame video teranotasi bounding box kendaraan dan status kepadatan ke antarmuka web pengguna.",
         "Permintaan HTTP GET dari klien ke /api/cameras/{id}/stream.",
         "FastAPI StreamingResponse mengirimkan frame JPEG terkompresi secara berkelanjutan kepada klien.",
         "Streaming visual real-time dapat ditampilkan langsung pada tag <img> di peramban web.",
         "Tampilan video live tampil mulus di peramban pengguna tanpa keterlambatan berlebih."),

        ("FR-CAM-005: Isolasi Simulasi & Demo Mode",
         "Sistem harus mendukung mode demonstrasi (demo mode) yang sepenuhnya terisolasi dari kegagalan jaringan publik. Mode demo menggunakan video lokal Kota Palembang untuk menyajikan data lalu lintas deterministik saat pengujian offline atau presentasi sidang.",
         "Flag konfigurasi DEMO_MODE=True atau parameter kamera is_demo=True.",
         "Sistem membaca file video lokal pada direktori vision/samples/, memutar secara berulang (looping), dan menghasilkan metrik yang valid.",
         "Data analitik dan visualisasi berjalan normal tanpa memerlukan akses internet aktif.",
         "Pengujian sistem dapat dilakukan dalam kondisi terisolasi tanpa koneksi jaringan eksternal."),
    ]

    for title, desc, inp, proc, outp, crit in fr_cam_details:
        add_h3(doc, title)
        add_p(doc, desc)
        t_spec = doc.add_table(rows=4, cols=2)
        t_spec.cell(0, 0).text = "Masukan (Input)"
        t_spec.cell(0, 1).text = inp
        t_spec.cell(1, 0).text = "Proses Komputasi"
        t_spec.cell(1, 1).text = proc
        t_spec.cell(2, 0).text = "Keluaran (Output)"
        t_spec.cell(2, 1).text = outp
        t_spec.cell(3, 0).text = "Kriteria Penerimaan"
        t_spec.cell(3, 1).text = crit
        format_table(t_spec, col_widths=[1.8, 4.7])

    add_h2(doc, "4.3 Spesifikasi Fungsional: Modul Computer Vision Lalu Lintas (FR-TRF)")

    # Embed traffic detection image
    add_figure(
        doc,
        IMG_TRAFFIC_DETECTION,
        "Gambar 4.1: Visualisasi Hasil Inferensi Deteksi Kendaraan YOLOv11 dan ByteTrack dengan Virtual Counting Line",
        width=Inches(5.0)
    )

    fr_trf_details = [
        ("FR-TRF-001: Deteksi Objek Kendaraan Multi-Kelas (YOLOv11)",
         "Sistem harus melakukan inferensi visi komputer berbasis arsitektur YOLOv11 pada setiap frame video yang diambil untuk mendeteksi 4 kelas kendaraan: sepeda motor (motorcycle), mobil penumpang (car), bus, dan truk.",
         "Frame video matriks BGR dari CCTV.",
         "Frame di-resize ke resolusi input model (default 640x640), dinormalisasi, dan diumpankan ke model YOLOv11. Sistem menghasilkan tensor bounding box [x1, y1, x2, y2], confidence score, dan class ID.",
         "Daftar bounding box kendaraan yang terdeteksi dengan confidence >= 0.25.",
         "Akurasi deteksi mampu mengenali kendaraan dengan orientasi beragam di jalan raya Palembang."),

        ("FR-TRF-002: Pelacakan Objek Kontinu (ByteTrack)",
         "Sistem harus mengasosiasikan deteksi antarkerangka waktu (frame-to-frame) menggunakan algoritma ByteTrack untuk mempertahankan identitas (Track ID) dari setiap kendaraan yang melintas, bahkan saat kendaraan sempat terhalang kendaraan lain (oklusi parsial).",
         "Daftar bounding box dan confidence score dari YOLOv11 pada frame t.",
         "Algoritma ByteTrack memprediksi posisi objek menggunakan Kalman Filter, menghitung intersection over union (IoU) dengan deteksi baru, dan mencocokkan deteksi prioritas tinggi dan rendah.",
         "Objek terdeteksi dengan ID pelacak yang konsisten selama melintasi area pantau kamera.",
         "ID kendaraan tidak berganti secara acak saat kendaraan bergerak lurus di jalan."),

        ("FR-TRF-003: Penghitungan Kendaraan Melintasi Garis Virtual",
         "Sistem harus mendeteksi momen ketika titik tengah (centroid) bagian bawah kendaraan melintasi garis hitung virtual (Virtual Counting Line) dua titik [(x1,y1), (x2,y2)] yang telah dikonfigurasi, serta menentukan arah pergerakan kendaraan (IN atau OUT).",
         "Koordinat lintasan titik tengah kendaraan antara frame t-1 dan frame t terhadap garis virtual.",
         "Sistem menghitung perkalian silang vektor (cross product) lintasan gerak terhadap garis hitung. Jika terjadi perpotongan garis (line intersection), counter kendaraan bertambah dan event dicatat ke tabel vehicle_events.",
         "Peningkatan nilai counter volume kendaraan berdasarkan tipe kelas yang melintas.",
         "Kendaraan hanya dihitung tepat 1 kali saat melintasi garis, tidak dihitung ganda."),

        ("FR-TRF-004: Pengelolaan ID Siklis & LOD Tag Suppression",
         "Sistem harus mencegah terjadinya memory leak dan lonjakan ukuran memori pada server dengan mendaur ulang ID pelacak dalam rentang siklis 1 sampai 999. Selain itu, pada antarmuka web klien, sistem menerapkan Level of Detail (LOD) tag suppression untuk menonaktifkan rendering teks tag deteksi saat peta dizoom-out.",
         "ID pelacak ByteTrack dan tingkat pembesaran (zoom level) peta web.",
         "Worker mereset counter ID ke angka 1 setelah melampaui 999. Frontend memeriksa zoom level peta; jika level < 16, tag label disembunyikan dan hanya menampilkan garis hitung atau titik.",
         "Penggunaan memori server konstan dan konsumsi RAM peramban klien tetap stabil (< 150 MB).",
         "Proses worker mampu berjalan > 72 jam tanpa crash out-of-memory."),

        ("FR-TRF-005: Klasifikasi Kepadatan Deterministik 4 Tingkat",
         "Sistem harus mengklasifikasikan status kepadatan lalu lintas secara deterministik dan transparan ke dalam 4 kategori berdasarkan volume rolling 5 menit terakhir terhadap ambang batas kamera: LANCAR (volume < low), SEDANG (low <= volume < medium), PADAT (medium <= volume < high), dan MACET (volume >= high).",
         "Total volume kendaraan pada jendela waktu 5 menit terakhir dan nilai batas [low, medium, high].",
         "Fungsi classify_traffic(volume, low, medium, high) mengevaluasi kondisi bertingkat dan menghitung skor kejenuhan (congestion_score = min(100, volume / high * 100)).",
         "Status kepadatan (TrafficStatus: LANCAR, SEDANG, PADAT, MACET) dan skor kemacetan 0 - 100%.",
         "Klasifikasi menghasilkan nilai konsisten sesuai aturan ambang batas matematis."),

        ("FR-TRF-006: Perhitungan Tren Laju Volume Kendaraan",
         "Sistem harus membandingkan volume kendaraan 5 menit saat ini dengan volume kendaraan pada interval 5 menit sebelumnya (5-10 menit lalu) dengan batas toleransi perubahan 10% (tolerance = 0.10) untuk menentukan tren lalu lintas: MENINGKAT, MENURUN, atau STABIL.",
         "Volume 5 menit saat ini (current) dan volume 5 menit sebelumnya (previous).",
         "Sistem menghitung persentase perubahan: change = (current - previous) / previous. Jika change >= +0.10 status MENINGKAT, jika change <= -0.10 status MENURUN, selain itu STABIL.",
         "String status tren laju kendaraan (MENINGKAT, MENURUN, STABIL).",
         "Tren lalu lintas memberikan informasi prediktif terhadap potensi timbulnya kemacetan."),

        ("FR-TRF-007: Agregasi & Persistensi Snapshot Berkala",
         "Sistem worker harus secara berkala (setiap 60 detik) menyimpan rekapitulasi volume kendaraan, breakdown kelas kendaraan, dan status kepadatan ke dalam tabel traffic_snapshots di basis data PostgreSQL.",
         "Counter agregat kendaraan dari worker visi per interval 1 menit.",
         "Sistem menyusun entitas TrafficSnapshot dan mengeksekusi perintah SQL INSERT melalui SQLAlchemy ORM.",
         "Catatan snapshot baru tersimpan di basis data dengan timestamp UTC terindeks.",
         "Data historis lalu lintas tersimpan rapi dan dapat ditarik untuk visualisasi tren."),
    ]

    for title, desc, inp, proc, outp, crit in fr_trf_details:
        add_h3(doc, title)
        add_p(doc, desc)
        t_spec = doc.add_table(rows=4, cols=2)
        t_spec.cell(0, 0).text = "Masukan (Input)"
        t_spec.cell(0, 1).text = inp
        t_spec.cell(1, 0).text = "Proses Komputasi"
        t_spec.cell(1, 1).text = proc
        t_spec.cell(2, 0).text = "Keluaran (Output)"
        t_spec.cell(2, 1).text = outp
        t_spec.cell(3, 0).text = "Kriteria Penerimaan"
        t_spec.cell(3, 1).text = crit
        format_table(t_spec, col_widths=[1.8, 4.7])

    add_h2(doc, "4.4 Spesifikasi Fungsional: Modul Inspeksi Pothole & Geotagging GPX (FR-PTH)")

    # Embed pothole evidence image
    add_figure(
        doc,
        IMG_POTHOLE_EVIDENCE,
        "Gambar 4.2: Sampel Ekstraksi Potongan Citra Bukti Kerusakan Jalan (Pothole Evidence Crop)",
        width=Inches(2.5)
    )

    fr_pth_details = [
        ("FR-PTH-001: Pengunggahan Video Survei & Parsing GPX",
         "Sistem harus menerima masukan berupa berkas rekaman video jalan (.mp4) dan berkas log GPS berformat .gpx yang dihasilkan dari survei lapangan kendaraan roda dua atau roda empat.",
         "File video MP4 dan file GPS GPX berkas XML bertimestamp.",
         "Sistem membaca metadata video (FPS, total frame) dan mem-parsing seluruh track point GPX (<trkpt lat lon><ele><time>) menjadi daftar titik berurutan waktu UTC.",
         "Daftar koordinat GPS yang siap disinkronkan dengan frame video.",
         "File GPX berhasil diparsing tanpa error struktur XML."),

        ("FR-PTH-002: Interpolasi Temporal Linear Koordinat GPS",
         "Sistem harus mengaitkan setiap frame video dengan posisi lintang dan bujur yang presisi menggunakan metode interpolasi temporal linear antara dua titik koordinat GPX yang mengapit timestamp frame tersebut.",
         "Nomor frame video, FPS video, dan urutan titik waktu GPS GPX.",
         "Timestamp frame dihitung: t_frame = t_start + (frame_idx / fps). Sistem mencari titik GPX sebelum (p1) dan sesudah (p2). Posisi dihitung secara linear: lat = lat1 + factor * (lat2 - lat1), di mana factor = (t_frame - t1) / (t2 - t1).",
         "Koordinat geografis latitude dan longitude presisi untuk setiap frame video.",
         "Setiap deteksi memiliki koordinat spasial akurat yang bersesuaian dengan lintasan survei."),

        ("FR-PTH-003: Deteksi Kerusakan Jalan Berbasis Model YOLOv11",
         "Sistem harus menjalankan model deep learning YOLOv11 yang telah dilatih khusus pada dataset kerusakan jalan (RDD2022 / Pothole dataset) untuk mengenali objek lubang jalan dengan batas ambang confidence minimal 0.40.",
         "Frame video jalan dari rekaman survei bergerak.",
         "Inferensi model mendeteksi area lubang, memfilter bounding box di bawah threshold confidence, serta menetapkan derajat keparahan (severity: low, medium, high, unknown).",
         "Bounding box lubang jalan, nilai keyakinan (confidence), dan kelas kerusakan.",
         "Model mendeteksi lubang permukaan jalan secara konsisten pada pencahayaan siang hari."),

        ("FR-PTH-004: Ekstraksi Potongan Gambar Bukti (Evidence Crop)",
         "Sistem harus memotong (crop) area bounding box kerusakan jalan dari frame video asli beresolusi penuh, menambahkan padding secukupnya, dan menyimpannya sebagai file citra JPEG pada direktori vision/evidence/.",
         "Frame video asli dan koordinat bounding box [x1, y1, x2, y2].",
         "Pustaka OpenCV mengekstrak potongan gambar (crop) dan menyimpannya dengan nama berkas unik berbasis timestamp ISO (pothole-YYYYMMDDTHHMMSS.jpg).",
         "Berkas citra bukti lubang jalan berukuran ringan (< 50 KB) dan jalur relatif penyimpanannya.",
         "Bukti gambar tersimpan rapi dan dapat diakses melalui URL web dashboard untuk keperluan audit."),

        ("FR-PTH-005: Deduplikasi Spasial Kerusakan Jalan (Radius 10m)",
         "Sistem harus mencegah pendaftaran ganda atas lubang jalan yang sama yang terdeteksi pada beberapa frame berturut-turut atau dari survei berulang menggunakan query spasial PostGIS ST_DWithin dalam radius toleransi 10 meter.",
         "Koordinat GPS baru hasil interpolasi dan bounding box deteksi.",
         "Query spasial: SELECT id, confidence FROM potholes WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, 10.0). Jika ditemukan, sistem hanya memperbarui data jika confidence baru lebih tinggi. Jika tidak ditemukan, sistem memasukkan record baru.",
         "Record basis data pothole yang bersih dari duplikasi spasial berlebih.",
         "Tidak terjadi penumpukan marker lubang jalan pada titik yang sama di peta."),

        ("FR-PTH-006: Manajemen Status Penanganan Lubang Jalan",
         "Sistem harus menyediakan mekanisme bagi petugas pemeliharaan jalan (Dinas PUPR) untuk mengubah status verifikasi dan perbaikan lubang jalan (UNVERIFIED -> ACTIVE -> REPAIRED).",
         "Permintaan HTTP PATCH ke endpoint /api/potholes/{id}/status dengan payload status baru.",
         "Sistem memvalidasi status baru dan memperbarui record pada tabel potholes.",
         "Status lubang jalan terbaharui di basis data dan terefleksi pada warna penanda di peta.",
         "Lubang dengan status REPAIRED tidak lagi dihitung sebagai ancaman bahaya rute."),
    ]

    for title, desc, inp, proc, outp, crit in fr_pth_details:
        add_h3(doc, title)
        add_p(doc, desc)
        t_spec = doc.add_table(rows=4, cols=2)
        t_spec.cell(0, 0).text = "Masukan (Input)"
        t_spec.cell(0, 1).text = inp
        t_spec.cell(1, 0).text = "Proses Komputasi"
        t_spec.cell(1, 1).text = proc
        t_spec.cell(2, 0).text = "Keluaran (Output)"
        t_spec.cell(2, 1).text = outp
        t_spec.cell(3, 0).text = "Kriteria Penerimaan"
        t_spec.cell(3, 1).text = crit
        format_table(t_spec, col_widths=[1.8, 4.7])

    add_h2(doc, "4.5 Spesifikasi Fungsional: Modul Rute & Briefing Komuter (FR-RTE & FR-BRF)")

    fr_commute_details = [
        ("FR-RTE-001: Pendaftaran & Konfigurasi Rute Komuter",
         "Sistem harus memungkinkan pengguna komuter mendaftarkan rute perjalanan harian dengan menentukan titik asal, titik tujuan, tipe perjalanan (commute_to_work, commute_home, custom), koordinat polylines rute (geometry LINESTRING), dan jam pengingat notifikasi.",
         "Payload pendaftaran rute (nama, user_id, start/dest lat-lon, path JSON, notification_time).",
         "Sistem memvalidasi data dan menyimpan geometri lintasan rute dalam sistem koordinat spasial SRID 4326.",
         "Entitas rute komuter tersimpan di tabel routes.",
         "Rute berhasil tersimpan dan garis perjalanan tampil pada peta dashboard."),

        ("FR-RTE-002: Pembuatan Buffer Spasial Koridor Jalan",
         "Sistem harus menghitung zona pengaruh (buffer zone) di sekitar garis geometri rute perjalanan komuter dengan radius koridor sebesar 150 - 300 meter untuk mengidentifikasi objek-objek lalu lintas yang relevan.",
         "Geometri garis rute (LINESTRING) dari tabel routes.",
         "Fungsi PostGIS ST_DWithin(geom, route_geom, distance) dieksekusi untuk mencari titik kamera dan lubang jalan yang bersinggungan dengan koridor perjalanan.",
         "Daftar ID kamera CCTV dan ID pothole yang berada di dalam koridor rute.",
         "Perhitungan spasial dilakukan efisien menggunakan indeks spasial R-Tree PostGIS."),

        ("FR-RTE-003: Penyusunan Status Terpadu Koridor Perjalanan",
         "Sistem harus mengagregasikan status kemacetan dari seluruh kamera CCTV yang terletak pada koridor rute pengguna untuk menentukan status rute secara keseluruhan (Overall Route Status) berdasarkan status terburuk (worst-case priority: MACET > PADAT > SEDANG > LANCAR).",
         "Daftar status kemacetan dari kamera-kamera di sepanjang rute.",
         "Sistem mengevaluasi status kamera dengan pembobotan STATUS_WEIGHT dan menetapkan status akhir rute beserta ringkasan titik hambatan terberat.",
         "Status kondisi rute terpadu (Overall Status, daftar kamera terpadat, waktu tempuh perkiraan).",
         "Informasi status rute mencerminkan kondisi lapangan teraktual secara akurat."),

        ("FR-BRF-001: Penjadwalan Otomatis Pengecekan Rute (Cron n8n)",
         "Sistem alur kerja n8n harus menjalankan trigger cron setiap menit (Every Minute) untuk memeriksa daftar rute pengguna aktif yang waktu notifikasinya jatuh pada waktu saat ini (Asia/Jakarta). Jika pengguna tidak mengatur jam spesifik, sistem menerapkan jadwal default pukul 06.45 WIB untuk perjalanan berangkat kerja dan 16.45 WIB untuk perjalanan pulang kerja.",
         "Waktu sistem saat ini (jam dan menit waktu lokal WIB).",
         "Workflow n8n memanggil endpoint GET /api/routes, memfilter rute yang siap kirim (Filter Routes Due Now), dan memanggil endpoint GET /api/routes/{id}/briefing.",
         "Daftar briefing rute yang siap diproses untuk dikirimkan ke pengguna.",
         "Trigger berjalan tepat waktu setiap menit tanpa melewatkan jadwal notifikasi."),

        ("FR-BRF-002: Pembentukan Payload WhatsApp Outbox",
         "Sistem harus menyusun pesan teks laporan ringkas perjalanan dalam format pesan WhatsApp yang rapi, informatif, dan mudah dibaca (memuat status rute, peringatan ruas jalan macet, jumlah lubang jalan aktif pada rute, serta rekomendasi waktu keberangkatan). Payload disiapkan ke format antrean outbox.",
         "Data ringkasan briefing rute dari backend FastAPI.",
         "Sistem merangkai pesan teks berformat Markdown WhatsApp (bold dengan asterisk, bullet list, emoji indikator) dan membentuk struktur data Outbox Schema.",
         "Payload JSON pesan outbox dengan atribut recipient_phone, message, delivery_status, dan ready_to_send.",
         "Pesan teks tersusun komunikatif dan siap diteruskan oleh provider gateway WhatsApp."),
    ]

    for title, desc, inp, proc, outp, crit in fr_commute_details:
        add_h3(doc, title)
        add_p(doc, desc)
        t_spec = doc.add_table(rows=4, cols=2)
        t_spec.cell(0, 0).text = "Masukan (Input)"
        t_spec.cell(0, 1).text = inp
        t_spec.cell(1, 0).text = "Proses Komputasi"
        t_spec.cell(1, 1).text = proc
        t_spec.cell(2, 0).text = "Keluaran (Output)"
        t_spec.cell(2, 1).text = outp
        t_spec.cell(3, 0).text = "Kriteria Penerimaan"
        t_spec.cell(3, 1).text = crit
        format_table(t_spec, col_widths=[1.8, 4.7])

    add_h2(doc, "4.6 Spesifikasi Fungsional: Modul Web GIS Dashboard (FR-DSH)")

    fr_dsh_details = [
        ("FR-DSH-001: Visualisasi Peta Spasial Terpadu (Leaflet Map)",
         "Sistem harus menampilkan peta spasial wilayah Kota Palembang secara interaktif berbasis Leaflet yang memvisualisasikan layer titik kamera CCTV dengan ikon status kemacetan berwarna dinamis, layer garis rute perjalanan, dan layer titik kerusakan jalan berlubang.",
         "Data GeoJSON dari endpoint API /api/cameras, /api/routes, dan /api/potholes.",
         "Frontend Next.js merender komponen Leaflet TileLayer (OpenStreetMap) dan menambahkan Marker serta Polyline interaktif dengan event handler interaksi klik.",
         "Peta digital interaktif dengan kemampuan pan, zoom, dan filter layer.",
         "Peta tampil responsif dan mulus pada berbagai resolusi layar."),

        ("FR-DSH-002: Monitoring Grid CCTV & Analitik Historis",
         "Sistem harus menyediakan antarmuka grid kartu kamera CCTV yang menampilkan nama ruas jalan, status kemacetan saat ini, jumlah volume kendaraan rolling 5 menit, tren laju, serta tombol pembuka modal live streaming dan visualisasi grafik historis Recharts.",
         "Daftar metrik kamera dari endpoint GET /api/traffic/current.",
         "Frontend merender kartu kamera responsif, menghitung badge status warna, dan merender grafik garis volume kendaraan 20 menit terakhir.",
         "Grid pemantauan CCTV yang informatif dan grafik analitik interaktif.",
         "Data metrik terbaharui secara otomatis setiap interval polling (default 15-30 detik)."),
    ]

    for title, desc, inp, proc, outp, crit in fr_dsh_details:
        add_h3(doc, title)
        add_p(doc, desc)
        t_spec = doc.add_table(rows=4, cols=2)
        t_spec.cell(0, 0).text = "Masukan (Input)"
        t_spec.cell(0, 1).text = inp
        t_spec.cell(1, 0).text = "Proses Komputasi"
        t_spec.cell(1, 1).text = proc
        t_spec.cell(2, 0).text = "Keluaran (Output)"
        t_spec.cell(2, 1).text = outp
        t_spec.cell(3, 0).text = "Kriteria Penerimaan"
        t_spec.cell(3, 1).text = crit
        format_table(t_spec, col_widths=[1.8, 4.7])

    doc.add_page_break()


def build_chapter_5(doc):
    """Bab 5: Kebutuhan Non-Fungsional."""
    add_h1(doc, "BAB V: KEBUTUHAN NON-FUNGSIONAL SISTEM")

    add_p(
        doc,
        "Kebutuhan non-fungsional (Non-Functional Requirements) menetapkan batasan kualitas teknis, batasan operasional, "
        "aspek kinerja, keandalan, keamanan privasi, kemudahan penggunaan, dan skalabilitas arsitektur yang harus dipenuhi oleh sistem LAJU."
    )

    add_h2(doc, "5.1 Kebutuhan Kinerja (Performance Requirements - NFR-PERF)")
    perfs = [
        ("NFR-PERF-001", "Kecepatan Inferensi Vision (Inference Latency)",
         "Model YOLOv11 pada server berafiliasi GPU harus mampu memproses inferensi deteksi dalam waktu <= 60 ms per frame (setara >= 16 FPS). Pada lingkungan CPU murni, latensi inferensi frame tidak boleh melebihi 150 ms per frame."),
        ("NFR-PERF-002", "Waktu Respons Backend API (API Latency)",
         "Endpoint REST API FastAPI untuk penyajian data analitik lalu lintas (/api/traffic/current dan /api/cameras) harus menghasilkan respons JSON dalam waktu <= 200 milidetik pada beban 50 concurrent requests."),
        ("NFR-PERF-003", "Kecepatan Query Spasial PostGIS",
         "Pencarian buffer spasial rute dan deduplikasi lubang jalan (ST_DWithin) harus dieksekusi dalam waktu <= 50 milidetik dengan memanfaatkan Spatial Indexing berbasis GiST / R-Tree."),
        ("NFR-PERF-004", "Efisiensi Rendering Antarmuka (UI Frame Rate)",
         "Antarmuka peta Leaflet dan dashboard Next.js harus mempertahankan kecepatan rendering minimal 45 - 60 FPS pada peramban klien tanpa terjadi lag atau freezing saat memuat ratusan penanda objek."),
    ]
    perf_table = doc.add_table(rows=len(perfs) + 1, cols=3)
    perf_table.cell(0, 0).text = "Kode Kebutuhan"
    perf_table.cell(0, 1).text = "Parameter Kinerja"
    perf_table.cell(0, 2).text = "Spesifikasi Ambang Batas Teknis"
    for r_idx, (p_code, p_name, p_spec) in enumerate(perfs, start=1):
        perf_table.cell(r_idx, 0).text = p_code
        perf_table.cell(r_idx, 1).text = p_name
        perf_table.cell(r_idx, 2).text = p_spec
    format_table(perf_table, col_widths=[1.5, 2.0, 3.2])

    add_h2(doc, "5.2 Kebutuhan Keandalan & Ketersediaan (Reliability & Availability - NFR-REL)")
    rels = [
        ("NFR-REL-001", "Ketersediaan Sistem (System Availability)",
         "Sistem backend API dan layanan web dashboard harus memiliki target ketersediaan (uptime SLA) minimal 99.5% dalam kondisi operasional normal 24/7."),
        ("NFR-REL-002", "Toleransi Pemutusan Koneksi CCTV (Stream Fault Tolerance)",
         "Jika stream feed CCTV mengalami timeout atau pemutusan jaringan oleh penyedia eksternal, worker tidak boleh terminated (crash). Sistem harus melakukan reconnection retry setiap 5 detik secara berkelanjutan."),
        ("NFR-REL-003", "Konsistensi Transaksi Basis Data (ACID Compliance)",
         "Seluruh transaksi penyimpanan snapshot lalu lintas, pencatatan event kendaraan, dan perubahan status lubang jalan harus mematuhi prinsip ACID untuk mencegah inkonsistensi data."),
    ]
    rel_table = doc.add_table(rows=len(rels) + 1, cols=3)
    rel_table.cell(0, 0).text = "Kode Kebutuhan"
    rel_table.cell(0, 1).text = "Aspek Keandalan"
    rel_table.cell(0, 2).text = "Spesifikasi Keandalan Sistem"
    for r_idx, (r_code, r_name, r_spec) in enumerate(rels, start=1):
        rel_table.cell(r_idx, 0).text = r_code
        rel_table.cell(r_idx, 1).text = r_name
        rel_table.cell(r_idx, 2).text = r_spec
    format_table(rel_table, col_widths=[1.5, 2.0, 3.2])

    add_h2(doc, "5.3 Kebutuhan Keamanan & Perlindungan Privasi (Security & Privacy - NFR-SEC)")
    secs = [
        ("NFR-SEC-001", "Privasi Pengguna Jalan (Privacy by Design)",
         "Sistem secara tegas dilarang mengidentifikasi, membaca teks plat nomor kendaraan, atau mengekstraksi fitur wajah individu. Pelacakan objek kendaraan semata-mata bersifat agregat anonim numerik."),
        ("NFR-SEC-002", "Pencegahan Kerentanan Injeksi SQL (SQL Injection Prevention)",
         "Semua operasi basis data harus dieksekusi melalui SQLAlchemy 2.0 ORM dengan parameterized queries yang tervalidasi skema Pydantic untuk mengeliminasi potensi celah SQL Injection."),
        ("NFR-SEC-003", "Enkripsi Saluran Komunikasi (Data in Transit Security)",
         "Seluruh komunikasi data antara peramban web, server backend, dan webhook otomasi n8n wajib diamankan menggunakan protokol terenkripsi HTTPS dengan standar TLS versi 1.3."),
    ]
    sec_table = doc.add_table(rows=len(secs) + 1, cols=3)
    sec_table.cell(0, 0).text = "Kode Kebutuhan"
    sec_table.cell(0, 1).text = "Aspek Keamanan"
    sec_table.cell(0, 2).text = "Spesifikasi Proteksi & Privasi"
    for r_idx, (s_code, s_name, s_spec) in enumerate(secs, start=1):
        sec_table.cell(r_idx, 0).text = s_code
        sec_table.cell(r_idx, 1).text = s_name
        sec_table.cell(r_idx, 2).text = s_spec
    format_table(sec_table, col_widths=[1.5, 2.0, 3.2])

    add_h2(doc, "5.4 Kebutuhan Kemudahan Penggunaan (Usability - NFR-USAB)")
    add_bullet(doc, "Antarmuka dashboard web harus menerapkan desain responsif (Responsive Web Design) yang dapat menyesuaikan tata letak secara fleksibel pada resolusi layar mulai dari 360 piksel (ponsel pintar) hingga 3840 piksel (layar monitor 4K).", "NFR-USAB-001 (Desain Responsif): ")
    add_bullet(doc, "Pengguna baru harus dapat memahami status kepadatan lalu lintas kota dalam waktu kurang dari 5 detik setelah halaman dimuat, didukung oleh indikator warna standar yang intuitif (Hijau = Lancar, Kuning = Sedang, Oranye = Padat, Merah = Macet).", "NFR-USAB-002 (Intuitivitas Status): ")
    add_bullet(doc, "Sistem harus menyediakan visual feedback (loading skeleton dan toast notification) pada setiap interaksi jaringan yang membutuhkan waktu lebih dari 300 milidetik.", "NFR-USAB-003 (Umpan Balik Visual): ")

    add_h2(doc, "5.5 Kebutuhan Pemeliharaan & Skalabilitas (Maintainability & Scalability - NFR-MAINT)")
    add_bullet(doc, "Kode program harus disusun mengikuti arsitektur modular monorepo dengan pemisahan dependensi yang jelas antara direktori backend/ (FastAPI), frontend/ (Next.js), vision/ (YOLOv11 & ByteTrack), dan n8n/ (workflows).", "NFR-MAINT-001 (Modularitas Kode): ")
    add_bullet(doc, "Setiap modifikasi skema basis data wajib dikelola melalui berkas migrasi Alembic yang tercatat dalam sistem kendali versi Git untuk menjamin reprodusibilitas skema.", "NFR-MAINT-002 (Database Migration): ")
    add_bullet(doc, "Seluruh subsistem harus dapat dibangun dan dijalankan secara terisolasi menggunakan kontainer Docker dan Docker Compose dengan satu perintah (single command deployment).", "NFR-MAINT-003 (Kontainerisasi): ")
    add_bullet(doc, "Seluruh fungsi API backend harus terdokumentasi otomatis sesuai standar OpenAPI v3 dan dapat diuji langsung melalui antarmuka Swagger UI interaktif.", "NFR-MAINT-004 (Dokumentasi API Terbuka): ")

    doc.add_page_break()


def build_chapter_6(doc):
    """Bab 6: Spesifikasi Use Case & Skenario."""
    add_h1(doc, "BAB VI: SPESIFIKASI USE CASE DAN SKENARIO SISTEM")

    add_h2(doc, "6.1 Identifikasi Aktor Sistem")
    add_p(doc, "Berdasarkan analisis kebutuhan, sistem LAJU berinteraksi dengan empat aktor utama:")
    add_bullet(doc, "Masyarakat umum pengguna jalan yang mengakses dashboard untuk memantau kepadatan, mendaftarkan rute perjalanan harian, dan menerima notifikasi WhatsApp.", "1. Komuter (Masyarakat Umum): ")
    add_bullet(doc, "Petugas operasional lalu lintas yang bertugas memonitor kondisi CCTV se-Kota Palembang secara real-time, meninjau grafik analitik, dan memantau anomali kemacetan.", "2. Petugas Dishub (Traffic Operator): ")
    add_bullet(doc, "Petugas inspeksi jalan yang bertugas mengunggah video survei jalan, memverifikasi lubang jalan terdeteksi, dan memperbarui status perbaikan jalan.", "3. Petugas Survei / PUPR: ")
    add_bullet(doc, "Sistem otomasi n8n yang bertindak sebagai aktor sistem terjadwal untuk memicu pengambilan data briefing dan membentuk payload pengiriman pesan.", "4. Sistem Otomasi (n8n Scheduler): ")

    add_h2(doc, "6.2 Daftar Use Case Utama")
    ucs = [
        ("UC-01", "Melihat Peta & Status Kepadatan Lalu Lintas", "Komuter, Petugas Dishub"),
        ("UC-02", "Memantau Live Stream CCTV & Grafik Analitik", "Petugas Dishub, Komuter"),
        ("UC-03", "Mendaftarkan dan Mengonfigurasi Rute Perjalanan", "Komuter"),
        ("UC-04", "Menerima Notifikasi Commuter Briefing via WhatsApp", "Komuter, Sistem Otomasi n8n"),
        ("UC-05", "Mengunggah & Memproses Video Survei Pothole + GPX", "Petugas Survei / PUPR"),
        ("UC-06", "Memverifikasi & Mengubah Status Kerusakan Jalan", "Petugas Survei / PUPR"),
        ("UC-07", "Mengelola Master Data Titik Pantau CCTV", "Administrator Sistem"),
        ("UC-08", "Mengeksekusi Penjadwalan Briefing Terjadwal", "Sistem Otomasi n8n"),
    ]
    uc_table = doc.add_table(rows=len(ucs) + 1, cols=3)
    uc_table.cell(0, 0).text = "Kode Use Case"
    uc_table.cell(0, 1).text = "Nama Use Case"
    uc_table.cell(0, 2).text = "Aktor Terkait"
    for r_idx, (u_code, u_name, u_actor) in enumerate(ucs, start=1):
        uc_table.cell(r_idx, 0).text = u_code
        uc_table.cell(r_idx, 1).text = u_name
        uc_table.cell(r_idx, 2).text = u_actor
    format_table(uc_table, col_widths=[1.5, 3.2, 2.0])

    add_h2(doc, "6.3 Skenario Terperinci Use Case Utama")

    scenarios = [
        ("UC-01: Melihat Peta & Status Kepadatan Lalu Lintas",
         "Komuter, Petugas Dishub",
         "Menyajikan gambaran spasial kondisi kelancaran jalan di seluruh titik pantau Kota Palembang.",
         "Pengguna memiliki koneksi internet dan membuka URL web dashboard LAJU.",
         [
             "Pengguna mengakses halaman utama web dashboard LAJU.",
             "Frontend mengirimkan permintaan GET ke /api/traffic/current dan /api/traffic/summary.",
             "Backend mengambil metrik kamera aktif dan menghitung agregasi 5 menit terakhir.",
             "Backend mengembalikan payload JSON status lalu lintas.",
             "Frontend merender peta Leaflet dengan penanda kamera berwarna sesuai status kepadatan (LANCAR/SEDANG/PADAT/MACET) serta kartu statistik cepat pada header.",
         ],
         "Koneksi backend gagal: Frontend menampilkan notifikasi peringatan dan mencoba menghubungkan ulang secara periodik.",
         "Pengguna melihat sebaran kondisi kepadatan lalu lintas kota pada peta secara interaktif."),

        ("UC-02: Memantau Live Stream CCTV & Grafik Analitik",
         "Petugas Dishub, Komuter",
         "Melihat aliran video langsung dari persimpangan jalan beserta kotak deteksi kendaraan dan grafik historis volume.",
         "Pengguna berada pada halaman dashboard dan memilih salah satu kartu atau penanda CCTV.",
         [
             "Pengguna mengklik marker kamera pada peta atau mengklik kartu kamera pada grid.",
             "Frontend menampilkan modal pop-up detail kamera.",
             "Frontend memuat elemen video MJPEG dari endpoint /api/cameras/{id}/stream.",
             "Backend menyajikan aliran frame teranotasi hasil pemrosesan YOLOv11 dan ByteTrack secara kontinu.",
             "Frontend secara bersamaan meminta riwayat snapshot volume kendaraan dan merender grafik Recharts 20 menit terakhir.",
         ],
         "Feed CCTV offline: Sistem menampilkan ikon peringatan bahwa kamera sedang dalam proses reconnect dan menampilkan snapshot historis terakhir.",
         "Pengguna mendapatkan visualisasi langsung lalu lintas nyata dan grafik tren volume kendaraan."),

        ("UC-03: Mendaftarkan dan Mengonfigurasi Rute Perjalanan",
         "Komuter",
         "Menyimpan rute perjalanan komuter dan menetapkan jadwal pengingat briefing harian.",
         "Pengguna membuka panel manajemen rute pada antarmuka dashboard.",
         [
             "Pengguna membuka formulir pendaftaran rute komuter.",
             "Pengguna memasukkan nama rute (misal: 'Rumah ke Kampus UIN Jakabaring'), memilih tipe perjalanan, dan menentukan titik koordinat asal dan tujuan.",
             "Pengguna menetapkan jam pengingat notifikasi (misal: '06:45').",
             "Frontend mengirimkan data rute dalam format GeoJSON ke endpoint POST /api/routes.",
             "Backend memvalidasi data, membentuk geometri LINESTRING PostGIS, dan menyimpan record ke tabel routes.",
             "Frontend memperbarui tampilan daftar rute dan menampilkan garis rute pada peta.",
         ],
         "Koordinat rute di luar wilayah operasional Palembang: Sistem memberikan peringatan validasi batas wilayah.",
         "Rute perjalanan tersimpan dan siap dipantau oleh mesin briefing terjadwal."),

        ("UC-04: Menerima Notifikasi Commuter Briefing via WhatsApp",
         "Komuter, Sistem Otomasi n8n",
         "Mengirimkan pesan ringkasan kondisi jalan dan rute secara proaktif ke nomor WhatsApp pengguna sebelum jam keberangkatan.",
         "Rute pengguna aktif dan jam saat ini bersesuaian dengan jam notifikasi yang ditentukan.",
         [
             "Node Cron n8n memicu alur kerja setiap menit.",
             "n8n mengambil daftar rute aktif dan menyaring rute yang jatuh tempo saat ini.",
             "n8n memanggil endpoint backend GET /api/routes/{id}/briefing.",
             "Backend menjalankan query buffer spasial PostGIS untuk menghitung kepadatan kamera dan lubang jalan pada koridor rute.",
             "Backend menyusun kalimat laporan deterministik (status rute, titik terpadat, bahaya jalan berlubang).",
             "n8n memformat payload WhatsApp outbox dan meneruskan pesan ke nomor komuter.",
             "Pengguna menerima pesan briefing pada aplikasi WhatsApp di ponsel pintarnya.",
         ],
         "Koneksi penyedia WhatsApp gagal: Pesan disimpan dalam antrean outbox dengan status pending retry.",
         "Komuter mendapatkan informasi dini mengenai kondisi lalu lintas sebelum melakukan perjalanan."),

        ("UC-05: Mengunggah & Memproses Video Survei Pothole + GPX",
         "Petugas Survei / PUPR",
         "Mengekstrak lokasi jalan berlubang otomatis dari rekaman video survei lapangan dan data logger GPS.",
         "Petugas memiliki file rekaman video jalan (.mp4) dan file GPS (.gpx) hasil survei kendaraan.",
         [
             "Petugas menjalankan perintah worker survei pothole dengan parameter file video dan file GPX.",
             "Worker membaca metadata video dan memparsing seluruh track point koordinat GPX bertimestamp.",
             "Model YOLOv11 mendeteksi objek lubang jalan pada frame video bergerak.",
             "Worker menginterpolasikan waktu frame ke koordinat GPS secara linear untuk mendapatkan latitude dan longitude presisi.",
             "Worker mengekstrak potongan gambar bukti (evidence crop) dan menyimpannya ke direktori evidence.",
             "Worker menjalankan query spasial PostGIS ST_DWithin (radius 10m) untuk mencegah duplikasi data.",
             "Data lubang jalan baru tersimpan ke tabel potholes dengan status UNVERIFIED.",
         ],
         "File GPX tidak mencakup rentang waktu video: Sistem menggunakan titik koordinat tepi terdekat dan mencatat log peringatan offset waktu.",
         "Data kerusakan jalan terpetakan secara akurat dengan koordinat geografis dan foto bukti."),

        ("UC-06: Memverifikasi & Mengubah Status Kerusakan Jalan",
         "Petugas Survei / PUPR",
         "Melakukan audit terhadap deteksi lubang jalan dan memperbarui status setelah dilakukan perbaikan fisik oleh dinas.",
         "Petugas membuka menu audit lubang jalan pada antarmuka dashboard.",
         [
             "Petugas melihat tabel daftar lubang jalan terdeteksi beserta thumbnail foto bukti dan nilai keyakinan.",
             "Petugas mengklik salah satu baris untuk melihat titik lokasi pada peta dan foto bukti resolusi penuh.",
             "Petugas memilih opsi status baru: ACTIVE (terkonfirmasi rusak) atau REPAIRED (telah diperbaiki).",
             "Frontend mengirimkan permintaan PATCH ke /api/potholes/{id}/status.",
             "Backend memperbarui record di tabel potholes dan mencatat timestamp pembaruan.",
             "Warna penanda lubang pada peta Leaflet otomatis berubah sesuai status baru.",
         ],
         "Perubahan status gagal: Sistem menampilkan pesan error dan mengembalikan status ke kondisi sebelumnya.",
         "Kondisi inventarisasi kerusakan jalan di basis data selalu mencerminkan kondisi riil lapangan."),
    ]

    for uc_title, uc_actor, uc_goal, uc_pre, uc_steps, uc_alt, uc_post in scenarios:
        add_h3(doc, uc_title)
        add_p(doc, f"Tujuan: {uc_goal}")
        t_sc = doc.add_table(rows=6, cols=2)
        t_sc.cell(0, 0).text = "Aktor Terkait"
        t_sc.cell(0, 1).text = uc_actor
        t_sc.cell(1, 0).text = "Kondisi Awal (Pre-condition)"
        t_sc.cell(1, 1).text = uc_pre
        t_sc.cell(2, 0).text = "Alur Utama (Main Flow)"
        
        flow_text = "\n".join([f"{idx+1}. {st}" for idx, st in enumerate(uc_steps)])
        t_sc.cell(2, 1).text = flow_text

        t_sc.cell(3, 0).text = "Alur Alternatif (Alternative Flow)"
        t_sc.cell(3, 1).text = uc_alt
        t_sc.cell(4, 0).text = "Kondisi Akhir (Post-condition)"
        t_sc.cell(4, 1).text = uc_post
        t_sc.cell(5, 0).text = "Prioritas Implementasi"
        t_sc.cell(5, 1).text = "Tinggi (Critical / Mandatory for Release)"
        format_table(t_sc, col_widths=[1.8, 4.7])

    doc.add_page_break()


def build_chapter_7(doc):
    """Bab 7: Arsitektur Data, Endpoint API, & RTM."""
    add_h1(doc, "BAB VII: ARSITEKTUR BASIS DATA, SPESIFIKASI API, DAN MATRIKS KETERTELUSURAN")

    add_h2(doc, "7.1 Kamus Data Basis Data Relasional & Spasial PostGIS")
    add_p(
        doc,
        "Struktur basis data sistem LAJU diimplementasikan menggunakan PostgreSQL 16 dengan modul spasial PostGIS 3.4. "
        "Sistem menggunakan sistem koordinat referensi spasial WGS 84 (SRID 4326) yang kompatibel dengan standar GPS dan pemetaan web global. "
        "Berikut adalah kamus data untuk enam entitas utama sistem:"
    )

    # 1. Cameras Table
    add_h3(doc, "1. Kamus Data Tabel: cameras")
    cam_cols = [
        ("id", "INTEGER", "PRIMARY KEY, AUTO", "Pengenal unik kamera CCTV."),
        ("name", "VARCHAR(160)", "NOT NULL", "Nama deskriptif kamera / persimpangan."),
        ("road_name", "VARCHAR(160)", "NOT NULL", "Nama ruas jalan lokasi kamera."),
        ("latitude", "DOUBLE PRECISION", "NOT NULL", "Koordinat lintang geografis."),
        ("longitude", "DOUBLE PRECISION", "NOT NULL", "Koordinat bujur geografis."),
        ("location", "GEOMETRY(POINT, 4326)", "NULLABLE", "Geometri spasial titik koordinat (PostGIS)."),
        ("stream_url", "TEXT", "NULLABLE", "URL sumber feed video (HLS / RTSP)."),
        ("stream_type", "VARCHAR(20)", "DEFAULT 'local'", "Tipe protokol stream ('hls', 'rtsp', 'local')."),
        ("is_active", "BOOLEAN", "DEFAULT TRUE", "Status keaktifan pemrosesan kamera."),
        ("is_demo", "BOOLEAN", "DEFAULT FALSE", "Penanda apakah kamera menggunakan video demo."),
        ("low_threshold", "INTEGER", "DEFAULT 20", "Batas volume 5-menit status LANCAR."),
        ("medium_threshold", "INTEGER", "DEFAULT 45", "Batas volume 5-menit status SEDANG."),
        ("high_threshold", "INTEGER", "DEFAULT 75", "Batas volume 5-menit status PADAT/MACET."),
    ]
    t_cam = doc.add_table(rows=len(cam_cols) + 1, cols=4)
    t_cam.cell(0, 0).text = "Nama Kolom"
    t_cam.cell(0, 1).text = "Tipe Data"
    t_cam.cell(0, 2).text = "Null / Constraint"
    t_cam.cell(0, 3).text = "Keterangan dan Deskripsi"
    for r_idx, (c_name, c_type, c_const, c_desc) in enumerate(cam_cols, start=1):
        t_cam.cell(r_idx, 0).text = c_name
        t_cam.cell(r_idx, 1).text = c_type
        t_cam.cell(r_idx, 2).text = c_const
        t_cam.cell(r_idx, 3).text = c_desc
    format_table(t_cam, col_widths=[1.5, 1.6, 1.4, 2.0])

    # 2. Traffic Snapshots Table
    add_h3(doc, "2. Kamus Data Tabel: traffic_snapshots")
    snap_cols = [
        ("id", "INTEGER", "PRIMARY KEY, AUTO", "Pengenal unik record snapshot."),
        ("camera_id", "INTEGER", "FOREIGN KEY (cameras.id)", "Kamera pemilik snapshot (Cascade Delete)."),
        ("timestamp", "TIMESTAMP WITH TZ", "INDEX, NOT NULL", "Waktu pencatatan snapshot (UTC)."),
        ("motorcycle_count", "INTEGER", "DEFAULT 0", "Jumlah sepeda motor yang melintas."),
        ("car_count", "INTEGER", "DEFAULT 0", "Jumlah mobil penumpang yang melintas."),
        ("bus_count", "INTEGER", "DEFAULT 0", "Jumlah bus yang melintas."),
        ("truck_count", "INTEGER", "DEFAULT 0", "Jumlah truk yang melintas."),
        ("total_count", "INTEGER", "DEFAULT 0", "Total seluruh kendaraan yang melintas."),
        ("congestion_score", "DOUBLE PRECISION", "DEFAULT 0.0", "Skor kejenuhan lalu lintas (0 - 100)."),
        ("traffic_status", "ENUM", "NOT NULL", "'LANCAR', 'SEDANG', 'PADAT', 'MACET'."),
    ]
    t_snap = doc.add_table(rows=len(snap_cols) + 1, cols=4)
    t_snap.cell(0, 0).text = "Nama Kolom"
    t_snap.cell(0, 1).text = "Tipe Data"
    t_snap.cell(0, 2).text = "Null / Constraint"
    t_snap.cell(0, 3).text = "Keterangan dan Deskripsi"
    for r_idx, (c_name, c_type, c_const, c_desc) in enumerate(snap_cols, start=1):
        t_snap.cell(r_idx, 0).text = c_name
        t_snap.cell(r_idx, 1).text = c_type
        t_snap.cell(r_idx, 2).text = c_const
        t_snap.cell(r_idx, 3).text = c_desc
    format_table(t_snap, col_widths=[1.5, 1.6, 1.4, 2.0])

    # 3. Potholes Table
    add_h3(doc, "3. Kamus Data Tabel: potholes")
    pot_cols = [
        ("id", "INTEGER", "PRIMARY KEY, AUTO", "Pengenal unik kerusakan jalan."),
        ("latitude", "DOUBLE PRECISION", "NOT NULL", "Koordinat lintang hasil interpolasi GPS."),
        ("longitude", "DOUBLE PRECISION", "NOT NULL", "Koordinat bujur hasil interpolasi GPS."),
        ("location", "GEOMETRY(POINT, 4326)", "SPATIAL INDEX", "Geometri titik spasial (PostGIS)."),
        ("road_name", "VARCHAR(160)", "NULLABLE", "Nama ruas jalan tempat lubang berada."),
        ("confidence", "DOUBLE PRECISION", "NOT NULL", "Nilai keyakinan model YOLOv11 (0.0 - 1.0)."),
        ("severity", "ENUM", "DEFAULT 'unknown'", "'low', 'medium', 'high', 'unknown'."),
        ("image_path", "TEXT", "NULLABLE", "Jalur berkas potongan gambar bukti (evidence)."),
        ("detected_at", "TIMESTAMP WITH TZ", "DEFAULT UTC_NOW", "Waktu perekaman/deteksi lubang."),
        ("status", "ENUM", "DEFAULT 'unverified'", "'active', 'repaired', 'unverified'."),
    ]
    t_pot = doc.add_table(rows=len(pot_cols) + 1, cols=4)
    t_pot.cell(0, 0).text = "Nama Kolom"
    t_pot.cell(0, 1).text = "Tipe Data"
    t_pot.cell(0, 2).text = "Null / Constraint"
    t_pot.cell(0, 3).text = "Keterangan dan Deskripsi"
    for r_idx, (c_name, c_type, c_const, c_desc) in enumerate(pot_cols, start=1):
        t_pot.cell(r_idx, 0).text = c_name
        t_pot.cell(r_idx, 1).text = c_type
        t_pot.cell(r_idx, 2).text = c_const
        t_pot.cell(r_idx, 3).text = c_desc
    format_table(t_pot, col_widths=[1.5, 1.6, 1.4, 2.0])

    # 4. Routes Table
    add_h3(doc, "4. Kamus Data Tabel: routes")
    rte_cols = [
        ("id", "INTEGER", "PRIMARY KEY, AUTO", "Pengenal unik rute perjalanan komuter."),
        ("user_id", "INTEGER", "FOREIGN KEY (users.id)", "Pengguna pemilik rute komuter."),
        ("name", "VARCHAR(160)", "NOT NULL", "Nama label rute (misal: 'Rumah ke Kantor')."),
        ("route_type", "ENUM", "DEFAULT 'custom'", "'commute_to_work', 'commute_home', 'custom'."),
        ("start_latitude", "DOUBLE PRECISION", "NOT NULL", "Koordinat lintang titik keberangkatan."),
        ("start_longitude", "DOUBLE PRECISION", "NOT NULL", "Koordinat bujur titik keberangkatan."),
        ("destination_latitude", "DOUBLE PRECISION", "NOT NULL", "Koordinat lintang titik tujuan."),
        ("destination_longitude", "DOUBLE PRECISION", "NOT NULL", "Koordinat bujur titik tujuan."),
        ("geometry", "GEOMETRY(LINESTRING)", "SPATIAL INDEX", "Geometri garis lintasan rute perjalanan."),
        ("path", "JSON", "NOT NULL", "Array koordinat [[lat, lon], ...] untuk frontend."),
        ("notification_time", "TIME WITHOUT TZ", "NULLABLE", "Waktu pengiriman briefing terjadwal."),
    ]
    t_rte = doc.add_table(rows=len(rte_cols) + 1, cols=4)
    t_rte.cell(0, 0).text = "Nama Kolom"
    t_rte.cell(0, 1).text = "Tipe Data"
    t_rte.cell(0, 2).text = "Null / Constraint"
    t_rte.cell(0, 3).text = "Keterangan dan Deskripsi"
    for r_idx, (c_name, c_type, c_const, c_desc) in enumerate(rte_cols, start=1):
        t_rte.cell(r_idx, 0).text = c_name
        t_rte.cell(r_idx, 1).text = c_type
        t_rte.cell(r_idx, 2).text = c_const
        t_rte.cell(r_idx, 3).text = c_desc
    format_table(t_rte, col_widths=[1.5, 1.6, 1.4, 2.0])

    add_h2(doc, "7.2 Spesifikasi Endpoint RESTful API")
    add_p(
        doc,
        "Backend FastAPI mengekspos sejumlah endpoint RESTful API terstandarisasi untuk melayani kebutuhan frontend, "
        "modul worker visi komputer, dan sistem otomasi n8n:"
    )

    apis = [
        ("GET", "/api/cameras", "Mengambil daftar seluruh kamera CCTV aktif beserta metadata koordinat.", "JSON Array of CameraResponse"),
        ("POST", "/api/cameras", "Mendaftarkan titik kamera CCTV baru beserta ambang batasnya.", "JSON CameraResponse (Status 201)"),
        ("GET", "/api/cameras/{id}", "Mengambil data detail kamera berdasarkan ID.", "JSON CameraResponse"),
        ("GET", "/api/cameras/{id}/stream", "Menyajikan live video streaming MJPEG dengan anotasi AI.", "Multipart HTTP Stream (image/jpeg)"),
        ("GET", "/api/cameras/{id}/analytics", "Mengambil metrik volume dan riwayat snapshot kamera tertentu.", "JSON CameraAnalyticsResponse"),
        ("GET", "/api/traffic/current", "Mengambil status kepadatan terkini seluruh kamera (rolling 5 menit).", "JSON Array of TrafficCurrent"),
        ("GET", "/api/traffic/summary", "Mengambil ringkasan lalu lintas kota untuk widget header dashboard.", "JSON TrafficSummary"),
        ("GET", "/api/routes", "Mengambil daftar seluruh rute perjalanan komuter aktif.", "JSON Array of RouteResponse"),
        ("POST", "/api/routes", "Mendaftarkan rute komuter baru beserta jam notifikasinya.", "JSON RouteResponse (Status 201)"),
        ("GET", "/api/routes/{id}/briefing", "Menghitung analisis koridor rute & teks laporan briefing komuter.", "JSON CommuteBriefingResponse"),
        ("GET", "/api/potholes", "Mengambil daftar seluruh lubang jalan hasil inspeksi video + GPX.", "JSON Array of PotholeResponse"),
    ]
    api_table = doc.add_table(rows=len(apis) + 1, cols=4)
    api_table.cell(0, 0).text = "Metode"
    api_table.cell(0, 1).text = "Jalur Endpoint (URI)"
    api_table.cell(0, 2).text = "Fungsi & Peruntukan"
    api_table.cell(0, 3).text = "Format Respons Utama"
    for r_idx, (a_method, a_uri, a_desc, a_res) in enumerate(apis, start=1):
        api_table.cell(r_idx, 0).text = a_method
        api_table.cell(r_idx, 1).text = a_uri
        api_table.cell(r_idx, 2).text = a_desc
        api_table.cell(r_idx, 3).text = a_res
    format_table(api_table, col_widths=[0.8, 2.2, 2.2, 1.3])

    add_h2(doc, "7.3 Matriks Ketertelusuran Kebutuhan (Requirements Traceability Matrix - RTM)")
    add_p(
        doc,
        "Matriks Ketertelusuran Kebutuhan (RTM) menghubungkan setiap Kebutuhan Fungsional (FR) dengan Kasus Penggunaan (Use Case), "
        "komponen kode perangkat lunak, dan tabel basis data terkait untuk memastikan tidak ada kebutuhan yang terlewatkan (missing requirement)."
    )

    rtm_rows = [
        ("FR-CAM-001", "Pendaftaran Kamera CCTV", "UC-07", "backend/app/api/cameras.py", "cameras"),
        ("FR-CAM-002", "Ingestion Stream HLS/RTSP", "UC-02", "vision/traffic_worker/stream_reader.py", "cameras"),
        ("FR-CAM-003", "Auto-Reconnect & Fallback", "UC-02", "vision/traffic_worker/feed_manager.py", "cameras"),
        ("FR-CAM-004", "Distribusi Stream MJPEG", "UC-02", "backend/app/api/cameras.py", "cameras"),
        ("FR-TRF-001", "Deteksi Kendaraan YOLOv11", "UC-02", "vision/traffic_worker/detector.py", "vehicle_events"),
        ("FR-TRF-002", "Pelacakan Multi-Objek ByteTrack", "UC-02", "vision/traffic_worker/tracker.py", "vehicle_events"),
        ("FR-TRF-003", "Penghitungan Virtual Line", "UC-02", "vision/traffic_worker/counter.py", "vehicle_events"),
        ("FR-TRF-005", "Klasifikasi Deterministik", "UC-01", "backend/app/traffic/analytics.py", "traffic_snapshots"),
        ("FR-TRF-007", "Persistensi Snapshot Berkala", "UC-01", "vision/traffic_worker/worker.py", "traffic_snapshots"),
        ("FR-PTH-001", "Parsing GPX & Video Survei", "UC-05", "vision/pothole_worker/gpx_parser.py", "potholes"),
        ("FR-PTH-002", "Interpolasi Temporal Linear", "UC-05", "vision/pothole_worker/synchronizer.py", "potholes"),
        ("FR-PTH-004", "Ekstraksi Bukti (Evidence)", "UC-05", "vision/pothole_worker/evidence.py", "potholes"),
        ("FR-PTH-005", "Deduplikasi Spasial 10m", "UC-05", "backend/app/api/potholes.py", "potholes"),
        ("FR-RTE-002", "Buffer Spasial Koridor", "UC-04", "backend/app/services/briefing.py", "routes, cameras"),
        ("FR-BRF-002", "Penyusunan Briefing WhatsApp", "UC-04", "backend/app/services/briefing_formatter.py", "routes, users"),
    ]
    rtm_table = doc.add_table(rows=len(rtm_rows) + 1, cols=5)
    rtm_table.cell(0, 0).text = "Kode FR"
    rtm_table.cell(0, 1).text = "Nama Kebutuhan Fungsional"
    rtm_table.cell(0, 2).text = "Kode UC"
    rtm_table.cell(0, 3).text = "File / Modul Kode"
    rtm_table.cell(0, 4).text = "Entitas Data Terkait"
    for r_idx, (r_id, r_name, r_uc, r_code, r_ent) in enumerate(rtm_rows, start=1):
        rtm_table.cell(r_idx, 0).text = r_id
        rtm_table.cell(r_idx, 1).text = r_name
        rtm_table.cell(r_idx, 2).text = r_uc
        rtm_table.cell(r_idx, 3).text = r_code
        rtm_table.cell(r_idx, 4).text = r_ent
    format_table(rtm_table, col_widths=[1.1, 1.8, 0.8, 1.8, 1.0])

    doc.add_page_break()


def build_chapter_8(doc):
    """Bab 8: Penutup & Rencana Pengujian."""
    add_h1(doc, "BAB VIII: PENUTUP DAN RENCANA PENGUJIAN")

    add_h2(doc, "8.1 Kesimpulan Analisis Kebutuhan")
    add_p(
        doc,
        "Dokumen Spesifikasi Kebutuhan Perangkat Lunak (SRS) ini telah merumuskan secara komprehensif seluruh kebutuhan "
        "sistem pemantauan lalu lintas dan asisten komuter cerdas LAJU. "
        "Melalui integrasi visi komputer state-of-the-art (YOLOv11 dan ByteTrack), basis data relasional spasial PostGIS, "
        "serta mesin briefing otomatis n8n, sistem LAJU tidak hanya memantau lalu lintas secara pasif, namun memberikan nilai tambah "
        "konkret bagi efisiensi mobilitas masyarakat dan pengambilan kebijakan keselamatan jalan oleh pemerintah Kota Palembang."
    )

    add_h2(doc, "8.2 Rencana Pengujian Sistem (System Verification Plan)")
    add_p(
        doc,
        "Untuk menjamin seluruh kebutuhan yang didefinisikan dalam dokumen SRS ini terpenuhi dengan tingkat kepatuhan 100%, "
        "akan dilaksanakan serangkaian metodologi pengujian terstruktur:"
    )

    tests = [
        ("Unit Testing (Pytest)", "Logika analitik backend, formula klasifikasi kepadatan, kalkulasi tren laju, dan parsing GPX.", "Minimal 85% Code Coverage", "Seluruh test suite lulus tanpa assertion error."),
        ("Spatial Verification Testing", "Akurasi query ST_DWithin buffer rute dan ketepatan deduplikasi radius 10 meter.", "Query Geospasial PostGIS", "Zero duplication pada titik lubang berdekatan."),
        ("Vision Pipeline Benchmarking", "Pengukuran FPS deteksi, tracking drift, konsistensi counting line, dan pemulihan memori tracker.", "Kamera CCTV Palembang", "FPS >= 15 pada GPU, zero memory leak pada siklus 72 jam."),
        ("End-to-End Integration Testing", "Aliran data dari streaming CCTV -> deteksi -> REST API -> rendering Web Dashboard -> pemicu n8n.", "Seluruh Subsistem Terintegrasi", "Dashboard menampilkan metrik real-time dan n8n menghasilkan payload valid."),
        ("Usability / User Acceptance Test", "Kemudahan navigasi antarmuka peta, kejelasan indikator warna, responsivitas mobile.", "Pengguna Komuter & Operator", "System Usability Scale (SUS) skor minimal >= 75 (Kategori Baik)."),
    ]
    test_table = doc.add_table(rows=len(tests) + 1, cols=4)
    test_table.cell(0, 0).text = "Metode Pengujian"
    test_table.cell(0, 1).text = "Fokus Pengujian"
    test_table.cell(0, 2).text = "Target Cakupan (Target Coverage)"
    test_table.cell(0, 3).text = "Tolak Ukur Keberhasilan"
    for r_idx, (t_meth, t_foc, t_cov, t_bench) in enumerate(tests, start=1):
        test_table.cell(r_idx, 0).text = t_meth
        test_table.cell(r_idx, 1).text = t_foc
        test_table.cell(r_idx, 2).text = t_cov
        test_table.cell(r_idx, 3).text = t_bench
    format_table(test_table, col_widths=[1.5, 1.8, 1.4, 1.8])

    add_p(
        doc,
        "Dengan diterbitkannya dokumen SRS ini, tahapan perancangan arsitektur dan pengembangan perangkat lunak sistem LAJU "
        "memiliki landasan rekayasa yang solid dan terverifikasi untuk dilanjutkan ke tahap pengujian capstone komprehensif."
    )

    add_h2(doc, "8.3 Lembar Pengesahan Spesifikasi Kebutuhan")
    add_p(doc, "Spesifikasi Kebutuhan Perangkat Lunak ini telah ditinjau dan disetujui untuk digunakan sebagai pedoman pengujian dan penilaian Capstone Project:")

    sign_table = doc.add_table(rows=2, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sign_table.cell(0, 0).text = "Disusun Oleh,\nPengembang / Mahasiswa"
    sign_table.cell(0, 1).text = "Disetujui Oleh,\nDosen Pembimbing Capstone"
    sign_table.cell(1, 0).text = "\n\n\n\n___________________________________\nMUHAMMAD NAUFAL AL-GHIFARI\nNIM: 23041450154"
    sign_table.cell(1, 1).text = "\n\n\n\n___________________________________\nTIM PEMBIMBING CAPSTONE\nNIP/NIDN."
    format_table(sign_table, col_widths=[3.2, 3.3], header_bg="475569")


def main():
    print("Mulai menghasilkan dokumen SRS dalam format Word (.docx)...")
    doc = setup_document()

    print("- Menyusun Halaman Judul & Riwayat Revisi...")
    build_cover_page(doc)

    print("- Menyusun Bab 1: Pendahuluan...")
    build_chapter_1(doc)

    print("- Menyusun Bab 2: Deskripsi Umum Sistem (dengan Gambar 2.1)...")
    build_chapter_2(doc)

    print("- Menyusun Bab 3: Kebutuhan Antarmuka Eksternal...")
    build_chapter_3(doc)

    print("- Menyusun Bab 4: Kebutuhan Fungsional (FR) (dengan Gambar 4.1 & 4.2)...")
    build_chapter_4(doc)

    print("- Menyusun Bab 5: Kebutuhan Non-Fungsional (NFR)...")
    build_chapter_5(doc)

    print("- Menyusun Bab 6: Spesifikasi Use Case & Skenario...")
    build_chapter_6(doc)

    print("- Menyusun Bab 7: Arsitektur Data, API, & RTM...")
    build_chapter_7(doc)

    print("- Menyusun Bab 8: Penutup & Rencana Pengujian...")
    build_chapter_8(doc)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    doc.save(OUTPUT_FILE)
    print(f"\n[SUKSES] Dokumen SRS berhasil disimpan di: {OUTPUT_FILE}")

    # Copy to artifact dir for download convenience
    shutil.copy(OUTPUT_FILE, ARTIFACT_OUTPUT_FILE)
    print(f"[SUKSES] Salinan dokumen SRS disimpan di artifact: {ARTIFACT_OUTPUT_FILE}")

    file_size_kb = os.path.getsize(OUTPUT_FILE) / 1024
    print(f"Ukuran file: {file_size_kb:.1f} KB")


if __name__ == "__main__":
    main()
