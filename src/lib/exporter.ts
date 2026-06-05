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

    console.log("--- EXPORTER: STARTING SECTION MAPPING VALIDATION ---");
    const mappingsSummary: any[] = [];

    docData.sections.forEach(section => {
      section.fields.forEach(field => {
        const value = formValues[field.id];
        if (!field.mapping || value === undefined || value === null) return;

        const mapping = field.mapping;
        
        mappingsSummary.push({
          section: section.title,
          field: field.label,
          role: field.semanticRole,
          target: mapping.startParagraph !== undefined ? `P:${mapping.startParagraph}-${mapping.endParagraph}` : `T:${mapping.tableIndex}`,
          value: Array.isArray(value) ? `${value.length} items` : (String(value).substring(0, 30) + '...')
        });

        if (mapping.type === 'paragraph' && mapping.startParagraph !== undefined && mapping.endParagraph !== undefined) {
          this.fillTextSection(mapping.startParagraph, mapping.endParagraph, value, field.originalPattern);
        } else if (mapping.type === 'table-cell' && mapping.tableIndex !== undefined && mapping.rowIndex !== undefined && mapping.cellIndex !== undefined) {
          this.injectIntoSpecificCell(mapping.tableIndex, mapping.rowIndex, mapping.cellIndex, value);
        } else if (mapping.type === 'table-cell' && mapping.tableIndex !== undefined) {
          // Fallback for full table replacement if it was a generic 'table' field
          this.injectIntoTable(mapping.tableIndex, value);
        } else if (mapping.type === 'paragraph' && mapping.paragraphIndex !== undefined) {
          this.injectIntoParagraph(mapping.paragraphIndex, value, field.originalPattern);
        }
      });
    });

    console.table(mappingsSummary);
    console.log("--- EXPORTER: SECTION MAPPING VALIDATION COMPLETE ---");
  }

  private fillTextSection(startIdx: number, endIdx: number, value: any, pattern?: string) {
    console.log(`FILLER: Filling Text Section P[${startIdx}-${endIdx}]`);
    const lines = String(value || "").split('\n');
    let currentPIdx = startIdx;

    // We only want to search for the pattern in the FIRST paragraph of the range usually, 
    // or across the whole range if it's a dotted block.
    
    lines.forEach((line, i) => {
      if (currentPIdx <= endIdx) {
        // If it's a dotted line paragraph, we replace the dots. 
        // If it's the first line and we have a pattern, use it.
        const targetP = this.paragraphs[currentPIdx];
        const pText = targetP?.textContent || '';
        const pPattern = pText.match(/\.{5,}|_{5,}/)?.[0] || (i === 0 ? pattern : undefined);

        this.injectIntoParagraph(currentPIdx, line, pPattern);
        currentPIdx++;
      } else {
        // Range exceeded, word naturally expands
        this.appendNewParagraphAfter(currentPIdx - 1, line);
        currentPIdx++;
      }
    });

    // Clear remaining paragraphs in the identified placeholder range
    while (currentPIdx <= endIdx) {
       const targetP = this.paragraphs[currentPIdx];
       const pText = targetP?.textContent || '';
       const pPattern = pText.match(/\.{5,}|_{5,}/)?.[0];
       if (pPattern) {
         this.injectIntoParagraph(currentPIdx, "", pPattern);
       } else {
         // If no dots, maybe it was just extra space? don't clear it if it looks like content
       }
       currentPIdx++;
    }
  }

  private injectIntoSpecificCell(tIdx: number, rIdx: number, cIdx: number, value: any) {
    const tbl = this.tables[tIdx];
    if (!tbl) return;
    const trs = this.getElementsByTagName(tbl, 'tr');
    const tr = trs[rIdx];
    if (!tr) return;
    const tcs = this.getElementsByTagName(tr, 'tc');
    const tc = tcs[cIdx];
    if (!tc) return;

    const tNodes = this.getElementsByTagName(tc, 't');
    if (tNodes.length > 0) {
      // Put text into the first text node found
      tNodes[0].textContent = String(value || "");
      // Preserve existing run style by not overriding it if not needed
      // Clear other text nodes in the cell to avoid duplicates
      for (let i = 1; i < tNodes.length; i++) {
        tNodes[i].textContent = "";
      }
    } else {
      // Only create new structure if cell has no text nodes
      let p = this.getElementsByTagName(tc, 'p')[0];
      if (!p) {
        p = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:p');
        tc.appendChild(p);
      }
      const r = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
      const t = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
      t.setAttribute('xml:space', 'preserve');
      t.textContent = String(value || "");
      r.appendChild(t);
      p.appendChild(r);
      this.applyRunStyle(r);
    }
  }

  private appendNewParagraphAfter(idx: number, value: any) {
    const p = this.paragraphs[idx];
    if (!p) return;
    const newP = p.cloneNode(true) as Element;
    // Clear placeholders
    const ts = this.getElementsByTagName(newP, 't');
    if (ts.length > 0) {
       ts[0].textContent = String(value);
       // Clear others
       for (let i = 1; i < ts.length; i++) ts[i].textContent = '';
    }
    p.parentElement?.insertBefore(newP, p.nextSibling);
  }

  private enforceTimesNewRoman(rPr: Element) {
    let rFonts = this.getElementsByTagName(rPr, 'rFonts')[0];
    if (!rFonts) {
      rFonts = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rFonts');
      rFonts.setAttribute('w:ascii', 'Times New Roman');
      rFonts.setAttribute('w:hAnsi', 'Times New Roman');
      rFonts.setAttribute('w:cs', 'Times New Roman');
      rPr.appendChild(rFonts);
    }
  }

  private injectIntoParagraph(idx: number, value: any, pattern?: string) {
    const p = this.paragraphs[idx];
    if (!p || value === undefined || value === null) return;

    const textValue = String(value);
    const textNodes = this.getElementsByTagName(p, 't');
    const fullText = textNodes.map(n => n.textContent || '').join('');

    if (pattern && fullText.includes(pattern)) {
      // Find the specific node containing the pattern part
      for (const t of textNodes) {
        if (t.textContent?.includes(pattern)) {
          t.textContent = t.textContent.replace(pattern, textValue);
          this.applyRunStyle(t.parentElement);
          return;
        }
      }
      
      // If pattern is split across text nodes (complex case)
      let replaced = false;
      for (const t of textNodes) {
        if (!replaced && (t.textContent?.includes('.') || t.textContent?.includes('_'))) {
          t.textContent = fullText.replace(pattern, textValue);
          this.applyRunStyle(t.parentElement);
          replaced = true;
        } else if (replaced && (t.textContent?.includes('.') || t.textContent?.includes('_'))) {
          t.textContent = '';
        }
      }
    } else {
      // No pattern: Replace entire content while keeping first run's style if possible
      if (textNodes.length > 0) {
        textNodes[0].textContent = textValue;
        this.applyRunStyle(textNodes[0].parentElement);
        for (let i = 1; i < textNodes.length; i++) {
          textNodes[i].textContent = '';
        }
      } else {
        // Build new run if empty
        const r = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
        const t = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
        t.setAttribute('xml:space', 'preserve');
        t.textContent = textValue;
        r.appendChild(t);
        p.appendChild(r);
        this.applyRunStyle(r);
      }
    }
  }

  private applyRunStyle(run: Element | null | undefined) {
    if (!run || (run.nodeName !== 'w:r' && run.nodeName !== 'r')) return;
    let rPr = this.getElementsByTagName(run, 'rPr')[0];
    if (!rPr) {
      rPr = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
      run.insertBefore(rPr, run.firstChild);
    }
    this.enforceTimesNewRoman(rPr);
    
    // Ensure font size if missing (default to 11pt = 22 half-points)
    let sz = this.getElementsByTagName(rPr, 'sz')[0];
    if (!sz) {
      sz = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:sz');
      sz.setAttribute('w:val', '22');
      rPr.appendChild(sz);
    }
    
    // Ensure black color
    let color = this.getElementsByTagName(rPr, 'color')[0];
    if (!color) {
      color = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:color');
      rPr.appendChild(color);
    }
    color.setAttribute('w:val', '000000');
  }

  private replaceParagraphContent(p: Element, value: string) {
    const runs = this.getElementsByTagName(p, 'r');
    let rPr: Element | null = null;
    
    if (runs.length > 0) {
      const existingRPr = this.getElementsByTagName(runs[0], 'rPr')[0];
      if (existingRPr) rPr = existingRPr.cloneNode(true) as Element;
    }

    while (p.firstChild) p.removeChild(p.firstChild);
    
    const newRun = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
    if (!rPr) rPr = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
    this.enforceTimesNewRoman(rPr);
    
    const color = this.getElementsByTagName(rPr, 'color')[0] || this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:color');
    color.setAttribute('w:val', '000000');
    if (!color.parentElement) rPr.appendChild(color);

    newRun.appendChild(rPr);
    
    // Support multi-line by splitting by \n and adding <w:br/>
    const lines = value.split('\n');
    lines.forEach((line, i) => {
      const newText = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
      newText.setAttribute('xml:space', 'preserve');
      newText.textContent = line;
      newRun.appendChild(newText);
      
      if (i < lines.length - 1) {
        const br = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:br');
        newRun.appendChild(br);
      }
    });

    p.appendChild(newRun);
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
          this.replaceParagraphContent(cells[cIdx], String(cellVal || ""));
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

