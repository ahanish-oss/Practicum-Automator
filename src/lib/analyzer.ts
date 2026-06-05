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
    'Faculty Details', 'Problem-wise Algorithm', 'Summary'
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
      const isHeader = (
        studentEntrySections.some(cs => textLower.includes(cs.toLowerCase())) || 
        excludedSections.some(cs => textLower.includes(cs.toLowerCase())) ||
        facultyAssessmentSections.some(cs => textLower.includes(cs.toLowerCase())) ||
        /^[VIX]+\.\s/.test(text) || 
        text.includes('To be filled by student')
      ) && text.length < 150;

      if (isHeader) {
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
        if (studentEntrySections.some(ss => textLower.includes(ss.toLowerCase())) || textLower.includes('to be filled by student')) {
          intent = 'student-fillable';
        } else if (facultyAssessmentSections.some(fs => textLower.includes(fs.toLowerCase()))) {
          intent = 'faculty-evaluation';
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

          trs.forEach((tr, rIdx) => {
            if (rIdx === 0) return; // Skip header row
            
            const cells = getElementsByTagName(tr, 'tc');
            
            // Detect editable columns for this row
            const editableForThisRow: number[] = [];
            headers.forEach((h, cIdx) => {
              if (finalLabelColIndices.includes(cIdx)) return; // Skip columns identified as metadata labels
              
              const hl = h.toLowerCase();
              const cellText = cells[cIdx]?.textContent?.trim() || '';
              
              const isFillableHeader = studentInputKeywords.some(sk => hl.includes(sk));
              const isCellBlank = cellText === '';
              
              // Only create field if it's explicitly a fillable header OR if the template cell is empty
              if (isFillableHeader || isCellBlank) {
                editableForThisRow.push(cIdx);
              }
            });

            const rowLabelParts = finalLabelColIndices.map(i => cells[i]?.textContent?.trim()).filter(Boolean);
            const rowLabel = rowLabelParts.join(' - ') || `Row ${rIdx}`;
            
            // Skip rows that don't have a meaningful label (might be empty rows at the end)
            if (!rowLabel || rowLabel === '-') return;

            editableForThisRow.forEach(cIdx => {
              const headerName = headers[cIdx] || `Column ${cIdx + 1}`;
              currentSection.fields.push({
                id: `table_${tableIdx}_row_${rIdx}_col_${cIdx}`,
                label: headerName,
                type: 'text',
                sectionId: currentSection.id,
                semanticRole: titleLower.includes('resources') ? 'resource' : undefined,
                tableId: tableIdx,
                rowId: rIdx,
                colId: cIdx,
                rowLabel: rowLabel,
                mapping: { 
                  type: 'table-cell', 
                  tableIndex: tableIdx, 
                  rowIndex: rIdx, 
                  cellIndex: cIdx 
                }
              });
            });
          });
        }
        return;
      }

      // CASE B: PARAGRAPH SECTIONS (Procedure, Results, Conclusion, Interpretation, Comments)
      if (node.nodeName === 'w:p') {
        const pIdx = paragraphs.indexOf(node as any);
        const hasPlaceholder = /\.{2,}|_{2,}/.test(text); // More forgiving: 2 dots
        
        const role = titleLower.includes('procedure') ? 'procedure' :
                     titleLower.includes('result') ? 'result' :
                     titleLower.includes('interpretation') ? 'interpretation' :
                     titleLower.includes('conclusion') ? 'conclusion' : 
                     (titleLower.includes('comment') || titleLower.includes('remark')) ? 'interpretation' : undefined;

        // If we found a placeholder and we don't have a paragraph field for this section yet, create one
        const existingTextField = currentSection.fields.find(f => f.mapping?.type === 'paragraph');
        
        // Auto-detect if it's a known semantic section even without dots
        const shouldAutoDetect = role !== undefined && !existingTextField && text.length < 50;

        if ((hasPlaceholder || shouldAutoDetect) && !existingTextField) {
          console.log(`    - Creating range-based text field for section ${currentSection.title} (Role: ${role})`);
          currentSection.fields.push({
            id: `text-${pIdx}`,
            label: currentSection.title,
            type: 'textarea',
            sectionId: currentSection.id,
            semanticRole: (role || 'interpretation') as any,
            originalPattern: text.match(/\.{2,}|_{2,}/)?.[0],
            mapping: {
              type: 'paragraph',
              startParagraph: pIdx,
            }
          });
          return;
        }
      }
    }
    
    currentSection.content += text + '\n';
  });

  // Final range check for the very last section
  if (currentSection.intent === 'student-fillable' || currentSection.intent === 'faculty-evaluation') {
    const textFields = currentSection.fields.filter(f => f.mapping?.type === 'paragraph');
    if (textFields.length === 1 && textFields[0].mapping && textFields[0].mapping.endParagraph === undefined) {
      textFields[0].mapping.endParagraph = paragraphs.length - 1;
    }
  }

  if (currentSection.fields.length > 0 || currentSection.id !== 'root') {
    sections.push({ ...currentSection, content: currentSection.content.trim() });
  }

  // Refine and Normalize headers for tables
  const finalizedSections = sections.filter(s => s.intent === 'student-fillable').map(s => {
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
