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
        // Finalize previous section range if it was a paragraph field
        if (currentSection.intent === 'student-fillable') {
          const textFields = currentSection.fields.filter(f => f.mapping?.type === 'paragraph');
          if (textFields.length === 1 && textFields[0].mapping) {
            textFields[0].mapping.endParagraph = paragraphs.indexOf(structuralElements[index - 1] as any);
          }
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

      // CASE A: TABLE SECTIONS (Resources / Observations / Assessment)
      if (node.nodeName === 'w:tbl') {
        const tableIdx = tables.indexOf(node as any);
        
        if (titleLower.includes('resources used')) {
          const trs = getElementsByTagName(node as any, 'tr');
          trs.forEach((tr, rIdx) => {
            const cells = getElementsByTagName(tr, 'tc');
            const rowLabel = cells[1]?.textContent?.trim() || cells[0]?.textContent?.trim() || '';
            const rowLabelLower = rowLabel.toLowerCase();
            const commonLabels = ['operating system', 'programming language', 'sdk', 'libraries', 'hardware', 'simulation'];
            if (commonLabels.some(l => rowLabelLower.includes(l))) {
              currentSection.fields.push({
                id: `res-${tableIdx}-${rIdx}`,
                label: rowLabel,
                type: 'text',
                sectionId: currentSection.id,
                semanticRole: 'resource',
                mapping: { type: 'table-cell', tableIndex: tableIdx, rowIndex: rIdx, cellIndex: 2 }
              });
            }
          });
        } else if (titleLower.includes('observation') || titleLower.includes('result') || titleLower.includes('evaluation')) {
          currentSection.fields.push({
            id: `tbl-${tableIdx}`,
            label: currentSection.title,
            type: 'table',
            sectionId: currentSection.id,
            semanticRole: titleLower.includes('observation') ? 'observation' : 'result',
            headers: [],
            mapping: { type: 'table-cell', tableIndex: tableIdx }
          });
        }
        return;
      }

      // CASE B: PARAGRAPH SECTIONS (Procedure, Results, Conclusion, Interpretation, Comments)
      if (node.nodeName === 'w:p') {
        const pIdx = paragraphs.indexOf(node as any);
        const hasPlaceholder = text.includes('...') || text.includes('___');
        
        // If we found a placeholder and we don't have a paragraph field for this section yet, create one
        const existingTextField = currentSection.fields.find(f => f.mapping?.type === 'paragraph');
        
        if (hasPlaceholder && !existingTextField) {
          const role = titleLower.includes('procedure') ? 'procedure' :
                       titleLower.includes('result') ? 'result' :
                       titleLower.includes('interpretation') ? 'interpretation' :
                       titleLower.includes('conclusion') ? 'conclusion' : undefined;

          currentSection.fields.push({
            id: `text-${pIdx}`,
            label: currentSection.title,
            type: 'textarea',
            sectionId: currentSection.id,
            semanticRole: role as any,
            originalPattern: text.match(/\.{5,}|_{5,}/)?.[0],
            mapping: {
              type: 'paragraph',
              startParagraph: pIdx,
              // endParagraph will be filled when next section starts or loop ends
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
