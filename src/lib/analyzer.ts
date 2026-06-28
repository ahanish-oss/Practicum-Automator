/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mammoth from 'mammoth';
import { Section, Field, FieldMapping } from '@/src/types';
import { getModuleById } from './module-config';

export const analyzeDocx = async (arrayBuffer: ArrayBuffer, xmlContent: string, moduleId: string = 'practicum'): Promise<{ sections: Section[]; html: string }> => {
  const config = getModuleById(moduleId);
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

  const getDirectChildrenByTagName = (parent: Element, tagName: string): Element[] => {
    return Array.from(parent.childNodes).filter(child => {
      const name = child.nodeName;
      return name === tagName || name === `w:${tagName}`;
    }) as Element[];
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
      .replace(/^[\s]*([ivxlcdm]+|[0-9]+)[\.\s\-]+\s*/i, '') // Remove roman numerals or numbers at start
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  };

  const getSectionRole = (normalizedTitle: string): Field['semanticRole'] => {
    const defaultRoleKeywords = {
      procedure: ['procedure', 'actual procedure followed', 'methodology', 'steps', 'implementation', 'algorithm'],
      observation: ['observation', 'observations'],
      result: ['results', 'result', 'outcome', 'findings', 'results observations', 'results/observations'],
      interpretation: ['interpretation', 'interpretation of results', 'meaning of results', 'students to state the meaning', 'analysis', 'discussion', 'inference'],
      conclusion: ['conclusion', 'conclusions', 'students to draw conclusions', 'draw conclusions', 'take decisions', 'take decision', 'learners to draw conclusions', 'final remarks', 'summary'],
      resource_table: ['actual resources used', 'actual resources', 'materials used', 'tools used', 'resources used'],
      student_table: ['filled by student', 'student information', 'student details', 'identity', 'to be filled by student', 'to be filled by the student']
    };

    const moduleKeywords = config?.roleKeywords || {};

    const procedureKeywords = [...(defaultRoleKeywords.procedure), ...(moduleKeywords.procedure || [])];
    const observationKeywords = [...(defaultRoleKeywords.observation), ...(moduleKeywords.observation || [])];
    const resultsKeywords = [...(defaultRoleKeywords.result), ...(moduleKeywords.result || [])];
    const interpretationKeywords = [...(defaultRoleKeywords.interpretation), ...(moduleKeywords.interpretation || [])];
    const conclusionKeywords = [...(defaultRoleKeywords.conclusion), ...(moduleKeywords.conclusion || [])];
    const resourceKeywords = [...(defaultRoleKeywords.resource_table), ...(moduleKeywords.resource_table || [])];
    const studentInfoKeywords = [...(defaultRoleKeywords.student_table), ...(moduleKeywords.student_table || [])];

    if (procedureKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'procedure';
    if (observationKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'observation';
    if (resultsKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'result';
    if (interpretationKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'interpretation';
    if (conclusionKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'conclusion';
    if (resourceKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'resource_table';
    if (studentInfoKeywords.some(k => normalizedTitle === k || normalizedTitle.includes(k))) return 'student_table';
    return undefined;
  };

  const isExcluded = (title: string): boolean => {
    const normalized = normalizeTitle(title);
    const keywords = [
      'theory', 'algorithm', 'practical significance', 'safety precautions',
      'references', 'suggested reading', 'further reading', 'assessment scheme', 
      'competency', 'outcomes', 'performance indicators', 'marks obtained',
      'faculty member', 'minimum underpinning theory', 'suggested resources',
      'practicum related questions', 'practical outcome', 'procedure',
      'relevant co', 'related ado', 'assessment'
    ];
    
    // Specifically protect "Actual" and "Resources Required" sections
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('actual') || lowerTitle.includes('resources required')) return false;

    let result = false;
    if (normalized.includes('questions') && (normalized.includes('suggested') || normalized.includes('practicum'))) result = true;
    else result = keywords.some(k => normalized === k || normalized.includes(k));

    if (result) console.log(`[isExcluded] TRUE for: "${title}" (Normalized: "${normalized}")`);
    return result;
  };

  const isFacultyAssessment = (title: string): boolean => {
    const normalized = normalizeTitle(title);
    const keywords = ['marks obtained', 'evaluation', 'assessment', 'faculty comments', 'faculty member'];
    return keywords.some(k => normalized.includes(k)) || normalized.includes('faculty');
  };

  const isStudentFillableTitle = (title: string): boolean => {
    const normalized = normalizeTitle(title);
    const lowerTitle = title.toLowerCase();

    // Explicitly protect the "Must Never Be Filtered" list
    const mandatoryKeywords = [
      "actual resources", "actual procedure", "observations", 
      "results", "interpretation", "conclusion", "filled by student",
      "resources required", "student details", "student information",
      "draw conclusions", "take decisions", "take decision", "learners to draw conclusions"
    ];
    
    if (mandatoryKeywords.some(mk => lowerTitle.includes(mk))) {
      return true;
    }

    const role = getSectionRole(normalized);
    const keywords = [
      'to be filled by', 'learner', 'student', 'state the meaning', 
      'draw conclusions', 'if any'
    ];
    const isFillable = (!!role || keywords.some(k => normalized.includes(k))) && !isExcluded(title);
    if (isFillable) console.log(`[isStudentFillableTitle] TRUE for: "${title}"`);
    return isFillable;
  };

  const containsPlaceholder = (text: string): boolean => {
    // Unicode-aware placeholder detection: supports normal dots, underscores, dashes AND Unicode ellipsis (...)
    return (
      /^[\s\.\-_…]+$/.test(text) ||
      /[.\-_…]{3,}/.test(text) ||
      /[…]{2,}/.test(text)
    );
  };

  // Deeply collect structural elements (p, tbl) while preserving order
  const getAllStructuralElements = (node: Node): Node[] => {
    let results: Node[] = [];
    node.childNodes.forEach(child => {
      if (child.nodeName === 'w:p' || child.nodeName === 'w:tbl') {
        results.push(child);
      } else if (child.hasChildNodes() && child.nodeName !== 'w:p' && child.nodeName !== 'w:tbl' && child.nodeName !== 'w:r' && child.nodeName !== 'w:t') {
        results = results.concat(getAllStructuralElements(child));
      }
    });
    return results;
  };

  const structuralElements = getAllStructuralElements(body);

  const paragraphs = getElementsByTagName(body, 'p');
  const tables = getElementsByTagName(body, 'tbl');
  const processedNodeIndices = new Set<number>();
  const detectedFillableRoles = new Set<string>();

  const headerFields: Field[] = [];
  let isInStaticContent = false;
  const STATIC_SECTION_MARKERS = [
    "Suggested Practicum Related Questions",
    "References",
    "Suggestions for further reading",
    "Suggested Assessment Scheme",
    "Performance Indicators",
    "To be filled by the Faculty Member"
  ];

  currentSection = {
    id: 'root',
    title: 'General Information',
    content: '',
    fields: []
  };

  structuralElements.forEach((node, index) => {
    if (processedNodeIndices.has(index)) return;
    
    const text = node.textContent?.trim() || '';
    if (!text) {
      if (node.nodeName === 'w:p') currentSection.content += '\n';
      return;
    }

    // Static content stop marker detection
    const normalizedText = normalizeTitle(text);
    const matchedStaticMarker = STATIC_SECTION_MARKERS.find(marker => {
      const normalizedMarker = normalizeTitle(marker);
      return normalizedText === normalizedMarker || normalizedText.includes(normalizedMarker);
    });

    if (matchedStaticMarker) {
      console.log("STATIC CONTENT START:", matchedStaticMarker, "at text:", text);
      isInStaticContent = true;
    }

    if (isInStaticContent) {
      console.log("SKIPPING STATIC CONTENT:", text);
      return;
    }

    // Standalone Date Field Detection
    if (node.nodeName === 'w:p') {
      // Improved Date detection: check for "Date" keyword followed by any placeholder pattern
      const dateMatch = text.match(/Date\s*[:\s]+.*([.\-_…]{2,})/i);
      const hasDateKeyword = text.toLowerCase().includes('date');
      const hasPlaceholders = containsPlaceholder(text);
      if (dateMatch || (hasDateKeyword && hasPlaceholders)) {
          const pIdx = paragraphs.indexOf(node as any);
          const pattern = dateMatch ? dateMatch[1] : (text.match(/[.\-_…]{2,}/)?.[0] || '...');
          console.log("DATE FIELD DETECTED", {
            paragraph: pIdx,
            text
          });
          headerFields.push({
            id: "date-field", 
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
          return;
      }
    }

    // Header Detection & Section Partitioning
    if (node.nodeName === 'w:p') {
      const romanNumeralRegex = /^\s*([IVXLCDM]+)[\.\s\-]+\s*(.+)$/i;
      const isRomanHeader = romanNumeralRegex.test(text);
      const normalizedTitle = normalizeTitle(text);

      const forceHeaderKeywords = [
        "interpretation",
        "interpretation of results",
        "conclusion",
        "conclusions",
        "results/observations",
        "observations",
        "actual procedure",
        "actual resources",
        "actual resources used",
        "equipment",
        "materials used",
        "filled by student",
        "filled by the student",
        "student details",
        "student information"
      ];
      const isForcedHeader = forceHeaderKeywords.some(k => normalizedTitle.includes(k));
      
      const isHeaderCandidate = (
        isStudentFillableTitle(text) || 
        isExcluded(text) ||
        isFacultyAssessment(text) ||
        isRomanHeader
      );

      if (isHeaderCandidate && text.length < 500 && text.length > 2 && (!containsPlaceholder(text) || isForcedHeader)) {
        let intent: Section['intent'] = 'template-static';
        const role = getSectionRole(normalizedTitle);

        // PREVENT DUPLICATE SECTIONS: If we already have a fillable section of this type,
        // and this one looks like a "content" sentence starting with the keyword, reject it.
        if (role && detectedFillableRoles.has(role) && text.includes(':') && text.split(' ').length > 6) {
           console.log("[ANALYZER] Rejecting suspected duplicate/content section:", text);
        } else {
          // Priority: Student Fillable > Faculty Evaluation > Excluded
          if (isStudentFillableTitle(text)) {
            intent = 'student-fillable';
            if (role) detectedFillableRoles.add(role);
          }
          else if (isFacultyAssessment(text)) intent = 'faculty-evaluation';
          else if (isExcluded(text)) intent = 'template-static';

          console.log("HEADER DETECTED:", { 
            text: text.substring(0, 100), 
            isRomanHeader, 
            normalizedTitle,
            intent,
            isForcedHeader
          });

          // Finalize previous section range
          if (currentSection.intent === 'student-fillable' || currentSection.intent === 'faculty-evaluation') {
            currentSection.fields.forEach(f => {
              if (f.mapping?.type === 'paragraph' && f.mapping.endParagraph === undefined) {
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

          const rawTitle = text.replace(/[.\-_…]{3,}/g, '').trim();
          const titleMatch = rawTitle.match(/^(.+?)\s*\((.+)\)\s*$/);
          let finalTitle = rawTitle;
          let description = "";
          if (titleMatch) {
            finalTitle = titleMatch[1].trim();
            description = titleMatch[2].trim();
          }

          const hPIdx = paragraphs.indexOf(node as any);

          currentSection = {
            id: `section-${index}`,
            title: finalTitle,
            description: description,
            headerParagraphIndex: hPIdx,
            content: '',
            fields: [],
            intent
          };

          console.log("[SECTION CREATED]", currentSection.title, "Intent:", currentSection.intent);

          const normalizedCurrentTitle = normalizeTitle(currentSection.title);
          const isStudentSection = 
            normalizedCurrentTitle.includes("filled by student") ||
            normalizedCurrentTitle.includes("student details") ||
            normalizedCurrentTitle.includes("student information");

          if (isStudentSection) {
            console.log(
              "[STUDENT SECTION CREATED]",
              currentSection.title
            );
          }
          return;
        }
      }
    }

    // Process Content
    if (node.nodeName === 'w:tbl') {
      const tableIdx = tables.indexOf(node as any);
      // Use direct children for rows to avoid issues with nested tables
      const trs = getDirectChildrenByTagName(node as Element, 'tr');
      
      if (trs.length > 0) {
        // Look for the first row specifically for headers
        const firstRowCells = getDirectChildrenByTagName(trs[0], 'tc');
        const headers = firstRowCells.map(c => (c.textContent || '').trim());
        
        const entireTableText = (node.textContent || "").toLowerCase();
        console.log("[TABLE RAW TEXT]", entireTableText);

      const isStudentTableByContent =
        (
          entireTableText.includes("student") ||
          entireTableText.includes("name of the student") ||
          entireTableText.includes("student name")
        ) &&
        (
          entireTableText.includes("register") ||
          entireTableText.includes("register no") ||
          entireTableText.includes("reg no") ||
          entireTableText.includes("reg. no") ||
          entireTableText.includes("roll no") ||
          entireTableText.includes("roll number")
        );
        if (entireTableText.includes("student")) {
          console.log(
            "[POSSIBLE STUDENT TABLE]",
            entireTableText
          );
        }
        
        console.log(`[ANALYZER-TABLE] Processing table ${tableIdx} with ${trs.length} rows. Headers:`, headers);

        // Identify label columns (usually first 1 or 2)
        const metadataKeywords = [
          's.no', 's no', 'serial no', 'serial number', 
          'sl.no', 'sl no', '#', 'no', 'sr. no', 'sr no', 's.no.'
        ];
        
          const labelColIndices = headers.map((h, j) => {
            const hj = h.toLowerCase().trim();
            // Match keywords exactly or as clear prefixes like "s.no." or "no."
            if (metadataKeywords.some(mw => hj === mw || hj.startsWith(mw + '.') || hj.startsWith(mw + ' ') || (hj.includes(mw) && hj.length <= 6))) return j;
            return -1;
          }).filter(j => j !== -1);

        const finalLabelColIndices = labelColIndices.length > 0 ? labelColIndices : [0];
        
        const studentInputKeywords = [
          'name', 'student', 'register', 'roll', 'id', 'version', 
          'configuration', 'remarks', 'quantity', 'output', 'result', 
          'observation', 'value', 'actual', 'specification', 'comments',
          'registration', 'enrollment', 'batch', 'sem', 'resource', 'equipment', 'date'
        ];

        const isCurrentlyFillable = currentSection.intent === 'student-fillable' || currentSection.intent === 'faculty-evaluation';
        const tableRows: NonNullable<Field['tableRows']> = [];
        let hasAnyEditableCell = false;

        trs.forEach((tr, rIdx) => {
          const cells = getDirectChildrenByTagName(tr, 'tc');
          const trPr = tr.getElementsByTagName('w:trPr')[0];
          const isWordHeader = trPr && trPr.getElementsByTagName('w:tblHeader').length > 0;
          
          const row: typeof tableRows[0] = {
            // Strictly row 0 is header. Only allow subsequent rows as headers if they are explicitly marked AND it's not a tiny table
            isHeader: rIdx === 0 || (!!isWordHeader && trs.length > 3), 
            cells: cells.map((cell, cIdx) => {
              const headerName = headers[cIdx] || `Column ${cIdx + 1}`;
              const hl = headerName.toLowerCase();
              const cellText = (cell.textContent || '').trim();
              
              const isFillableHeader = studentInputKeywords.some(sk => hl.includes(sk));
              const isCellBlank = cellText === '';
              const isPlaceholder = containsPlaceholder(cellText);
              const isMetadata = finalLabelColIndices.includes(cIdx);
              
              // In student-fillable sections, we are more lenient with what we consider editable
              // Basically if it's not metadata and looks like it needs filling (blank or placeholder)
              // We also allow it even if isWordHeader is true for the first data row if headers match
              const isEditable = !isMetadata && (isFillableHeader || isCellBlank || isPlaceholder || isCurrentlyFillable);
              
              if (isEditable && rIdx > 0) hasAnyEditableCell = true;

              return {
                text: cellText,
                columnHeader: headerName,
                isEditable
              };
            })
          };
          tableRows.push(row);
        });

        const role = getSectionRole(normalizeTitle(currentSection.title));
        
        if (role === 'resource_table') {
          console.log("[RESOURCE TABLE ROWS]", tableRows.length);
          console.log("[RESOURCE TABLE DATA]", JSON.stringify(tableRows));
        }

        const headersText = headers.join(" ").toLowerCase();

        console.log(
  "[ALL TABLE HEADERS]",
  headers
);

        const isStudentTable =
          (
            headersText.includes("student") ||
            headersText.includes("name of the student") ||
            headersText.includes("student name")
          ) &&
          (
            headersText.includes("register") ||
            headersText.includes("register no") ||
            headersText.includes("reg no") ||
            headersText.includes("roll no") ||
            headersText.includes("roll number")
          );

        if (
          hasAnyEditableCell ||
          isCurrentlyFillable ||
          isStudentTable ||
          isStudentTableByContent
        ) {
          if (isStudentTable || isStudentTableByContent) {
            console.log(
              "[STUDENT TABLE DETECTED]",
              headers
            );
          }

          console.log("[TABLE FOUND]", currentSection.title, {
            rows: tableRows.length,
            headers,
            fieldsCreated: currentSection.fields.length + 1
          });

          let finalRole = role;
          let finalLabel = role === 'resource_table' ? 'Equipment & Softwares' : 'Data Table';

          if (isStudentTable || isStudentTableByContent) {
            finalRole = 'student_table';
            finalLabel = 'Student Details';
          }

          console.log("[TABLE SAVED]", currentSection.title, "Rows:", tableRows.length, "Role:", finalRole);
          currentSection.fields.push({
            id: `table_${tableIdx}`,
            label: finalLabel,
            type: 'table',
            sectionId: currentSection.id,
            semanticRole: finalRole,
            headers,
            tableRows,
            defaultValue: tableRows.map(row => row.cells.map(cell => cell.text)),
            mapping: { 
              type: 'table-cell', 
              tableIndex: tableIdx 
            }
          });

          if (isStudentTable || isStudentTableByContent) {
            console.log(
              "[STUDENT TABLE SAVED]",
              currentSection.title
            );
          }
        }
      }
      return;
    }

    if (currentSection.intent === 'student-fillable' || currentSection.intent === 'faculty-evaluation') {
      const normalizedSectionTitle = normalizeTitle(currentSection.title);
      const role = getSectionRole(normalizedSectionTitle);

      if (node.nodeName === 'w:p') {
        const pIdx = paragraphs.indexOf(node as any);
        const hasPlaceholder = containsPlaceholder(text);
        const isDotsOnly = /^[\s\.\-_…]+$/.test(text);
        const numberingMatch = text.match(/^(\s*\d+[\.\)]|\s*[a-zA-Z][\.\)]|\s*●|\s*-)\s*(.*)$/);
        
        const lastField = currentSection.fields[currentSection.fields.length - 1];
        const isContinuingRange = lastField && lastField.mapping?.type === 'paragraph' && lastField.mapping.endParagraph === undefined;

        if (numberingMatch && hasPlaceholder) {
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
          return;
        }

        if (hasPlaceholder) {
          if (!isContinuingRange) {
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
          } else if (isDotsOnly) {
             if (lastField.mapping?.placeholderParagraphs) {
               lastField.mapping.placeholderParagraphs.push(pIdx);
             }
          }
        } else if (text !== '' && isContinuingRange) {
          lastField.mapping!.endParagraph = pIdx - 1;
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
    console.log('[SECTION]', currentSection.title, 'FIELDS:', currentSection.fields.length);
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

  console.log("--- FILTERING START ---");
  console.log("TOTAL CANDIDATES BEFORE FILTER:", sections.length);
  sections.forEach((s, i) => {
    const norm = normalizeTitle(s.title);
    const hasFields = s.fields.length > 0;
    console.log(`CANDIDATE ${i}: "${s.title}" (Normalized: "${norm}", Fields: ${s.fields.length}, Intent: ${s.intent})`);
  });

    // Refine sections and only keep those that are truly student-fillable
    const finalizedSections = sections.filter(s => {
      const normalizedTitle = normalizeTitle(s.title);
      const role = getSectionRole(normalizedTitle);
      const isActuallyExcluded = isExcluded(s.title);
      const hasFields = s.fields.length > 0;
      const hasStudentTable = s.fields.some(f => f.semanticRole === 'student_table' || f.semanticRole === 'resource_table');
      
      // Check for strong signals of being fillable
      const studentKeywords = [
        'to be filled by', 'state the meaning', 'draw conclusions', 
        'interpretation', 'conclusion', 'student to state'
      ];

      const hasInstructions = studentKeywords.some(k => 
        s.title.toLowerCase().includes(k) || s.content.toLowerCase().includes(k)
      );
                             
      const hasPlaceholders = containsPlaceholder(s.content) || containsPlaceholder(s.title);
  
      let shouldKeep = false;
      let reason = '';
  
      if (isActuallyExcluded && !hasStudentTable) {
        shouldKeep = false;
        reason = 'Strictly excluded by isExcluded()';
      } else if (hasFields) {
        shouldKeep = true;
        reason = 'Already has fields (table or paragraph detected)';
      } else if (!!role) {
        shouldKeep = true;
        reason = `Identified by semantic role [${role}]`;
      } else if (hasInstructions || hasPlaceholders) {
        shouldKeep = true;
        reason = `Fillable signals detected (Instructions: ${hasInstructions}, Placeholders: ${hasPlaceholders})`;
      } else {
        shouldKeep = false;
        reason = 'No fillable signals (no dots/instructions) and no semantic role matches';
      }

      const isStudentIdentitySection =
        normalizedTitle.includes("filled by student") ||
        normalizedTitle.includes("student details") ||
        normalizedTitle.includes("student information");

      if (isStudentIdentitySection) {
        shouldKeep = true;
        reason = 'Forced student identity section';
      }
      
      console.log(`[FILTER DECISION] Section: "${s.title}"`);
      console.log(`  - Normalized: "${normalizedTitle}"`);
      console.log(`  - Role: ${role}`);
      console.log(`  - Intent: ${s.intent}`);
      console.log(`  - Fields: ${s.fields.length}`);
      console.log(`  - Instructions: ${hasInstructions}`);
      console.log(`  - Placeholders: ${hasPlaceholders}`);
      console.log(`  - Excluded: ${isActuallyExcluded}`);
      console.log(`  -> KEPT: ${shouldKeep} | REASON: ${reason}`);

      if (isStudentIdentitySection || s.title.toLowerCase().includes("student")) {
        console.log(
          "[FILTER CHECK STUDENT]",
          {
            title: s.title,
            kept: shouldKeep
          }
        );
      }

      if (!shouldKeep) {
         console.log(`  - Content preview (first 200 chars): ${s.content.substring(0, 200).replace(/\n/g, '\\n')}...`);
      }
      
      return shouldKeep;
    }).map(s => {
    const normalized = normalizeTitle(s.title);
    const role = getSectionRole(normalized);

    const isStudentIdentitySection =
      normalized.includes("filled by student") ||
      normalized.includes("student details") ||
      normalized.includes("student information") ||
      normalized.includes("to be filled by the student");

    // Scan raw text content of the section for student table cues
    const sectionTextLower = (s.title + "\n" + s.content).toLowerCase();
    const hasStudentCues = 
      sectionTextLower.includes("student") && 
      (sectionTextLower.includes("register") || sectionTextLower.includes("reg no") || sectionTextLower.includes("reg. no") || sectionTextLower.includes("roll"));

    if (isStudentIdentitySection || hasStudentCues) {
      // Check if a table field already exists
      const hasTableField = s.fields.some(f => f.type === 'table');
      if (!hasTableField) {
        // Construct fallback student table
        const fallbackTableRows = [
          {
            isHeader: true,
            cells: [
              { text: "S.No", columnHeader: "S.No", isEditable: false },
              { text: "Name of the Student", columnHeader: "Name of the Student", isEditable: false },
              { text: "Register No", columnHeader: "Register No", isEditable: false }
            ]
          },
          {
            isHeader: false,
            cells: [
              { text: "1", columnHeader: "S.No", isEditable: false },
              { text: "", columnHeader: "Name of the Student", isEditable: true },
              { text: "", columnHeader: "Register No", isEditable: true }
            ]
          }
        ];

        // Remove any non-table fallback fields that might have been added to keep UI clean
        s.fields = s.fields.filter(f => !f.id.startsWith("field-fallback-"));

        s.fields.push({
          id: `table_fallback_${s.id}`,
          label: "Student Details",
          type: 'table',
          sectionId: s.id,
          semanticRole: 'student_table',
          headers: ["S.No", "Name of the Student", "Register No"],
          tableRows: fallbackTableRows,
          defaultValue: [["1", "", ""]],
          mapping: {
            type: 'table-cell',
            tableIndex: 0
          }
        });
        console.log(`[ANALYZER-FALLBACK] Created fallback student table for section: ${s.title}`);
      } else {
        // Ensure any existing table field in this section is marked as 'student_table' and labeled correctly
        s.fields = s.fields.map(f => {
          if (f.type === 'table') {
            return {
              ...f,
              label: "Student Details",
              semanticRole: 'student_table'
            };
          }
          return f;
        });
      }
    } else if (s.fields.length === 0) {
      // Fallback Rule: Ensure learner sections ALWAYS have at least one field if they passed the filter
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
      if (f.type === 'table' && !f.id.startsWith("table_fallback_")) {
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

  console.log("AFTER FILTER SECTIONS:", finalizedSections.map(s => s.title));

  console.log(
  "[FINALIZED SECTIONS]",
  JSON.stringify(
    finalizedSections.map(s => ({
      title: s.title,
      fields: s.fields.map(f => ({
        label: f.label,
        role: f.semanticRole,
        type: f.type
      }))
    })),
    null,
    2
  )
);

console.log(
  "[FINAL ANALYZER OUTPUT]",
  finalizedSections.map(section => ({
    title: section.title,
    fields: section.fields.map(field => ({
      id: field.id,
      label: field.label,
      role: field.semanticRole,
      type: field.type
    }))
  }))
);

alert("ANALYZER FINISHED");
console.log("ANALYZER FINISHED");

console.log(
  "ALL ROLES",
  finalizedSections.flatMap(s =>
    s.fields.map(f => ({
      label: f.label,
      role: f.semanticRole
    }))
  )
);
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
