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
    'References', 'Assessment Scheme', 'Competency', 'Outcomes', 'Resources Required'
  ];

  const studentEntrySections = [
    'Actual Resources Used', 'Actual Procedure Followed', 'Observations',
    'Results', 'Interpretation of Results', 'Conclusions', 'Student Details',
    'Faculty Details', 'Problem-wise Algorithm', 'Summary'
  ];

  // Get all direct structural children of body
  const children = Array.from(body.childNodes).filter(node => 
    node.nodeName === 'w:p' || node.nodeName === 'w:tbl'
  );

  children.forEach((node, index) => {
    const text = node.textContent?.trim() || '';
    
    // Header Detection (w:p usually carries headers)
    if (node.nodeName === 'w:p') {
      const isHeader = (studentEntrySections.some(cs => 
        text.toLowerCase().includes(cs.toLowerCase())
      ) || excludedSections.some(cs => 
        text.toLowerCase().includes(cs.toLowerCase())
      ) || /^[VIX]+\.\s/.test(text) || text.includes('To be filled by student')) && text.length < 150;

      if (isHeader) {
        if (currentSection.fields.length > 0 || currentSection.id !== 'root') {
          sections.push({ ...currentSection, content: currentSection.content.trim() });
        }
        currentSection = {
          id: `section-${index}`,
          title: text,
          content: '',
          fields: []
        };
      } else {
        currentSection.content += text + '\n';
      }

      // Placeholder detection in paragraphs
      const dotsPattern = /\.{10,}/g;
      const underscoresPattern = /_{10,}/g;
      
      const isExcluded = excludedSections.some(es => 
        currentSection.title.toLowerCase().includes(es.toLowerCase())
      );

      if (!isExcluded) {
        let fieldIdx = 0;
        let match;
        while ((match = dotsPattern.exec(text)) !== null) {
          currentSection.fields.push({
            id: `field-${index}-dot-${fieldIdx}`,
            label: 'Fill in details',
            type: 'text',
            sectionId: currentSection.id,
            originalPattern: match[0],
            mapping: {
              type: 'paragraph',
              paragraphIndex: getElementsByTagName(body, 'p').indexOf(node as any)
            }
          });
          fieldIdx++;
        }
      }
    }

    // Table Detection
    if (node.nodeName === 'w:tbl') {
      const prevNode = children[index - 1];
      const prevText = prevNode?.textContent?.toLowerCase() || '';
      console.log(`ANALYZER DEBUG: Evaluating table after paragraph: "${prevText.substring(0, 50)}..."`);
      
      const isExcluded = excludedSections.some(es => 
        currentSection.title.toLowerCase().includes(es.toLowerCase()) || prevText.includes(es.toLowerCase())
      );
      
      const isStudentTarget = studentEntrySections.some(ss => 
        currentSection.title.toLowerCase().includes(ss.toLowerCase()) || 
        prevText.includes(ss.toLowerCase()) ||
        text.toLowerCase().includes(ss.toLowerCase())
      ) || text === '';

      if (!isExcluded && isStudentTarget) {
        const tableIdx = getElementsByTagName(body, 'tbl').indexOf(node as any);
        console.log(`ANALYZER DEBUG: Table matched student target criteria. Assigning index ${tableIdx}`);
        
        // Better label detection from preceding paragraph
        let tableLabel = currentSection.title;
        if (prevText && prevText.length < 100 && (prevText.includes('actual') || prevText.includes('observation') || prevText.includes('resource'))) {
           tableLabel = prevNode?.textContent?.trim() || tableLabel;
        }

        currentSection.fields.push({
          id: `field-tbl-${tableIdx}`,
          label: tableLabel,
          type: 'table',
          sectionId: currentSection.id,
          headers: ['S.No', 'Col 1', 'Col 2', 'Col 3'], // Default, will be normalized
          rows: 4,
          isDynamic: true,
          mapping: {
            type: 'table-cell',
            tableIndex: tableIdx
          }
        });
      }
    }
  });

  if (currentSection.fields.length > 0 || currentSection.id !== 'root') {
    sections.push({ ...currentSection, content: currentSection.content.trim() });
  }

  // Filter and enhance
  const finalizedSections = sections.filter(s => {
    const titleLower = s.title.toLowerCase();
    const isExcluded = excludedSections.some(es => titleLower.includes(es.toLowerCase()));
    
    // Explicitly allow sections that users are likely to fill even if they match excluded keywords but have student markers
    const isStudentTarget = studentEntrySections.some(ss => titleLower.includes(ss.toLowerCase())) || 
                           titleLower.includes('to be filled by student');
    
    return (s.fields.length > 0 && !isExcluded) || isStudentTarget;
  }).map(s => {
    const titleLower = s.title.toLowerCase();
    
    // Normalize headers for specific known sections to ensure UI matches expected lab format
    if (titleLower.includes('resources used')) {
      s.fields = s.fields.map(f => {
        if (f.type === 'table') {
          return { 
            ...f, 
            label: 'Actual Resources Used',
            headers: ['S.No', 'Name of Resource', 'Version / Configuration', 'Remarks'],
            rows: 5 
          };
        }
        return f;
      });
    }
    
    if (titleLower.includes('observations')) {
      s.fields = s.fields.map(f => {
        if (f.type === 'table') {
          return {
            ...f,
            label: 'Observations Table',
            headers: ['S.No', 'Step / Parameter', 'Expected result', 'Actual Result'],
            rows: 5
          };
        }
        return f;
      });
    }
    
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
