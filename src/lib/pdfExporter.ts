/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { DocumentData } from '@/src/types';
import { DocumentFiller } from './exporter';

interface RenderableParagraph {
  type: 'paragraph';
  text: string;
  isBold: boolean;
  isHeading: boolean;
  alignment: 'left' | 'center' | 'right';
  indentation: number;
}

interface RenderableTable {
  type: 'table';
  headers: string[];
  rows: string[][];
}

type RenderableElement = RenderableParagraph | RenderableTable;

export class PdfConverter {
  private pdfDoc!: PDFDocument;
  private currentFont!: PDFFont;
  private boldFont!: PDFFont;
  private italicFont!: PDFFont;
  private boldItalicFont!: PDFFont;
  
  private curPage: any = null;
  private curPageNum = 0;
  private currentY = 788; // Start below top margin of 54pt
  
  // Page boundaries (A4)
  private readonly pageWidth = 595.27;
  private readonly pageHeight = 841.89;
  private readonly margin = 54; // h-margin
  private readonly bottomMargin = 54;
  private readonly topMargin = 54;
  private readonly contentWidth = 595.27 - (54 * 2);

  constructor() {}

  private sanitizeText(text: string): string {
    if (!text) return "";
    
    let result = text;
    
    // Replace hyphens & dashes (including 0x2011 non-breaking hyphen, soft hyphen, em/en-dashes)
    result = result.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u00ad]/g, "-");
    
    // Replace smart single quotes & backticks
    result = result.replace(/[\u2018\u2019\u0060\u00b4]/g, "'");
    
    // Replace smart double quotes
    result = result.replace(/[\u201c\u201d]/g, '"');
    
    // Replace non-breaking spaces and formatting space variations
    result = result.replace(/[\u00a0\u2000-\u200b]/g, " ");
    
    // Replace bullets and layout symbols
    result = result.replace(/[\u2022\u2023\u25cf\u25cb\u25aa\u25ab]/g, "-");
    
    // Replace horizontal ellipsis
    result = result.replace(/\u2026/g, "...");
    
    // Replace common math/arrow symbols that aren't in simple standard western fonts
    result = result.replace(/\u2264/g, "<=");
    result = result.replace(/\u2265/g, ">=");
    result = result.replace(/\u2260/g, "!=");
    result = result.replace(/\u00b1/g, "+/-");
    result = result.replace(/\u2192/g, "->");
    result = result.replace(/\u2190/g, "<-");
    result = result.replace(/\u21d2/g, "=>");
    result = result.replace(/\u20b9/g, "Rs."); // Rupees symbol

    // Safe normalize accents (e.g. é -> e, ü -> u, ñ -> n) and clear high-unicode outliers
    const cleaned: string[] = [];
    for (let i = 0; i < result.length; i++) {
      const charCode = result.charCodeAt(i);
      if (charCode === 10 || charCode === 13 || charCode === 9) {
        // Control chars
        cleaned.push(result[i]);
      } else if (charCode >= 32 && charCode <= 126) {
        // Safe ASCII
        cleaned.push(result[i]);
      } else if (charCode >= 160 && charCode <= 255) {
        // Standard Latin-1 supplement character, normalize just to be absolutely safe
        const normalizedChar = result[i].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        cleaned.push(normalizedChar);
      } else {
        // Fallback for everything else
        cleaned.push(" ");
      }
    }
    
    return cleaned.join("");
  }

  async initialize() {
    this.pdfDoc = await PDFDocument.create();
    
    // Embed standard Times New Roman fonts for university/office feel
    this.currentFont = await this.pdfDoc.embedFont(StandardFonts.TimesRoman);
    this.boldFont = await this.pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    this.italicFont = await this.pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    this.boldItalicFont = await this.pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  }

  private addNewPage() {
    this.curPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    this.curPageNum++;
    this.currentY = this.pageHeight - this.topMargin;
    
    // Add page number (subtle header/footer)
    const pageStr = `${this.curPageNum}`;
    const fontWidth = this.italicFont.widthOfTextAtSize(pageStr, 8);
    this.curPage.drawText(pageStr, {
      x: this.pageWidth / 2 - fontWidth / 2,
      y: 30, // Bottom footer space
      size: 8,
      font: this.italicFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Draw subtle divider line if page > 1
    if (this.curPageNum > 1) {
      this.curPage.drawLine({
        start: { x: this.margin, y: this.pageHeight - 35 },
        end: { x: this.pageWidth - this.margin, y: this.pageHeight - 35 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
    }
  }

  // Parses completed DOCX content XML into sequential elements
  private parseCompletedXml(xmlContent: string): RenderableElement[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const body = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.getElementsByTagName('body')[0];
    
    if (!body) return [];

    const elements: RenderableElement[] = [];

    const childNodes = Array.from(body.childNodes);
    childNodes.forEach((node: any) => {
      const nodeName = node.nodeName.replace('w:', '');
      
      if (nodeName === 'p') {
        const rawText = (node.textContent || '').trim();
        // Skip empty spacer rows if preceding is empty
        if (!rawText) return;
        const text = this.sanitizeText(rawText);

        // Check if paragraph is heading/bold
        let isBold = false;
        let isHeading = false;
        
        const rPrs = node.getElementsByTagName('w:rPr');
        for (let i = 0; i < rPrs.length; i++) {
          const b = rPrs[i].getElementsByTagName('w:b');
          if (b.length > 0) isBold = true;
        }

        const pPrs = node.getElementsByTagName('w:pPr');
        for (let i = 0; i < pPrs.length; i++) {
          const style = pPrs[i].getElementsByTagName('w:pStyle');
          if (style.length > 0) {
            const val = style[0].getAttribute('w:val') || '';
            if (val.toLowerCase().includes('heading') || val.toLowerCase().includes('title')) {
              isHeading = true;
            }
          }
        }

        // Broad heuristics for heading status based on length and caps
        if (text.length < 100 && /^[A-Z0-9\s:,\-\.\/()]{5,}$/.test(text.replace(/[^A-Za-z0-9]/g, '')) && text.length > 3) {
          isHeading = true;
        }
        
        if (text.toLowerCase().startsWith('aim') || 
            text.toLowerCase().startsWith('objective') || 
            text.toLowerCase().startsWith('experiment') || 
            text.toLowerCase().startsWith('observation') || 
            text.toLowerCase().startsWith('result') || 
            text.toLowerCase().startsWith('conclusion') || 
            text.toLowerCase().startsWith('practical') || 
            text.toLowerCase().startsWith('procedure')) {
          isHeading = true;
          isBold = true;
        }

        elements.push({
          type: 'paragraph',
          text,
          isBold: isBold || isHeading,
          isHeading: isHeading,
          alignment: 'left',
          indentation: 0
        });
      } 
      else if (nodeName === 'tbl') {
        const rows: string[][] = [];
        const trs = Array.from(node.getElementsByTagName('w:tr'));
        
        trs.forEach((trNode: any) => {
          const rowData: string[] = [];
          const tcs = Array.from(trNode.getElementsByTagName('w:tc'));
          
          tcs.forEach((tcNode: any) => {
            const cellText = (tcNode.textContent || '').trim();
            rowData.push(this.sanitizeText(cellText));
          });
          
          if (rowData.some(cellText => cellText !== '')) {
            rows.push(rowData);
          }
        });

        if (rows.length > 0) {
          elements.push({
            type: 'table',
            headers: rows[0],
            rows: rows.slice(1),
          });
        }
      }
    });

    return elements;
  }

  // Splits paragraph text into lines fitting the column width
  private wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const paragraphs = text.split('\n');
    const lines: string[] = [];

    paragraphs.forEach(para => {
      const words = para.split(/\s+/);
      let currentLine = '';

      words.forEach(word => {
        if (!word) return;
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
          
          // Character-level safe wrap if word itself exceeds max width
          if (font.widthOfTextAtSize(currentLine, size) > maxWidth) {
            let chunk = '';
            for (let i = 0; i < currentLine.length; i++) {
              const testChunk = chunk + currentLine[i];
              if (font.widthOfTextAtSize(testChunk, size) > maxWidth) {
                lines.push(chunk);
                chunk = currentLine[i];
              } else {
                chunk = testChunk;
              }
            }
            currentLine = chunk;
          }
        }
      });
      if (currentLine) {
        lines.push(currentLine);
      }
    });

    return lines;
  }

  // Renders parsed document elements to pdf-lib PDF
  async convertDocxToPdf(docxBlob: Blob, filename: string) {
    await this.initialize();

    // 1. Unzip the completed DOCX template document
    const buffer = await docxBlob.arrayBuffer();
    const zip = new PizZip(buffer);
    const documentXml = zip.file('word/document.xml')?.asText();
    
    if (!documentXml) {
      throw new Error("Unable to extract word/document.xml from generated DOCX file.");
    }

    // 2. Parse sequential document elements (paragraphs and tables)
    const elements = this.parseCompletedXml(documentXml);
    console.log(`PDF EXPORTER: Parse successful - found ${elements.length} elements.`);

    // 3. Render everything onto pages
    this.addNewPage();

    for (const elem of elements) {
      if (elem.type === 'paragraph') {
        const text = elem.text;
        const isHeader = elem.isHeading;
        const size = isHeader ? 12 : 10;
        const font = isHeader ? this.boldFont : (elem.isBold ? this.boldFont : this.currentFont);
        const color = isHeader ? rgb(0.1, 0.1, 0.4) : rgb(0.05, 0.05, 0.05);
        const lineSpacing = size * 1.35;

        // Wrap the standard lines
        const wrappedLines = this.wrapText(text, font, size, this.contentWidth);
        const totalHeightNeeded = wrappedLines.length * lineSpacing + 10;

        // If paragraph doesn't fit on this page, push to next
        if (this.currentY - totalHeightNeeded < this.bottomMargin) {
          this.addNewPage();
        }

        // Draw subtitle line accent for major titles
        if (isHeader && text.includes('EXPERIMENT') && this.currentY > 700) {
          this.currentY -= 5;
        }

        wrappedLines.forEach(line => {
          this.curPage.drawText(line, {
            x: this.margin,
            y: this.currentY,
            size: size,
            font: font,
            color: color,
          });
          this.currentY -= lineSpacing;
        });

        this.currentY -= 6; // paragraph Margin-bottom
      } 
      else if (elem.type === 'table') {
        const headers = elem.headers;
        const rows = elem.rows;
        const colCount = headers.length;

        if (colCount === 0) continue;

        // Auto-allocate columns widths proportionally
        const colWidths: number[] = [];
        let remainingWidth = this.contentWidth;
        
        headers.forEach((h, i) => {
          const lH = h.toLowerCase();
          if (lH.includes('s.no') || lH.includes('sl.no') || lH === 'no' || (lH.includes('s') && lH.includes('no'))) {
            colWidths[i] = 35; // Fine-grained S.No index column width
          } else if (lH.includes('qty') || lH.includes('quantity')) {
            colWidths[i] = 35;
          } else if (lH.includes('remark') || lH.includes('status') || lH.includes('comment')) {
            colWidths[i] = 110;
          } else {
            colWidths[i] = 0; // mark for auto
          }
          if (colWidths[i] > 0) remainingWidth -= colWidths[i];
        });

        const autoCount = colWidths.filter(w => w === 0).length;
        if (autoCount > 0) {
          const autoWidth = remainingWidth / autoCount;
          headers.forEach((_, i) => {
            if (colWidths[i] === 0) colWidths[i] = autoWidth;
          });
        } else {
          // Fallback to equal widths if weird sizing is present
          const equalWidth = this.contentWidth / colCount;
          headers.forEach((_, i) => colWidths[i] = equalWidth);
        }

        // Ensure every column has a stable minimum width and no NaN/falsy values
        for (let i = 0; i < colCount; i++) {
          const w = colWidths[i];
          if (typeof w !== 'number' || isNaN(w) || w <= 0) {
            colWidths[i] = this.contentWidth / colCount;
          }
          // Enforce absolute minimum column width to prevent text-wrapping crashes
          colWidths[i] = Math.max(25, colWidths[i]);
        }

        const fontSize = 8.5; // Compact legible padding inside cells
        const padding = 5;
        const headerFont = this.boldFont;
        const rowFont = this.currentFont;

        // Draw Header row first
        // Check text wraps in header to pre-calculate rowHeight
        const wrappedHeaders = headers.map((h, i) => {
          const colW = colWidths[i] || (this.contentWidth / colCount) || 50;
          return this.wrapText(h, headerFont, fontSize, Math.max(10, colW - padding * 2));
        });
        const maxHeaderLines = Math.max(...wrappedHeaders.map(wl => wl.length), 1);
        const headerRowHeight = maxHeaderLines * (fontSize * 1.2) + padding * 2;

        if (this.currentY - headerRowHeight < this.bottomMargin) {
          this.addNewPage();
        }

        // Draw Header cell backgrounds (light gray)
        let curX = this.margin;
        this.curPage.drawRectangle({
          x: curX,
          y: this.currentY - headerRowHeight,
          width: this.contentWidth,
          height: headerRowHeight,
          color: rgb(0.93, 0.94, 0.96),
        });

        // Write header text & cell grid border lines
        curX = this.margin;
        wrappedHeaders.forEach((lines, colIdx) => {
          let lineY = this.currentY - padding - fontSize;
          lines.forEach(line => {
            this.curPage.drawText(line, {
              x: curX + padding,
              y: lineY,
              size: fontSize,
              font: headerFont,
              color: rgb(0.1, 0.1, 0.2),
            });
            lineY -= fontSize * 1.2;
          });

          // Draw cell separation line
          this.curPage.drawLine({
            start: { x: curX, y: this.currentY },
            end: { x: curX, y: this.currentY - headerRowHeight },
            thickness: 0.5,
            color: rgb(0.75, 0.75, 0.8),
          });
          
          const colW = colWidths[colIdx] || (this.contentWidth / colCount) || 50;
          curX += colW;
        });

        // Draw final right border of header
        this.curPage.drawLine({
          start: { x: curX, y: this.currentY },
          end: { x: curX, y: this.currentY - headerRowHeight },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.8),
        });

        // Draw top & bottom borders of header row
        this.curPage.drawLine({
          start: { x: this.margin, y: this.currentY },
          end: { x: this.margin + this.contentWidth, y: this.currentY },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.8),
        });
        this.curPage.drawLine({
          start: { x: this.margin, y: this.currentY - headerRowHeight },
          end: { x: this.margin + this.contentWidth, y: this.currentY - headerRowHeight },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.8),
        });

        this.currentY -= headerRowHeight;

        // Draw rows
        for (const row of rows) {
          // Normalize row cells to match the exact column count of the header
          const safeCells: string[] = [];
          for (let i = 0; i < colCount; i++) {
            safeCells.push(row[i] !== undefined ? row[i] : "");
          }

          const wrappedRowCells = safeCells.map((cellText, i) => {
            const colW = colWidths[i] || (this.contentWidth / colCount) || 50;
            return this.wrapText(cellText, rowFont, fontSize, Math.max(10, colW - padding * 2));
          });
          const maxCellLines = Math.max(...wrappedRowCells.map(wl => wl.length), 1);
          const rowHeight = Math.max(18, maxCellLines * (fontSize * 1.2) + padding * 2);

          if (this.currentY - rowHeight < this.bottomMargin) {
            this.addNewPage();
            
            // Re-draw Header on new page for better continuity of large tables
            let newX = this.margin;
            this.curPage.drawRectangle({
              x: newX,
              y: this.currentY - headerRowHeight,
              width: this.contentWidth,
              height: headerRowHeight,
              color: rgb(0.93, 0.94, 0.96),
            });

            wrappedHeaders.forEach((lines, colIdx) => {
              let lineY = this.currentY - padding - fontSize;
              lines.forEach(line => {
                this.curPage.drawText(line, {
                  x: newX + padding,
                  y: lineY,
                  size: fontSize,
                  font: headerFont,
                  color: rgb(0.1, 0.1, 0.2),
                });
                lineY -= fontSize * 1.2;
              });

              this.curPage.drawLine({
                start: { x: newX, y: this.currentY },
                end: { x: newX, y: this.currentY - headerRowHeight },
                thickness: 0.5,
                color: rgb(0.75, 0.75, 0.8),
              });
              
              const colW = colWidths[colIdx] || (this.contentWidth / colCount) || 50;
              newX += colW;
            });

            this.curPage.drawLine({
              start: { x: newX, y: this.currentY },
              end: { x: newX, y: this.currentY - headerRowHeight },
              thickness: 0.5,
              color: rgb(0.75, 0.75, 0.8),
            });

            this.curPage.drawLine({
              start: { x: this.margin, y: this.currentY },
              end: { x: this.margin + this.contentWidth, y: this.currentY },
              thickness: 0.5,
              color: rgb(0.75, 0.75, 0.8),
            });
            this.curPage.drawLine({
              start: { x: this.margin, y: this.currentY - headerRowHeight },
              end: { x: this.margin + this.contentWidth, y: this.currentY - headerRowHeight },
              thickness: 0.5,
              color: rgb(0.75, 0.75, 0.8),
            });

            this.currentY -= headerRowHeight;
          }

          // Draw Row Borders & Cells
          let cellX = this.margin;
          wrappedRowCells.forEach((lines, colIdx) => {
            let lineY = this.currentY - padding - fontSize;
            lines.forEach(line => {
              this.curPage.drawText(line, {
                x: cellX + padding,
                y: lineY,
                size: fontSize,
                font: rowFont,
                color: rgb(0.15, 0.15, 0.15),
              });
              lineY -= fontSize * 1.2;
            });

            // Vertical line
            this.curPage.drawLine({
              start: { x: cellX, y: this.currentY },
              end: { x: cellX, y: this.currentY - rowHeight },
              thickness: 0.5,
              color: rgb(0.82, 0.82, 0.86),
            });
            
            const colW = colWidths[colIdx] || (this.contentWidth / colCount) || 50;
            cellX += colW;
          });

          // Final right vertical line
          this.curPage.drawLine({
            start: { x: cellX, y: this.currentY },
            end: { x: cellX, y: this.currentY - rowHeight },
            thickness: 0.5,
            color: rgb(0.82, 0.82, 0.86),
          });

          // Draw bottom horizontal line for the row
          this.curPage.drawLine({
            start: { x: this.margin, y: this.currentY - rowHeight },
            end: { x: this.margin + this.contentWidth, y: this.currentY - rowHeight },
            thickness: 0.5,
            color: rgb(0.82, 0.82, 0.86),
          });

          this.currentY -= rowHeight;
        }

        this.currentY -= 12; // Bottom spacer after table
      }
    }

    // Export PDF blob and save
    const pdfBytes = await this.pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    saveAs(pdfBlob, filename);
  }
}

// Global invocation wrapper
export const exportPdf = async (
  docData: DocumentData, 
  formValues: Record<string, any>, 
  setGenerating: (b: boolean) => void,
  existingDocxBlob?: Blob | null
) => {
  setGenerating(true);
  console.log("--- PDF EXPORTER: Starting flow ---");
  
  try {
    let docxBlob: Blob;
    if (existingDocxBlob) {
      docxBlob = existingDocxBlob;
      console.log("PDF EXPORTER: Reusing existing generated DOCX blob.");
    } else {
      // 1. Generate full completed DOCX first using DocumentFiller
      const filler = new DocumentFiller(docData.originalContent as ArrayBuffer);
      await filler.load();
      filler.fill(docData, formValues);
      docxBlob = filler.generate();
    }

    // 2. Convert raw DOCX elements to high-fidelity PDF using PdfConverter
    const converter = new PdfConverter();
    const safeName = docData.name.toLowerCase().replace('.docx', '').replace(/[\s\-_]+/g, '_') + '_completed.pdf';
    
    await converter.convertDocxToPdf(docxBlob, safeName);
    console.log("PDF EXPORTER: PDF file generated and download triggered.");
  } catch (error: any) {
    console.error("PDF EXPORTER CRITICAL ERROR:", error);
    alert("Export to PDF failed. This usually occurs if the underlying DOCX is corrupted or has unparsed custom schemas: " + error.message);
  } finally {
    setGenerating(false);
  }
};
