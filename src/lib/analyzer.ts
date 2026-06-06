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

  const excludedSections = [
    'Theory', 'Algorithm', 'Algorithms', 'Practical Significance', 'Safety Precautions',
    'References', 'Assessment Scheme', 'Competency', 'Outcomes', 'Resources Required',
    'Suggested Questions'
  ];

  const studentEntrySections = [
    'Actual Resources Used', 'Actual Procedure Followed', 'Observations',
    'Results', 'Interpretation of Results', 'Conclusions', 'Student Details',
    'Faculty Details', 'Problem-wise Algorithm', 'Summary', 'Conclusion', 'Interpretation'
  ];

  const facultyAssessmentSections = [
    'Marks Obtained', 'Faculty Evaluation', 'Assessment Scheme', 'Performance Indicators',
    'Faculty Comments'
  ];

  // Get all structural elements with their context
  const structuralElements = Array.from(body.childNodes).filter(node => 
    node.nodeName === 'w:p' || node.nodeName === 'w:tbl'
  );

  const paragraphs = getElementsByTagName(body, 'p');
  const tables = getElementsByTagName(body, 'tbl');
  const processedNodeIndices = new Set<number>();

  let lastSectionHeaderIndex = -1;

  structuralElements.forEach((node, index) => {
    if (processedNodeIndices.has(index)) return;
    
    const text = node.textContent?.trim() || '';
    const textLower = text.toLowerCase();
    
    // Header Detection & Section Partitioning
    if (node.nodeName === 'w:p') {
      const romanNumeralRegex = /^([IVXLCDM]+)\s+(.+)$/i;
      const isRomanHeader = romanNumeralRegex.test(text);
      const isHeader = (
        studentEntrySections.some(cs => textLower.includes(cs.toLowerCase())) || 
        excludedSections.some(cs => textLower.includes(cs.toLowerCase())) ||
        facultyAssessmentSections.some(cs => textLower.includes(cs.toLowerCase())) ||
        isRomanHeader || 
        text.includes('To be filled by student')
      ) && text.length < 150;

      if (isHeader) {
        console.log("SECTION DETECTED:", text, index);
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
              console.log(`  - Finalized range for ${f.label}: endParagraph=${f.mapping.endParagraph}`);
            }
          });
        }

        if (currentSection.fields.length > 0 || currentSection.id !== 'root') {
          sections.push({ ...currentSection, content: currentSection.content.trim() });
        }

        let intent: Section['intent'] = 'template-static';
        if (
          studentEntrySections.some(ss => textLower.includes(ss.toLowerCase())) || 
          textLower.includes('to be filled by student') ||
          textLower.includes('to be filled by the students') ||
          textLower.includes('to be filled by the learners')
        ) {
          intent = 'student-fillable';
        } else if (facultyAssessmentSections.some(fs => textLower.includes(fs.toLowerCase()))) {
          intent = 'faculty-evaluation';
        }

        console.log('[SECTION]', text, 'intent:', intent);

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
      const titleLower = currentSection.title.toLowerCase();
      
      console.log(`ANALYZER: Processing [${node.nodeName}] in section [${currentSection.title}]`);

      // CASE A: TABLE SECTIONS
      if (node.nodeName === 'w:tbl') {
        const tableIdx = tables.indexOf(node as any);
        const trs = getElementsByTagName(node as any, 'tr');
        
        if (trs.length > 0) {
          const headerCells = getElementsByTagName(trs[0], 'tc');
          const headers = headerCells.map(c => c.textContent?.trim() || '');
          
          // Identify label columns (usually first 1 or 2)
          const metadataKeywords = [
            's.no', 's no', 'serial no', 'sl.no', 'sl no', 'serial number', 
            'name of resource', 'resource name', 'item name', 'name', 
            'description', 'particulars', 'item', 'sno', '#', 'no'
          ];
          
          const labelColIndices = headers.map((h, j) => {
            const hj = h.toLowerCase();
            if (metadataKeywords.some(mw => hj === mw || (hj.includes(mw) && hj.length < 20))) return j;
            return -1;
          }).filter(j => j !== -1);

          // If no obvious label column, default to the first one as a fallback for row identification
          const finalLabelColIndices = labelColIndices.length > 0 ? labelColIndices : [0];
          
          const studentInputKeywords = [
            'specification', 'version', 'configuration', 'quantity', 'remarks', 
            'comments', 'observation', 'result', 'output', 'value', 'register', 'student name', 'actual'
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
                
                return {
                  text: cellText,
                  columnHeader: headerName,
                  isEditable: !isMetadata && (isFillableHeader || isCellBlank)
                };
              })
            };
            tableRows.push(row);
          });

          currentSection.fields.push({
            id: `table_${tableIdx}`,
            label: currentSection.title.includes('Resources') ? 'Equipment & Softwares' : 'Data Table',
            type: 'table',
            sectionId: currentSection.id,
            semanticRole: titleLower.includes('resources') ? 'resource' : undefined,
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
        const isPlaceholder = /^\s*[\.\-_]{5,}\s*$/.test(text) || /^\s*\d+[\.\)]\s*[\.\-_]{3,}\s*$/.test(text) || /[\.\-_]{5,}/.test(text);
        const hasPlaceholder = isPlaceholder;
        const isDotsOnly = /^[\s\.\-_]+$/.test(text);
        const numberingMatch = text.match(/^(\s*\d+[\.\)]|\s*[a-zA-Z][\.\)]|\s*●|\s*-)\s*(.*)$/);
        
        console.log(`[FIELD DETECTION] Section: ${currentSection.title}, P: ${pIdx}, Text: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}", hasPlaceholder: ${hasPlaceholder}`);

        const role = titleLower.includes('procedure') ? 'procedure' :
                     titleLower.includes('result') ? 'result' :
                     titleLower.includes('interpretation') ? 'interpretation' :
                     titleLower.includes('conclusion') ? 'conclusion' : 
                     (titleLower.includes('comment') || titleLower.includes('remark')) ? 'interpretation' : 
                     titleLower.includes('observation') ? 'observation' : undefined;

        // Check if we are currently finishing a range
        const lastField = currentSection.fields[currentSection.fields.length - 1];
        const isContinuingRange = lastField && lastField.mapping?.type === 'paragraph' && lastField.mapping.endParagraph === undefined;

        // CRITICAL FIX: Any numbering in a student-fillable section starts a NEW field 
        // to prevent multiple numbered items from being collapsed into one.
        if (numberingMatch) {
          if (isContinuingRange && lastField) {
            lastField.mapping!.endParagraph = pIdx - 1;
          }

          currentSection.fields.push({
            id: `para-${pIdx}`,
            label: `${currentSection.title} (${numberingMatch[1].trim()})`,
            type: 'textarea',
            sectionId: currentSection.id,
            semanticRole: (role || 'interpretation') as any,
            originalPattern: text.match(/[\.\-_]{2,}/)?.[0],
            mapping: {
              type: 'paragraph',
              startParagraph: pIdx,
            }
          });
          console.log(`ANALYZER: Split detected - New numbered field [${numberingMatch[1].trim()}] at P[${pIdx}]`);
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
               originalPattern: text.match(/[\.\-_]{2,}/)?.[0],
               mapping: {
                 type: 'paragraph',
                 startParagraph: pIdx,
               }
             });
             console.log(`ANALYZER: New placeholder block started at P[${pIdx}]`);
          } else if (isDotsOnly) {
             // Dotted line continuation - explicitly logging context
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

  console.log("FINAL SECTIONS", sections.map(s => s.title));

  // Refine and Normalize headers for tables, and implement FALLBACK RULE for learner sections
  const finalizedSections = sections.filter(s => s.intent === 'student-fillable').map(s => {
    const titleLower = s.title.toLowerCase();
    const learnerSections = /procedure|procedures|observation|observations|result|results|interpretation|conclusion|conclusions/i;

    console.log(`[SECTION] ${s.title} FIELDS: ${s.fields.length}`);

    // Fallback Rule: Ensure learner sections ALWAYS have at least one field
    if (learnerSections.test(titleLower) && s.fields.length === 0) {
      const headerIdx = parseInt(s.id.split('-')[1]);
      const headerPIdx = paragraphs.indexOf(structuralElements[headerIdx] as any);
      const startPIdx = headerPIdx !== -1 ? headerPIdx + 1 : 0;

      console.log(`[ANALYZER] Fallback logic applied for section: ${s.title}, starting at P: ${startPIdx}`);
      
      const isProcedure = titleLower.includes('procedure');
      const isResult = titleLower.includes('result');
      const isInterpretation = titleLower.includes('interpretation');
      const isConclusion = titleLower.includes('conclusion');

      s.fields.push({
        id: `field-fallback-${s.id}`,
        label: s.title,
        type: 'textarea',
        sectionId: s.id,
        semanticRole: isProcedure ? 'procedure' :
                      isResult ? 'result' :
                      isInterpretation ? 'interpretation' :
                      isConclusion ? 'conclusion' : 'observation',
        mapping: {
          type: 'paragraph',
          startParagraph: startPIdx,
          endParagraph: startPIdx + 5 // Arbitrary buffer or end of section would be better
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
