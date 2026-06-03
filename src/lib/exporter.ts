/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { DocumentData } from '@/src/types';

/**
 * Robust Document Filler class for DOCX templates.
 * Uses a template-based replacement strategy while preserving structural integrity.
 */
export class DocumentFiller {
  private zip: PizZip | null = null;
  private xmlDoc: Document | null = null;
  private body: Element | null = null;
  private paragraphs: Element[] = [];
  private tables: Element[] = [];

  constructor(private arrayBuffer: ArrayBuffer) {}

  /**
   * Loads the document structural model
   */
  async load() {
    console.log("FILLER: Loading structural model...");
    // PizZip is synchronous
    this.zip = new PizZip(this.arrayBuffer);
    const content = this.zip.file('word/document.xml')?.asText();
    
    if (!content) throw new Error("Could not find word/document.xml in template");

    const parser = new DOMParser();
    this.xmlDoc = parser.parseFromString(content, "text/xml");
    
    this.body = this.getElementsByTagName(this.xmlDoc, 'body')[0];
    if (!this.body) throw new Error("Invalid DOCX: Missing body element");

    this.paragraphs = this.getElementsByTagName(this.body, 'p');
    this.tables = this.getElementsByTagName(this.body, 'tbl');
    
    console.log(`FILLER: Map generated - ${this.paragraphs.length} paragraphs, ${this.tables.length} tables`);
  }

  private getElementsByTagName(parent: Element | Document, tagName: string): Element[] {
    const results = parent.getElementsByTagName(`w:${tagName}`);
    if (results.length > 0) return Array.from(results);
    return Array.from(parent.getElementsByTagName(tagName)) as Element[];
  }

  /**
   * Injects form data into the structural model
   */
  fill(docData: DocumentData, formValues: Record<string, any>) {
    if (!this.xmlDoc) throw new Error("Filler not loaded");

    docData.sections.forEach(section => {
      section.fields.forEach(field => {
        const value = formValues[field.id];
        if (!field.mapping) return;

        const mapping = field.mapping;

        if (mapping.type === 'paragraph' && mapping.paragraphIndex !== undefined) {
          this.injectIntoParagraph(mapping.paragraphIndex, value, field.originalPattern);
        } else if (mapping.type === 'table-cell' && mapping.tableIndex !== undefined) {
          this.injectIntoTable(mapping.tableIndex, value);
        }
      });
    });
  }

  private enforceTimesNewRoman(rPr: Element) {
    let rFonts = this.getElementsByTagName(rPr, 'rFonts')[0];
    if (!rFonts) {
      rFonts = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rFonts');
      rPr.appendChild(rFonts);
    }
    rFonts.setAttribute('w:ascii', 'Times New Roman');
    rFonts.setAttribute('w:hAnsi', 'Times New Roman');
    rFonts.setAttribute('w:cs', 'Times New Roman');
  }

  private injectIntoParagraph(idx: number, value: any, pattern?: string) {
    const p = this.paragraphs[idx];
    if (!p || !value) return;

    if (pattern) {
      const textNodes = this.getElementsByTagName(p, 't');
      for (const t of textNodes) {
        if (t.textContent?.includes(pattern)) {
          t.textContent = t.textContent.replace(pattern, String(value));
          
          // Ensure ancestor rPr has Times New Roman
          const run = t.parentElement;
          if (run && run.nodeName.includes('r')) {
            let rPr = this.getElementsByTagName(run, 'rPr')[0];
            if (!rPr) {
              rPr = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
              run.insertBefore(rPr, t);
            }
            this.enforceTimesNewRoman(rPr);
          }
          break;
        }
      }
    } else {
      // Full run replacement logic
      const runs = this.getElementsByTagName(p, 'r');
      if (runs.length > 0) {
        const firstRun = runs[0];
        let rPr = this.getElementsByTagName(firstRun, 'rPr')[0];
        
        while (p.firstChild) p.removeChild(p.firstChild);
        
        const newRun = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
        if (!rPr) {
          rPr = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
        } else {
          rPr = rPr.cloneNode(true) as Element;
        }
        
        this.enforceTimesNewRoman(rPr);
        newRun.appendChild(rPr);
        
        const newText = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
        newText.setAttribute('xml:space', 'preserve');
        newText.textContent = String(value);
        newRun.appendChild(newText);
        p.appendChild(newRun);
      }
    }
  }

  private injectIntoTable(idx: number, value: any) {
    console.log(`FILLER: Attempting to fill table at index ${idx}...`);
    const tbl = this.tables[idx];
    if (!tbl) {
        console.warn(`FILLER: Table at index ${idx} not found in structural model!`);
        return;
    }
    
    if (!Array.isArray(value)) {
        console.warn(`FILLER: Value for table ${idx} is not an array`, value);
        return;
    }

    // Filter out completely empty rows if they are just placeholders
    const dataRows = value.filter(row => row.some(cell => cell && String(cell).trim() !== ''));
    if (dataRows.length === 0) {
        console.log(`FILLER: Table ${idx} has no content to fill.`);
        return;
    }

    const trs = this.getElementsByTagName(tbl, 'tr');
    if (trs.length === 0) return;

    console.log(`FILLER: Table ${idx} found with ${trs.length} existing rows. Data rows to inject: ${dataRows.length}`);

    // We use the second row as a template for data if possible, else the first
    const templateRow = trs[1] || trs[0];
    
    // Clear existing dynamic rows (keep headers)
    for (let i = trs.length - 1; i > 0; i--) {
      tbl.removeChild(trs[i]);
    }

    dataRows.forEach((rowData: string[]) => {
      const newRow = templateRow.cloneNode(true) as Element;
      const cells = this.getElementsByTagName(newRow, 'tc');

      // Style override for visibility (Fixing the "blue" issue)
      cells.forEach(cell => {
        let tcPr = this.getElementsByTagName(cell, 'tcPr')[0];
        if (!tcPr) {
          tcPr = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:tcPr');
          cell.insertBefore(tcPr, cell.firstChild);
        }

        // Deep clearing of all shading/background attributes
        const shadingNodes = this.getElementsByTagName(tcPr, 'shd');
        shadingNodes.forEach(s => tcPr.removeChild(s));
        
        const shd = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:shd');
        shd.setAttribute('w:val', 'clear');
        shd.setAttribute('w:color', 'auto');
        shd.setAttribute('w:fill', 'FFFFFF');
        // Word specific attributes for themes
        shd.setAttribute('w:themeColor', 'white');
        shd.setAttribute('w:themeFill', 'white');
        tcPr.appendChild(shd);
      });

      rowData.forEach((cellVal, cIdx) => {
        if (cells[cIdx]) {
          let t = this.getElementsByTagName(cells[cIdx], 't')[0];
          
          if (!t) {
            // Reconstruct minimal run if missing
            let p = this.getElementsByTagName(cells[cIdx], 'p')[0];
            if (!p) {
              p = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:p');
              cells[cIdx].appendChild(p);
            }
            const r = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
            t = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
            r.appendChild(t);
            p.appendChild(r);
          }

          t.textContent = String(cellVal || "");

          // Force black text color for visibility & Times New Roman
          const run = t.parentElement;
          if (run) {
            let rPr = this.getElementsByTagName(run, 'rPr')[0];
            if (!rPr) {
              rPr = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
              run.insertBefore(rPr, t);
            }
            let color = this.getElementsByTagName(rPr, 'color')[0];
            if (!color) {
              color = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:color');
              rPr.appendChild(color);
            }
            color.setAttribute('w:val', '000000');
            this.enforceTimesNewRoman(rPr);
          }
        }
      });
      tbl.appendChild(newRow);
    });
  }

  /**
   * Finalizes the zip and returns the blob
   */
  generate(): Blob {
    if (!this.xmlDoc || !this.zip) throw new Error("Filler not initialized");
    
    const serializer = new XMLSerializer();
    const newXml = serializer.serializeToString(this.xmlDoc);
    
    // Put modified XML back into the ZIP
    this.zip.file('word/document.xml', newXml);
    
    const result = this.zip.generate({ type: 'blob' });
    return result as Blob;
  }
}

/**
 * Convenience wrapper for the DocumentFiller
 */
export const exportDocx = async (docData: DocumentData, formValues: Record<string, any>) => {
  console.log("--- EXPORTER: Invoking DocumentFiller ---");
  
  try {
    const filler = new DocumentFiller(docData.originalContent as ArrayBuffer);
    await filler.load();
    filler.fill(docData, formValues);
    const blob = filler.generate();
    
    saveAs(blob, `Filled_${docData.name}`);
    console.log("EXPORTER: Download triggered.");
  } catch (error) {
    console.error("EXPORTER CRITICAL ERROR:", error);
    alert("Export failed. This usually happens with corrupted templates or browser XML limitations.");
  }
};

