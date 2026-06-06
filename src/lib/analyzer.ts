/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mammoth from 'mammoth';
import { Section, Field, FieldMapping } from '@/src/types';

export const analyzeDocx = async (arrayBuffer: ArrayBuffer, xmlContent: string): Promise<{ sections: Section[]; html: string }> => {
  const result = await mammoth.convertToHtml({ arrayBuffer });
  
  console.log("--- ANALYZER: Starting Structural Analysis ---");
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

  const getElementsByTagName = (parent: Element | Document, tagName: string) => {
    // Try both with and without prefix for better compatibility
    const results = parent.getElementsByTagName(`w:${tagName}`);
    if (results.length > 0) return Array.from(results);
    return Array.from(parent.getElementsByTagName(tagName));
  };

  const body = getElementsByTagName(xmlDoc, 'body')[0];
  
  if (!body) {
    console.error("ANALYZER ERROR: Could not find w:body in DOCX");
    return { sections: [], html: result.value };
  }

  const sections: Section[] = [];
  // ...
  let currentSection: Section = {
    id: 'root',
    title: 'General Information',
    content: '',
    fields: []
  };

  const normalizeTitle = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/^([ivxlcdm]+|[0-9]+)[\.\s\-]+/i, '') // Remove roman numerals or numbers at start
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  };

  const getSectionRole = (normalizedTitle: string): Field['semanticRole'] => {
    const procedureKeywords = [
      'procedure', 'actual procedure followed', 'methodology', 
      'steps', 'implementation', 'algorithm'
    ];
    const resultsKeywords = [
      'results', 'result', 'outcome', 'findings', 
      'observation', 'observations', 'results observations',
      'results/observations'
    ];
    const interpretationKeywords = [
      'interpretation', 'interpretation of results', 'analysis', 
      'analysis of results', 'discussion', 'inference', 'evaluation'
    ];
    const conclusionKeywords = [
      'conclusion', 'conclusions', 'summary', 'final remarks', 
      'remarks', 'learning outcome'
    ];
    const resourceKeywords = [
      'actual resources used', 'actual resources', 'materials used', 
      'tools used', 'resources used'
    ];

    if (procedureKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'procedure';
    if (resultsKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'result';
    if (interpretationKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'interpretation';
    if (conclusionKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'conclusion';
    if (resourceKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'resource';
    return undefined;
  };

  const isExcluded = (title: string): boolean => {
    const normalized = normalizeTitle(title);
    const keywords = [
      'theory', 'algorithm', 'practical significance', 'safety precautions',
      'references', 'suggested reading', 'further reading', 'assessment scheme', 
      'competency', 'outcomes', 'performance indicators', 'marks obtained',
      'faculty member', 'minimum underpinning theory', 'suggested resources',
      'practicum related questions'
    ];
    
    if (normalized.includes('questions') && (normalized.includes('suggested') || normalized.includes('practicum'))) return true;
    return keywords.some(k => normalized === k || normalized.includes(k));
  };

  const isFacultyAssessment = (title: string): boolean => {
    const normalized = normalizeTitle(title);
    const keywords = ['marks obtained', 'evaluation', 'assessment', 'faculty comments', 'faculty member'];
    return keywords.some(k => normalized.includes(k)) || normalized.includes('faculty');
  };

  const isStudentFillableTitle = (title: string): boolean => {
    const normalized = normalizeTitle(title);
    const role = getSectionRole(normalized);
    const keywords = [
      'to be filled by', 'learner', 'student', 'state the meaning', 
      'draw conclusions', 'if any'
    ];
    return (!!role || keywords.some(k => normalized.includes(k))) && !isExcluded(title);
  };

  const containsPlaceholder = (text: string): boolean => {
    // Unicode-aware placeholder detection: supports normal dots, underscores, dashes AND Unicode ellipsis (...)
    return (
      /^[\s\.\-_…]+$/.test(text) ||
      /[.\-_…]{3,}/.test(text) ||
      /[…]{2,}/.test(text)
    );
  };

  // Get all structural elements with their context
  const structuralElements = Array.from(body.childNodes).filter(node => 
    node.nodeName === 'w:p' || node.nodeName === 'w:tbl'
  );

  const paragraphs = getElementsByTagName(body, 'p');
  const tables = getElementsByTagName(body, 'tbl');
  const processedNodeIndices = new Set<number>();

  let lastSectionHeaderIndex = -1;

  const headerFields: Field[] = [];

  structuralElements.forEach((node, index) => {
    if (processedNodeIndices.has(index)) return;
    
    const text = node.textContent?.trim() || '';
    
    // Standalone Date Field Detection
    if (node.nodeName === 'w:p') {
      const dateMatch = text.match(/Date\s*:\s*([.\-_…]{2,})/i);
      if (dateMatch) {
          const pIdx = paragraphs.indexOf(node as any);
          const pattern = dateMatch[1];
          console.log("DATE FIELD DETECTED", {
            paragraph: pIdx,
            text
          });
          headerFields.push({
            id: "date-field", // Use shared ID for multiple date fields to sync values in UI
            label: "Date",
            type: "text",
            sectionId: "document-header",
            semanticRole: undefined,
            originalPattern: pattern,
            mapping: {
              type: "paragraph",
              startParagraph: pIdx,
              endParagraph: pIdx
            }
          });
          return; // Skip further processing for this paragraph
      }
    }

    // Header Detection & Section Partitioning
    if (node.nodeName === 'w:p') {
      const romanNumeralRegex = /^([IVXLCDM]+)\s+(.+)$/i;
      const isRomanHeader = romanNumeralRegex.test(text);
      const normalizedTitle = normalizeTitle(text);
      
      const isHeader = (
        isStudentFillableTitle(text) || 
        isExcluded(text) ||
        isFacultyAssessment(text) ||
        isRomanHeader
      ) && text.length < 150 && text.length > 2;

      if (isHeader) {
        let intent: Section['intent'] = 'template-static';
        if (isExcluded(text)) intent = 'template-static';
        else if (isFacultyAssessment(text)) intent = 'faculty-evaluation';
        else if (isStudentFillableTitle(text)) intent = 'student-fillable';

        // Finalize previous section range
        if (currentSection.intent === 'student-fillable' || currentSection.intent === 'faculty-evaluation') {
          currentSection.fields.forEach(f => {
            if (f.mapping?.type === 'paragraph' && f.mapping.endParagraph === undefined) {
              // Find the last paragraph index before this header
              let lastPIdx = -1;
              for (let i = index - 1; i >= 0; i--) {
                if (structuralElements[i].nodeName === 'w:p') {
                  lastPIdx = paragraphs.indexOf(structuralElements[i] as any);
                  break;
                }
              }
              f.mapping.endParagraph = lastPIdx >= 0 ? lastPIdx : paragraphs.indexOf(structuralElements[index] as any) - 1;
            }
          });
        }

        if (currentSection.fields.length > 0 || currentSection.id !== 'root') {
          sections.push({ ...currentSection, content: currentSection.content.trim() });
        }

        currentSection = {
          id: `section-${index}`,
          title: text,
          content: '',
          fields: [],
          intent
        };
        lastSectionHeaderIndex = index;
        return;
      }
    }

    // Process content within the current section based on its intent
    if (currentSection.intent === 'student-fillable' || currentSection.intent === 'faculty-evaluation') {
      const normalizedSectionTitle = normalizeTitle(currentSection.title);
      const role = getSectionRole(normalizedSectionTitle);
      
      console.log(`ANALYZER: Processing [${node.nodeName}] in section [${currentSection.title}] (Role: ${role})`);

      // CASE A: TABLE SECTIONS
      if (node.nodeName === 'w:tbl') {
        const tableIdx = tables.indexOf(node as any);
        const trs = getElementsByTagName(node as any, 'tr');
        
        if (trs.length > 0) {
          const headerCells = getElementsByTagName(trs[0], 'tc');
          const headers = headerCells.map(c => c.textContent?.trim() || '');
          
          // Identify label columns (usually first 1 or 2)
          const metadataKeywords = [
            's.no', 's no', 'serial no', 'serial number', 
            'sl.no', 'sl no', '#', 'no'
          ];
          
          const labelColIndices = headers.map((h, j) => {
            const hj = h.toLowerCase().trim();
            if (metadataKeywords.some(mw => hj === mw || (hj.includes(mw) && hj.length < 5))) return j;
            return -1;
          }).filter(j => j !== -1);

          // If no obvious label column, default to the first one as a fallback for row identification
          const finalLabelColIndices = labelColIndices.length > 0 ? labelColIndices : [0];
          
          const studentInputKeywords = [
            'name', 'student', 'register', 'roll', 'id', 'version', 
            'configuration', 'remarks', 'quantity', 'output', 'result', 
            'observation', 'value', 'actual', 'specification', 'comments'
          ];

          const tableRows: NonNullable<Field['tableRows']> = [];

          trs.forEach((tr, rIdx) => {
            const cells = getElementsByTagName(tr, 'tc');
            const row: typeof tableRows[0] = {
              isHeader: rIdx === 0,
              cells: cells.map((cell, cIdx) => {
                const headerName = headers[cIdx] || `Column ${cIdx + 1}`;
                const hl = headerName.toLowerCase();
                const cellText = cell.textContent?.trim() || '';
                
                const isFillableHeader = studentInputKeywords.some(sk => hl.includes(sk));
                const isCellBlank = cellText === '';
                const isMetadata = finalLabelColIndices.includes(cIdx);
                const isEditable = !isMetadata && (isFillableHeader || isCellBlank);
                
                if (rIdx === 0) {
                  console.log({
                    header: headerName,
                    isMetadata,
                    isEditable: isFillableHeader // Potential to be editable in rows
                  });
                }
                
                return {
                  text: cellText,
                  columnHeader: headerName,
                  isEditable
                };
              })
            };
            tableRows.push(row);
          });

          currentSection.fields.push({
            id: `table_${tableIdx}`,
            label: role === 'resource' ? 'Equipment & Softwares' : 'Data Table',
            type: 'table',
            sectionId: currentSection.id,
            semanticRole: role,
            headers,
            tableRows,
            defaultValue: tableRows.map(row => row.cells.map(cell => cell.text)),
            mapping: { 
              type: 'table-cell', 
              tableIndex: tableIdx 
            }
          });

          console.log(`ANALYZER: Added table field table_${tableIdx} with ${tableRows.length} rows`);
        }
        return;
      }

      // CASE B: PARAGRAPH SECTIONS (Procedure, Results, Conclusion, Interpretation, Comments)
      if (node.nodeName === 'w:p') {
        const pIdx = paragraphs.indexOf(node as any);
        // Improved Placeholder Detection regex per requirements
        const hasPlaceholder = containsPlaceholder(text);
        const isDotsOnly = /^[\s\.\-_…]+$/.test(text);
        const numberingMatch = text.match(/^(\s*\d+[\.\)]|\s*[a-zA-Z][\.\)]|\s*●|\s*-)\s*(.*)$/);
        
        console.log({
          section: currentSection.title,
          paragraph: pIdx,
          text: text.substring(0, 30),
          containsPlaceholder: hasPlaceholder
        });

        // Check if we are currently finishing a range
        const lastField = currentSection.fields[currentSection.fields.length - 1];
        const isContinuingRange = lastField && lastField.mapping?.type === 'paragraph' && lastField.mapping.endParagraph === undefined;

        // Numbered response area detection: 1. .......
        const isNumberedPlaceholder = numberingMatch && hasPlaceholder;

        if (isNumberedPlaceholder) {
          if (isContinuingRange && lastField) {
            lastField.mapping!.endParagraph = pIdx - 1;
          }

          currentSection.fields.push({
            id: `para-${pIdx}`,
            label: `${currentSection.title} (${numberingMatch[1].trim()})`,
            type: 'textarea',
            sectionId: currentSection.id,
            semanticRole: (role || 'interpretation') as any,
            originalPattern: text.match(/[.\-_…]{2,}/)?.[0],
            mapping: {
              type: 'paragraph',
              startParagraph: pIdx,
              placeholderParagraphs: [pIdx]
            }
          });
          console.log(`ANALYZER: Split detected - New numbered placeholder at P[${pIdx}]`);
          return;
        }

        if (hasPlaceholder) {
          if (!isContinuingRange) {
             // New standalone dots field
             currentSection.fields.push({
               id: `para-${pIdx}`,
               label: currentSection.title,
               type: 'textarea',
               sectionId: currentSection.id,
               semanticRole: (role || 'interpretation') as any,
               originalPattern: text.match(/[.\-_…]{2,}/)?.[0],
               mapping: {
                 type: 'paragraph',
                 startParagraph: pIdx,
                 placeholderParagraphs: [pIdx]
               }
             });
             console.log(`ANALYZER: New placeholder block started at P[${pIdx}]`);
          } else if (isDotsOnly) {
             // Dotted line continuation - explicitly logging context
             if (lastField.mapping?.placeholderParagraphs) {
               lastField.mapping.placeholderParagraphs.push(pIdx);
             }
             console.log(`ANALYZER: Extending field [${lastField.label}] with dots at P[${pIdx}]`);
          }
        } else if (text !== '' && isContinuingRange) {
          // Non-empty, non-placeholder text ends the current block
          lastField.mapping!.endParagraph = pIdx - 1;
          console.log(`ANALYZER: Finalized field [${lastField.label}] at P[${pIdx-1}] due to static text`);
        }
        return;
      }
    }
    
    currentSection.content += text + '\n';
  });

  // Final range check for the very last section
  if (currentSection.intent === 'student-fillable' || currentSection.intent === 'faculty-evaluation') {
    currentSection.fields.forEach(f => {
      if (f.mapping?.type === 'paragraph' && f.mapping.endParagraph === undefined) {
        f.mapping.endParagraph = paragraphs.length - 1;
      }
    });
  }

  if (currentSection.fields.length > 0 || currentSection.id !== 'root') {
    sections.push({ ...currentSection, content: currentSection.content.trim() });
  }

  // Prepend Document Header if global header fields were detected
  if (headerFields.length > 0) {
    sections.unshift({
      id: 'document-header',
      title: 'Document Header',
      content: '',
      fields: headerFields,
      intent: 'template-static'
    });
  }

  console.log("FINAL SECTIONS", sections.map(s => s.title));

  // Refine sections and only keep those that are truly student-fillable
  const finalizedSections = sections.filter(s => {
    const normalizedTitle = normalizeTitle(s.title);
    const role = getSectionRole(normalizedTitle);
    const isActuallyExcluded = isExcluded(s.title);
    const hasFields = s.fields.length > 0;
    
    if (isActuallyExcluded) {
      console.log({
        title: s.title,
        normalizedTitle,
        role,
        fields: s.fields.length,
        kept: false,
        reason: 'Strictly excluded'
      });
      return false;
    }

    // Keep if we already detected fields (table or paragraph)
    if (hasFields) {
      console.log({
        title: s.title,
        normalizedTitle,
        role,
        fields: s.fields.length,
        kept: true,
        reason: 'Already has fields'
      });
      return true;
    }

    // Check for strong signals of being fillable
    const hasInstructions = s.title.toLowerCase().includes('to be filled by') || 
                           s.content.toLowerCase().includes('to be filled by') ||
                           s.title.toLowerCase().includes('state the meaning') ||
                           s.title.toLowerCase().includes('draw conclusions');
                           
    const hasPlaceholders = s.content.includes('..........') || 
                           s.content.includes('—————') || 
                           s.content.includes('_____') ||
                           s.content.includes('……');

    const shouldKeep = (s.intent === 'student-fillable' || !!role) && (hasInstructions || hasPlaceholders);
    
    console.log({
      title: s.title,
      normalizedTitle,
      role,
      fields: s.fields.length,
      kept: shouldKeep,
      reason: shouldKeep ? 'Fillable signals (fallback will apply)' : 'No fillable signals'
    });
    
    return shouldKeep;
  }).map(s => {
    const normalized = normalizeTitle(s.title);
    const role = getSectionRole(normalized);

    // Fallback Rule: Ensure learner sections ALWAYS have at least one field if they passed the filter
    if (s.fields.length === 0) {
      const headerIdx = parseInt(s.id.split('-')[1]);
      const headerPIdx = paragraphs.indexOf(structuralElements[headerIdx] as any);
      const startPIdx = headerPIdx !== -1 ? headerPIdx + 1 : 0;

      console.log(`[ANALYZER] Fallback logic applied for section: ${s.title}, starting at P: ${startPIdx}`);
      
      s.fields.push({
        id: `field-fallback-${s.id}`,
        label: s.title,
        type: 'textarea',
        sectionId: s.id,
        semanticRole: role || 'result',
        mapping: {
          type: 'paragraph',
          startParagraph: startPIdx,
          endParagraph: startPIdx,
          placeholderParagraphs: [startPIdx]
        }
      });
    }

    s.fields = s.fields.map(f => {
      if (f.type === 'table') {
        const tableIdx = f.mapping?.tableIndex;
        if (tableIdx !== undefined && tables[tableIdx]) {
          const trs = getElementsByTagName(tables[tableIdx], 'tr');
          if (trs[0]) {
            const headerCells = getElementsByTagName(trs[0], 'tc');
            f.headers = headerCells.map(c => c.textContent?.trim() || '');
          }
        }
      }
      return f;
    });
    return s;
  });

  return { sections: finalizedSections, html: result.value };
};

const detectFieldsInLine = (line: string, sectionId: string, startIndex: number): Field[] => {
  const fields: Field[] = [];
  
  // Pattern detection for placeholders
  const dotsPattern = /\.{10,}/g;
  const underscoresPattern = /_{10,}/g;
  
  let match;
  while ((match = dotsPattern.exec(line)) !== null) {
    fields.push({
      id: `field-${sectionId}-dot-${startIndex + fields.length}`,
      label: 'Specific Entry',
      type: 'text',
      sectionId: sectionId,
      placeholder: 'Fill in...',
      originalPattern: match[0]
    });
  }

  while ((match = underscoresPattern.exec(line)) !== null) {
    fields.push({
      id: `field-${sectionId}-under-${startIndex + fields.length}`,
      label: 'Missing Detail',
      type: 'text',
      sectionId: sectionId,
      placeholder: 'Enter text...',
      originalPattern: match[0]
    });
  }

  return fields;
};
