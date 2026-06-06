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

    const initialPCount = this.paragraphs.length;
    console.log("--- EXPORTER: STARTING SECTION MAPPING VALIDATION ---");
    const mappingsSummary: any[] = [];

    docData.sections.forEach(section => {
      console.log("FIELD COUNT", section.title, section.fields.length);
      section.fields.forEach(field => {
        const value = formValues[field.id];
        
        // Log every field value before processing
        console.log("================================");
        console.log("FIELD:", field.label);
        console.log("VALUE:", value);
        console.log("MAPPING:", JSON.stringify(field.mapping, null, 2));
        console.log("================================");
        
        if (!field.mapping || value === undefined || value === null) {
          console.log(`[SKIP FIELD] ${field.id}: No mapping or value`);
          return;
        }

        // Validate values against dangerous types
        if (typeof value === 'object' && !Array.isArray(value)) {
            console.warn(`[VALIDATE WARNING] Field ${field.id} has object value. Possible corruption risk:`, value);
        }

        const mapping = field.mapping;
        const safeVal = this.safeString(value);
        
        mappingsSummary.push({
          section: section.title,
          field: field.label,
          role: field.semanticRole,
          target: mapping.startParagraph !== undefined ? `P:${mapping.startParagraph}-${mapping.endParagraph}` : `T:${mapping.tableIndex}`,
          value: Array.isArray(value) ? `${value.length} items` : (safeVal.substring(0, 30) + (safeVal.length > 30 ? '...' : ''))
        });

        try {
          if (mapping.type === 'paragraph') {
            const start = mapping.startParagraph ?? mapping.paragraphIndex;
            const end = mapping.endParagraph ?? mapping.startParagraph ?? mapping.paragraphIndex;
            
            if (start !== undefined) {
              console.log(`[CALL] fillTextSection range [${start}-${end}] for ${field.label}`);
              this.fillTextSection(start, end, value, field.originalPattern, mapping.placeholderParagraphs);
            } else {
              console.warn(`[SKIP FIELD] ${field.id}: Paragraph mapping has no index`, mapping);
            }
          } else if (mapping.type === 'table-cell' && mapping.tableIndex !== undefined && mapping.rowIndex !== undefined && mapping.cellIndex !== undefined) {
            this.injectIntoSpecificCell(mapping.tableIndex, mapping.rowIndex, mapping.cellIndex, value);
          } else if (mapping.type === 'table-cell' && mapping.tableIndex !== undefined) {
            this.injectIntoTable(mapping.tableIndex, value);
          }
        } catch (err) {
          console.error(`[FIELD EXPORT ERROR] Failed to inject field ${field.id}:`, err);
        }
      });
    });

    console.table(mappingsSummary);
    
    // Final structural validation
    const currentPs = this.getElementsByTagName(this.body as Element, 'p');
    if (currentPs.length > initialPCount) {
       console.error(`PARAGRAPH_STRUCTURE_CORRUPTED: Count increased from ${initialPCount} to ${currentPs.length}`);
       // We don't throw here to allow recovery, but we log the warning
    }

    // FINAL CONTENT VALIDATION
    const finalXml = new XMLSerializer().serializeToString(this.xmlDoc);
    if (finalXml.includes("[object Object]")) {
       console.error("CRITICAL ERROR: Generated document contains serialized '[object Object]' strings!");
    }

    const unreplacedMatch = finalXml.match(/[.]{5,}|[_]{5,}|[…]{3,}/);
    if (unreplacedMatch) {
       console.error("EXPORT WARNING: Unreplaced placeholders detected.", unreplacedMatch[0]);
       this.paragraphs.forEach((p, i) => {
          if (/[.]{5,}|[_]{5,}|[…]{3,}/.test(p.textContent || "")) {
             // console.warn(`UNREPLACED_PLACEHOLDER_FOUND at P[${i}]`);
          }
       });
    }

    console.log("--- EXPORTER: SECTION MAPPING VALIDATION COMPLETE ---");
  }

  private safeString(val: any): string {
    if (val === undefined || val === null) return "";
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        // If it's a 1D array of strings, join them with line breaks or commas
        return val.filter(v => v !== undefined && v !== null).map(v => this.safeString(v)).join("\n");
      }
      return ""; // Protect against [object Object]
    }
    const s = String(val);
    if (s === "[object Object]") return "";
    return s;
  }

  private removeLeadingNumbering(text: string): string {
    // Detects common numbering patterns: 1., 1), a., a), I., i), etc.
    return text.replace(
      /^\s*(\d+[\.\)]|[a-zA-Z][\.\)]|[IVXLCDM]+[\.\)])\s*/i,
      ''
    );
  }

  private fillTextSection(startIdx: number, endIdx: number, value: any, pattern?: string, placeholderIdxs?: number[]) {
    const text = this.safeString(value);
    
    // Parse user content into clean items
    const rawLines = text.split(/\n/g).map(l => l.trim()).filter(l => !!l);
    const anyNumbered = rawLines.some(line => /^\s*(\d+[\.\)]|[a-zA-Z][\.\)]|[IVXLCDM]+[\.\)])\s*/i.test(line));
    
    const items: string[] = [];
    if (!anyNumbered) {
      // Style B: Every non-empty line is a new item if no numbers are detected anywhere
      rawLines.forEach(line => items.push(line));
    } else {
      // Style A: Numbering detected, group unnumbered lines with the preceding numbered line
      rawLines.forEach(line => {
        const hasNumbering = /^\s*(\d+[\.\)]|[a-zA-Z][\.\)]|[IVXLCDM]+[\.\)])\s*/i.test(line);
        if (hasNumbering || items.length === 0) {
          items.push(this.removeLeadingNumbering(line));
        } else {
          // Append to previous item if it's a continuation line (doesn't start with a number)
          items[items.length - 1] += "\n" + line;
        }
      });
    }

    console.log(`[DETERMINISTIC EXPORT] Field Range: P[${startIdx}-${endIdx}], Item count: ${items.length}, Placeholders: ${placeholderIdxs?.length || 0}`);

    if (placeholderIdxs && placeholderIdxs.length > 0) {
      const placeholderElements = placeholderIdxs
        .map(idx => this.paragraphs[idx])
        .filter(p => !!p && !!p.parentElement);

      if (placeholderElements.length > 0) {
        // Categorize placeholders: numbered anchors vs pure dots
        const anchors = placeholderElements.filter(p => {
           const content = p.textContent || "";
           return /^\s*(\d+[\.\)]|[a-zA-Z][\.\)]|[IVXLCDM]+[\.\)])/i.test(content);
        });
        
        // If no numbered anchors found, treat the first block as the primary anchor
        const targetAnchors = anchors.length > 0 ? anchors : [placeholderElements[0]];
        const continuationDots = placeholderElements.filter(p => !targetAnchors.includes(p));

        console.log({
          items: items.length,
          anchors: targetAnchors.length,
          continuationDots: continuationDots.length
        });

        // Map items to anchors
        let insertionPoint = targetAnchors[targetAnchors.length - 1];
        items.forEach((item, i) => {
          if (i < targetAnchors.length) {
            // Fill existing anchor
            this.replaceParagraphContent(targetAnchors[i], item);
          } else {
            // Append new paragraphs after the LAST injected paragraph to maintain order
            const newP = insertionPoint.cloneNode(true) as Element;
            this.replaceParagraphContent(newP, item);
            insertionPoint.parentElement!.insertBefore(newP, insertionPoint.nextSibling);
            insertionPoint = newP; // Move the insertion point forward
          }
        });

        // CLEAN-UP: Clear any unused anchors or dots
        if (items.length < targetAnchors.length) {
          for (let i = items.length; i < targetAnchors.length; i++) {
            const extraAnchor = targetAnchors[i];
            if (extraAnchor.parentElement) {
              console.log("REMOVING UNUSED ANCHOR:", extraAnchor.textContent);
              extraAnchor.parentElement.removeChild(extraAnchor);
            }
          }
        }

        // Always remove continuation dots in the deterministic path as they clutter the output
        continuationDots.forEach(p => {
          if (p.parentElement) {
            console.log("REMOVING CONTINUATION DOTS:", p.textContent);
            p.parentElement.removeChild(p);
          }
        });

        console.log(`DETERMINISTIC REPLACE COMPLETE: Filled ${items.length} items.`);
        return;
      }
    }

    // FALLBACK PATH (Heuristic discovery)
    // Identification regex for placeholders
    const placeholderRegex = /[.\-_…]{3,}/;
    const cleanupPattern = /^[.\-_…·•\s]*$/;
    
    // Find the primary target paragraph (anchor)
    let targetIdx = -1;
    for (let i = startIdx; i <= endIdx; i++) {
      const p = this.paragraphs[i];
      if (!p) continue;
      const content = p.textContent || "";
      if (placeholderRegex.test(content) || (pattern && content.includes(pattern))) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx === -1) {
       console.warn("No placeholder found in heuristic range", startIdx, endIdx);
       return;
    }

    const targetP = this.paragraphs[targetIdx];
    if (targetP) {
      const pText = targetP.textContent || "";
      const dotsPattern = pText.match(/[.\-_…]{3,}/)?.[0] || pattern;
      this.injectIntoParagraph(targetIdx, text, dotsPattern);
    }

    // CLEANUP PASS: Remove ALL residual placeholder paragraphs in the range
    for (let i = startIdx; i <= endIdx; i++) {
      if (i === targetIdx) continue;
      const p = this.paragraphs[i];
      if (!p || !p.parentElement) continue;

      const content = (p.textContent || "").trim();
      if (cleanupPattern.test(content)) {
        console.log("REMOVING PLACEHOLDER (HEURISTIC):", content);
        p.parentElement.removeChild(p);
      }
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
    const safeVal = this.safeString(value);

    if (tNodes.length > 0) {
      // Robust replacement in cell: try to find dots first
      const fullText = tNodes.map(n => n.textContent || '').join('');
      const dotsPattern = fullText.match(/\.{2,}|_{2,}/)?.[0];
      
      if (dotsPattern) {
         // Replace ALL t nodes content in cell if it's a dotted cell
         tNodes[0].textContent = safeVal;
         for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
      } else {
        // Fallback: clear and replace first node
        tNodes[0].textContent = safeVal;
        for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
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
      t.textContent = safeVal;
      r.appendChild(t);
      p.appendChild(r);
      this.applyRunStyle(r);
    }
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
    console.log(`[CALL] injectIntoParagraph index ${idx} for value: ${this.safeString(value).substring(0, 20)}...`);
    const p = this.paragraphs[idx];
    if (!p || value === undefined || value === null) return;

    const oldText = p.textContent || "";
    const textValue = this.safeString(value);
    const runs = this.getElementsByTagName(p, 'r');
    if (runs.length === 0) {
      // Create a run if none exist
      const newRun = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
      p.appendChild(newRun);
      this.surgicalReplaceInRun(p, newRun, textValue);
      console.log("REPLACED", idx, oldText, p.textContent || "");
      return;
    }

    // 1. Identify the specific placeholder run
    let targetRun: Element | null = null;
    let effectivePattern = pattern;

    for (const r of runs) {
       const rText = this.getElementsByTagName(r, 't').map(n => n.textContent || '').join('');
       const dotsMatch = rText.match(/[.\-_…]{3,}/);
       if ((effectivePattern && rText.includes(effectivePattern)) || dotsMatch) {
          targetRun = r;
          if (!effectivePattern && dotsMatch) effectivePattern = dotsMatch[0];
          break;
       }
    }

    // 2. If no specific placeholder run found, fallback to first non-empty run
    if (!targetRun) targetRun = runs[0];

    // 3. Perform surgical replacement in the target run
    this.surgicalReplaceInRun(p, targetRun, textValue, effectivePattern);

    // 4. Aggressively cleanup ANY other runs in the same paragraph that contain placeholders
    const remainingRunsAfterReplacement = this.getElementsByTagName(p, 'r');
    remainingRunsAfterReplacement.forEach(r => {
       if (r === targetRun) return; // Don't wipe the one we just filled
       const ts = this.getElementsByTagName(r, 't');
       ts.forEach(t => {
          if (t.textContent && /[.\-_…]{3,}/.test(t.textContent)) {
             t.textContent = t.textContent.replace(/[.\-_…]{3,}/g, '');
          }
       });
    });

    console.log("REPLACED", idx, oldText, p.textContent || "");
  }

  private surgicalReplaceInRun(p: Element, oldRun: Element, value: string, pattern?: string) {
    const rTexts = this.getElementsByTagName(oldRun, 't');
    const fullText = rTexts.map(n => n.textContent || '').join('');
    
    // Check if the template text or the paragraph as a whole has numbering
    const hasTemplateNumbering = /^\s*(\d+[\.\)]|[a-zA-Z][\.\)]|[IVXLCDM]+[\.\)])\s*/i.test(p.textContent || "");
    
    const newRun = oldRun.cloneNode(true) as Element;
    
    // Clear all existing text nodes and line breaks in the clone to start fresh
    const nodeNamesToRemove = ['w:t', 't', 'w:br', 'br', 'w:cr', 'cr', 'w:tab', 'tab'];
    Array.from(newRun.childNodes).forEach(node => {
       const name = (node as Element).nodeName;
       // We keep w:rPr to preserve styles
       if (nodeNamesToRemove.includes(name) || nodeNamesToRemove.includes(name.replace('w:', ''))) {
          newRun.removeChild(node);
       }
    });

    const lines = value.split('\n');

    if (pattern && fullText.includes(pattern)) {
       const startIdx = fullText.indexOf(pattern);
       const prefix = fullText.substring(0, startIdx);
       const suffix = fullText.substring(startIdx + pattern.length);

       if (prefix) {
          const t = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
          t.setAttribute('xml:space', 'preserve');
          t.textContent = prefix;
          newRun.appendChild(t);
       }

       lines.forEach((line, i) => {
          const processedLine = hasTemplateNumbering ? this.removeLeadingNumbering(line) : line;
          const t = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
          t.setAttribute('xml:space', 'preserve');
          t.textContent = processedLine;
          newRun.appendChild(t);
          if (i < lines.length - 1) {
             newRun.appendChild(this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:br'));
          }
       });

       if (suffix) {
          const t = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
          t.setAttribute('xml:space', 'preserve');
          t.textContent = suffix;
          newRun.appendChild(t);
       }
    } else {
       // Total replacement within the run
       lines.forEach((line, i) => {
          const processedLine = hasTemplateNumbering ? this.removeLeadingNumbering(line) : line;
          const t = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
          t.setAttribute('xml:space', 'preserve');
          t.textContent = processedLine;
          newRun.appendChild(t);
          if (i < lines.length - 1) {
             newRun.appendChild(this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:br'));
          }
       });
    }

    this.applyRunStyle(newRun);
    
    // Replace old run with the fresh new one
    if (oldRun.parentNode) {
       p.replaceChild(newRun, oldRun);
    } else {
       p.appendChild(newRun);
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

  private replaceCellContent(tc: Element, value: string) {
    let p = this.getElementsByTagName(tc, 'p')[0];
    if (!p) {
      p = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:p');
      tc.appendChild(p);
    }
    this.replaceParagraphContent(p, value);
  }

  private replaceParagraphContent(p: Element, value: string) {
    // Detect numbering in template before replacement
    const templateText = p.textContent || "";
    const hasTemplateNumbering = /^\s*(\d+[\.\)]|[a-zA-Z][\.\)]|[IVXLCDM]+[\.\)])\s*/i.test(templateText);

    // SECURITY: Ensure p is actually a paragraph node, if not find/create one
    if (p.nodeName !== 'w:p' && p.nodeName !== 'p') {
      const existingP = this.getElementsByTagName(p, 'p')[0];
      if (existingP) {
        return this.replaceParagraphContent(existingP, value);
      }
      // If we still don't have a p and this was a tc, we should have used replaceCellContent
    }

    const pPr = this.getElementsByTagName(p, 'pPr')[0];
    const runs = this.getElementsByTagName(p, 'r');
    let rPr: Element | null = null;
    if (runs.length > 0) {
      const existingRPr = this.getElementsByTagName(runs[0], 'rPr')[0];
      if (existingRPr) rPr = existingRPr.cloneNode(true) as Element;
    }

    // Surgical clear: keep pPr, remove others
    Array.from(p.childNodes).forEach(node => {
      const name = (node as Element).nodeName;
      if (name !== 'w:pPr' && name !== 'pPr') {
        p.removeChild(node);
      }
    });

    const newRun = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
    if (!rPr) rPr = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
    this.enforceTimesNewRoman(rPr);
    
    const color = this.getElementsByTagName(rPr, 'color')[0] || this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:color');
    color.setAttribute('w:val', '000000');
    if (!color.parentElement) rPr.appendChild(color);

    newRun.appendChild(rPr);
    
    const lines = value.split('\n');
    lines.forEach((line, i) => {
      const processedLine = hasTemplateNumbering ? this.removeLeadingNumbering(line) : line;
      const newText = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
      newText.setAttribute('xml:space', 'preserve');
      newText.textContent = processedLine;
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
        console.error(`FILLER ERROR: Value for table ${idx} is not an array`, typeof value, value);
        return;
    }

    const trs = this.getElementsByTagName(tbl, 'tr');
    if (trs.length === 0) return;

    const templateHeaders = this.getElementsByTagName(trs[0], 'tc').map(c => c.textContent?.trim() || '');

    // Robustly filter data rows
    const dataRows = value.filter(row => Array.isArray(row) && row.some(cell => cell && String(cell).trim() !== ''));
    
    // If the first row of values matches headers from template, skip it
    const actualDataRows = (dataRows.length > 0 && dataRows[0].every((val: any, i: number) => String(val).trim() === templateHeaders[i]))
      ? dataRows.slice(1)
      : dataRows;

    if (actualDataRows.length === 0) {
        console.log(`FILLER: Table ${idx} has no content to fill (0 data rows found after header filter).`);
        return;
    }

    console.log(`FILLER: Table ${idx} injection starting. Template Rows: ${trs.length}. New Data Rows: ${actualDataRows.length}`);

    // We use the second row as a template for data if possible, else the first
    const templateRow = trs[1] || trs[0];
    
    // CLEAR existing dynamic rows safely using parent approach to avoid corruption in container nodes (like SDT)
    for (let i = trs.length - 1; i > 0; i--) {
        const row = trs[i];
        if (row && row.parentElement) {
            row.parentElement.removeChild(row);
        }
    }

    const grid = this.getElementsByTagName(tbl, 'tblGrid')[0];
    const headerRow = trs[0];

    actualDataRows.forEach((rowData: string[], rIdx: number) => {
      try {
        const newRow = templateRow.cloneNode(true) as Element;
        const cells = this.getElementsByTagName(newRow, 'tc');

        // Style override for visibility
        cells.forEach(cell => {
          let tcPr = this.getElementsByTagName(cell, 'tcPr')[0];
          if (!tcPr) {
            tcPr = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:tcPr');
            cell.insertBefore(tcPr, cell.firstChild);
          }

          const shadingNodes = this.getElementsByTagName(tcPr, 'shd');
          shadingNodes.forEach(s => tcPr.removeChild(s));
          
          const shd = this.xmlDoc!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:shd');
          shd.setAttribute('w:val', 'clear');
          shd.setAttribute('w:color', 'auto');
          shd.setAttribute('w:fill', 'FFFFFF');
          shd.setAttribute('w:themeColor', 'white');
          shd.setAttribute('w:themeFill', 'white');
          tcPr.appendChild(shd);
        });

        rowData.forEach((cellVal, cIdx) => {
          if (cells[cIdx]) {
            const cellText = this.safeString(cellVal);
            this.replaceCellContent(cells[cIdx], cellText);
          }
        });

        // Insert row at the end of the table
        tbl.appendChild(newRow);
      } catch (rowErr) {
        console.error(`FILLER ERROR: Failed to inject row ${rIdx} into table ${idx}:`, rowErr);
      }
    });

    console.log(`FILLER: Table ${idx} injection complete.`);
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
