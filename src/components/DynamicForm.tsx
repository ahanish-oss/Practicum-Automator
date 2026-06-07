import { useStore } from '@/src/store/useStore';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Section } from '@/src/types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ListOrdered, 
  Table as TableIcon, 
  CheckCircle2, 
  Circle,
  Plus, 
  ChevronDown,
  Box,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';

export function DynamicForm() {
  const { document, formValues, updateFormValue, setHighlightedField, setFormValues } = useStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const ENABLE_AI = true;

  const visibleSections = document ? document.sections.filter(section => {
    if (section.id === 'document-header') return false;

    const normalized = (section.title || "")
      .toLowerCase()
      .trim();

    // 1. Explicitly hide instructional and non-fillable sections
    const forbiddenTitles = [
      "usage",
      "practical outcome",
      "execute the python program",
      "show uninterrupted data flow",
      "document and report findings",
      "summarize latency",
      "resources required",
      "safety precautions",
      "procedure",
      "competency",
      "related co",
      "ado"
    ];

    if (
      forbiddenTitles.some(t =>
        t === "procedure" 
          ? (normalized.includes(t) && !normalized.includes("actual")) 
          : normalized.includes(t)
      )
    ) {
      return false;
    }

    // 2. Clear allowed student-fillable semantic roles
    const allowedRoles = [
      "student_table",
      "resource_table",
      "procedure",
      "observation",
      "result",
      "interpretation",
      "conclusion"
    ];

    return section.fields.some(field =>
      allowedRoles.includes(field.semanticRole || "")
    );
  }) : [];

  // Initialize first section as active
  useEffect(() => {
    if (!activeSection && visibleSections.length > 0) {
      setActiveSection(visibleSections[0].id);
    }
  }, [visibleSections, activeSection]);

  if (!document) return null;
  
  document.sections.forEach(section => {
    console.log(
      "[SECTION]",
      section.title,
      "FIELDS:",
      section.fields.length
    );
  });

  document.sections.forEach(section => {
  section.fields.forEach(field => {
    console.log(
      "[REAL FIELD]",
      field.id,
      field.label,
      field.type
    );
  });
});
const handleAIGenerate = async () => {
  setIsGenerating(true);
  console.log("handleAIGenerate started");

    try {
      console.log("[AI] Generate button clicked, ENABLE_AI is:", ENABLE_AI);

      if (!ENABLE_AI) {
        // Run fully stable & offline-friendly mock filling pipeline
        await new Promise(resolve => setTimeout(resolve, 1000)); // nice satisfying delay

        const mockValues: Record<string, any> = {};

        console.log("[MOCK] Starting generation...");

        document.sections.forEach(section => {
          console.log(
            "[MOCK] SECTION:",
            section.title,
            "FIELDS:",
            section.fields.length
          );

          section.fields.forEach(field => {
            console.log(
              "[MOCK] FIELD:",
              field.id,
              field.label,
              field.type
            );

                        console.log(
                "[FIELD CHECK]",
                field.id,
                field.type
              );
            // TABLES
            if (field.type === "table") {

               if (field.type === "table") {
  alert(`TABLE FOUND: ${field.id}`);
               }
              const tableRows = field.tableRows || [];
              const headers = field.headers || [];

                              console.log(
                  "[TABLE DEBUG]",
                  field.id,
                  "ROWS:",
                  tableRows.length,
                  "HEADERS:",
                  headers
                );

                tableRows.forEach((row: any, idx: number) => {
                  console.log(
                    "[TABLE ROW]",
                    field.id,
                    idx,
                    row.cells?.map((c: any) => ({
                      text: c.text,
                      editable: c.isEditable
                    }))

                    
                  );
                });

                

              const generatedTable: string[][] = [];

              tableRows.forEach((row: any, rowIndex: number) => {
                if (row.isHeader) {
                  generatedTable[rowIndex] = [];
                  return;
                }

                const generatedRow = row.cells.map(
                  (cell: any, cellIndex: number) => {

                    if (!cell.isEditable) {
                      return cell.text || "";
                    }

                    const header =
                      (headers[cellIndex] || "")
                        .toLowerCase();

                    if (header.includes("name")) {
                      return "VS Code";
                    }

                    if (
                      header.includes("version") ||
                      header.includes("configuration")
                    ) {
                      return "Latest";
                    }

                    if (
                      header.includes("remark") ||
                      header.includes("comment")
                    ) {
                      return "Verified";
                    }

                    return `Value ${rowIndex}-${cellIndex}`;
                  }
                );

                generatedTable[rowIndex] = generatedRow;
              });

              mockValues[field.id] = generatedTable;
            }

            // TEXT / TEXTAREA
            else {
              const label =
                (field.label || "").toLowerCase();

              const role =
                field.semanticRole || "";

              if (
                label.includes("observation") ||
                role === "observation"
              ) {
                mockValues[field.id] =
                  "Data transmission was successful without packet loss.";
              }

              else if (
                label.includes("interpretation") ||
                role === "interpretation"
              ) {
                mockValues[field.id] =
                  "The obtained results indicate stable communication and proper system behavior.";
              }

              else if (
                label.includes("conclusion") ||
                role === "conclusion"
              ) {
                mockValues[field.id] =
                  "The experiment was completed successfully and all objectives were achieved.";
              }

              else if (
                label.includes("procedure") ||
                role === "procedure"
              ) {
                mockValues[field.id] =
                  `1. Started the system. 2. Configured the required settings. 3. Executed the experiment. 4. Recorded observations. 5. Verified the output.`;
              }

              else if (
                label.includes("result") ||
                role === "result"
              ) {
                mockValues[field.id] =
                  `1. Communication established successfully. 2. Data was received correctly. 3. No significant errors were observed.`;
              }

              else {
                mockValues[field.id] =
                  `Generated content for ${field.label}`;
              }
            }
          });
        });

        console.log(
          "[MOCK] GENERATED VALUES",
          mockValues
        );

        setFormValues({});

        setTimeout(() => {
          setFormValues(mockValues);

          console.log(
            "[MOCK] FILLED KEYS",
            Object.keys(mockValues)
          );

          alert(
            `Mock fill complete. Filled ${Object.keys(mockValues).length} fields.`
          );
        }, 100);

        return;
      }

      console.log("[AI] Document:", document?.name);
      console.log("[AI] Sections:", visibleSections.length);

      const docName = document?.name || 'Practicum';
      const contextBlocks = visibleSections.map(s => {
        const fieldsInfo = s.fields.map(f => {
          if (f.type === 'table') {
            return `Table: ${f.label} (ID: ${f.id}), Headers: ${(f.headers || []).join(', ')}`;
          }
          return `Field: ${f.label} (ID: ${f.id})`;
        }).join('\n');
        return `Section: ${s.title}\nRole: ${s.intent}\nFields:\n${fieldsInfo}\n`;
      }).join('\n\n');

      const prompt = `Generate realistic student responses for this practicum.
Document: ${docName}

${contextBlocks}

Return ONLY a valid JSON Array of objects. Do not include any markdown, code fences, or additional text.
IMPORTANT: You must escape all newlines as \\n in strings. No actual unescaped newlines inside string values.

JSON Format Requirements:
- The output MUST be a single JSON Array containing objects for each field.
- Each object MUST have a key "id" with the exact field ID.
- Each object MUST have EITHER a "value" key (for text) OR a "tableValue" key (for tables).

Value Types:
- Text/Textarea fields -> Set "value" to a String. Use \\n for line breaks.
- Table fields -> Set "tableValue" to a 2D Array of Strings. DO NOT include the header row. Example: {"id": "table_0", "tableValue": [["1", "val1"], ["2", "val2"]]}
`;

      const fields = (visibleSections.length > 0 ? visibleSections : (document?.sections || []))
        .flatMap(section =>
          section.fields.map(field => ({
            id: field.id,
            label: field.label,
            type: field.type,
            headers: field.headers,
            tableRows: field.type === 'table' ? (field.tableRows || []).map((row: any) => ({
              isHeader: row.isHeader,
              cells: (row.cells || []).map((cell: any) => ({
                text: cell.text,
                isEditable: cell.isEditable
              }))
            })) : undefined
          }))
        );

      console.log("[AI] Calling API with dynamic fields:", fields);
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, fields, model: 'gemini-2.5-flash' }),
        signal: AbortSignal.timeout(60000)
      });
      console.log(
        "[AI] Status:",
        response.status
      );

      const raw = await response.text();
      console.log(
        "[AI RAW RESPONSE]",
        raw
      );

      if (raw.trim().startsWith("<!doctype html>") || raw.trim().startsWith("<!DOCTYPE html>")) {
         throw new Error("Wrong API endpoint called: server served index.html instead of JSON. Please check API routing.");
      }

      let parsedJson: any = null;
      try {
         parsedJson = JSON.parse(raw);
      } catch (e) {}

      if (parsedJson && parsedJson.success === false) {
         throw new Error(parsedJson.error || "API request failed");
      }

      if (!response.ok) {
         let errMsg = 'API request failed';
         if (parsedJson) {
           errMsg = parsedJson.error?.message || parsedJson.error || errMsg;
           if (typeof errMsg === 'object') errMsg = JSON.stringify(errMsg);
         } else {
           errMsg = raw || errMsg;
         }
         throw new Error(errMsg);
      }

      const data = parsedJson || { text: raw };
      const apiText = data.text || raw;
      
      let parsed: any[] = [];
      try {
        const cleaned = (data.text || apiText)
           .replace(/```json/g, "")
           .replace(/```/g, "")
           .trim();
        parsed = JSON.parse(cleaned);
        console.log("[AI] Parsed JSON natively", parsed);
      } catch (err1) {
        console.warn("[JSON DIRECT PARSE ERROR], attempting fallback extraction/cleaning", err1);
        try {
          let cleaned = (data.text || apiText).replace(/```json/gi, '').replace(/```(?:[a-zA-Z]*)\n/g, '').replace(/```/g, '').trim();
          const firstBrace = cleaned.indexOf('[');
          const lastBrace = cleaned.lastIndexOf(']');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
          } else {
            let inner = cleaned.trim();
            if (inner.startsWith(',')) inner = inner.substring(1);
            if (inner.endsWith(',')) inner = inner.substring(0, inner.length - 1);
            cleaned = '[' + inner + ']';
          }
          
          cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

          let escapedCleaned = '';
          let inString = false;
          let escapeNext = false;
          for (let i = 0; i < cleaned.length; i++) {
             const char = cleaned[i];
             if (inString) {
                if (escapeNext) { escapeNext = false; }
                else if (char === '\\') { escapeNext = true; }
                else if (char === '"') { inString = false; }
                else if (char === '\n') { escapedCleaned += '\\n'; continue; }
                else if (char === '\r') { escapedCleaned += '\\r'; continue; }
                else if (char === '\t') { escapedCleaned += '\\t'; continue; }
             } else {
                if (char === '"') { inString = true; }
             }
             escapedCleaned += char;
          }
          cleaned = escapedCleaned;
          
          try {
             parsed = JSON.parse(cleaned);
             console.log("[AI] Parsed JSON after fallback cleaning", parsed);
          } catch(err2) {
             console.log("[AI] Falling back to loose evaluation...", err2);
             parsed = (new Function('return (' + cleaned + ');'))();
             console.log("[AI] Parsed via eval fallback", parsed);
          }
        } catch (err3) {
          console.error("[AI] Invalid JSON fallback failure: \n" + (data.text || apiText));
          const extracted: any[] = [];
          visibleSections.forEach(s => s.fields.forEach(f => {
            const regex = new RegExp(`"?${f.id}"?\\s*:\\s*(?:\\[([^\\]]+)\\]|"(.*?)"|([^,\\n]+))`, 'is');
            const match = (data.text || apiText).match(regex);
            if (match) {
               if (match[1]) {
                   try { 
                     const arr = (new Function('return ([' + match[1] + ']);'))();
                     extracted.push({ id: f.id, tableValue: arr }); 
                   } catch(e) {}
               } else if (match[2]) {
                   extracted.push({ id: f.id, value: match[2] });
               } else if (match[3]) {
                   extracted.push({ id: f.id, value: match[3].trim() });
               }
            }
          }));
          
          if (extracted.length > 0) {
             parsed = extracted;
             console.log("[AI] Rescued via regex extraction", parsed);
          } else {
             throw new Error("Invalid format received from AI.");
          }
        }
      }

      if (!Array.isArray(parsed)) {
          if (typeof parsed === 'object' && parsed !== null) {
             parsed = Object.entries(parsed).map(([k, v]) => ({ id: k, value: typeof v === 'string' ? v : undefined, tableValue: Array.isArray(v) ? v : undefined }));
          } else {
             throw new Error("Expected array from AI");
          }
      }

      const hasExisting = visibleSections.some(s => s.fields.some(f => {
        const val = formValues[f.id];
        if (Array.isArray(val)) return val.some(r => Array.isArray(r) ? r.some(c => c !== '') : r !== '');
        return !!val;
      }));

     if (hasExisting) {
  console.log(
    "[AI] Existing values detected. Auto-overwriting in sandbox mode."
  );
}

      console.log("[AI] Updating form values");
      
      const parsedData: Record<string, any> = { ...formValues };
      
      parsed.forEach((item: any) => {
         const key = item.id;
         if (!key) return;

         let finalValue = item.tableValue !== undefined ? item.tableValue : item.value;
         
         // Fix incorrect AI values for table fields
         const field = visibleSections.flatMap(s => s.fields).find(f => f.id === key);
         if (field && field.type === 'table') {
             if (!Array.isArray(finalValue)) {
                 finalValue = [[finalValue ? String(finalValue) : '']];
             } else if (finalValue.length > 0 && !Array.isArray(finalValue[0])) {
                 // 1D array -> wrap in 2D array
                 finalValue = [finalValue];
             } else {
                 // Ensure nested items are strings
                 finalValue = (finalValue as any[]).map(row => 
                    Array.isArray(row) ? row.map(cell => typeof cell === 'string' ? cell : JSON.stringify(cell)) : [String(row)]
                 );
             }

             // Handle padding for tables with headers
             // The AI generates data rows WITHOUT headers, but our state arrays are indexed by tableRows (where row 0 is usually the header).
             if (field.tableRows) {
                 const headersCount = field.tableRows.filter((r: any) => r.isHeader).length;
                 if (headersCount > 0) {
                     // Add empty arrays at the beginning to offset the data rows
                     const padding = Array(headersCount).fill([]);
                     finalValue = [...padding, ...finalValue];
                 }
             }
         } else {
             // For text fields, ensure it is a string
             if (typeof finalValue !== 'string') {
                 finalValue = typeof finalValue === 'object' ? JSON.stringify(finalValue, null, 2) : String(finalValue);
             }
         }
         
         parsedData[key] = finalValue;
      });

      setFormValues(parsedData);

      console.log(
         "[AI FILLED KEYS]",
         Object.keys(parsedData)
      );

      console.log("[AI] Form values updated");
      alert("AI responses generated successfully.");

    } catch (e: any) {
      console.error(e);
      if (e.name === 'TimeoutError') {
         alert("AI generation timed out. Please try again.");
      } else {
         alert('Failed to generate responses: ' + String(e.message || e));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTableField = (field: any) => {
    const value = (formValues[field.id] as string[][]) || [];
    const tableRows = field.tableRows || [];
    const headers = field.headers || [];

    const updateCell = (rIdx: number, cIdx: number, val: string) => {
      const newData = [...value];
      if (!newData[rIdx]) {
        // Initialize the row if it doesn't exist in formValues
        newData[rIdx] = tableRows[rIdx].cells.map((c: any) => c.text);
      }
      newData[rIdx] = [...newData[rIdx]];
      newData[rIdx][cIdx] = val;
      updateFormValue(field.id, newData);
    };

    return (
      <div key={field.id} className="space-y-4 overflow-hidden">
        <div className="flex items-center gap-2 px-1">
          <TableIcon className="w-3.5 h-3.5 text-indigo-400" />
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{field.label}</Label>
        </div>
        
        <div className="border border-gray-100 rounded-2xl overflow-x-auto bg-white shadow-sm">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-gray-50/50">
                {headers.map((header: string, i: number) => (
                  <th key={i} className="px-4 py-3 text-left font-bold text-gray-500 border-b border-gray-100 first:pl-6 min-w-[120px]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row: any, rIdx: number) => {
                if (row.isHeader) return null;
                
                return (
                  <tr key={rIdx} className="hover:bg-gray-50/30 transition-colors group">
                    {row.cells.map((cell: any, cIdx: number) => {
                      const isEditable = cell.isEditable;
                      const cellValue = isEditable ? (value[rIdx]?.[cIdx] ?? cell.text) : cell.text;
                      
                      return (
                        <td key={cIdx} className="py-2 border-b border-gray-50 first:pl-6 last:pr-6 whitespace-nowrap">
                          {isEditable ? (
                            <input 
                              className="w-full bg-gray-50/50 border border-transparent rounded-lg px-3 py-2 text-[12px] font-medium text-gray-900 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 transition-all outline-none placeholder:text-gray-300"
                              value={cellValue}
                              onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                              placeholder="..."
                            />
                          ) : (
                            <div className="px-3 py-2 text-gray-500 font-medium">
                              {cellValue}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderField = (field: any) => {
    const value = formValues[field.id];
    
    if (field.type === 'table') {
      return renderTableField(field);
    }

    // 1. LARGE TEXT AREAS
    const isLarge = field.semanticRole === 'interpretation' || 
                   field.semanticRole === 'conclusion' || 
                   field.semanticRole === 'procedure' || 
                   field.semanticRole === 'result' ||
                   field.type === 'textarea';

    return (
      <div key={field.id} className="space-y-2 px-1">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {field.label}
        </Label>
        {isLarge ? (
          <textarea 
            placeholder={`Reflect on ${field.label.toLowerCase()}...`}
            className="w-full min-h-[180px] rounded-2xl border border-gray-100 bg-white focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all outline-none p-6 text-[13px] leading-relaxed font-medium placeholder:text-gray-200"
            value={(value as string) || ''}
            onChange={(e) => updateFormValue(field.id, e.target.value)}
          />
        ) : (
          <input 
            placeholder="Type standard entry..."
            className="w-full rounded-xl h-11 border border-gray-100 bg-white px-4 text-[13px] font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
            value={(value as string) || ''}
            onChange={(e) => updateFormValue(field.id, e.target.value)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {visibleSections.length > 0 && (
        <div className="flex justify-end mb-6">
          <Button 
            onClick={handleAIGenerate} 
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl h-10 px-5 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating responses...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                Generate Responses with AI
              </>
            )}
          </Button>
        </div>
      )}
      {visibleSections.map((section: Section, sIdx: number) => {
        const isOpen = activeSection === section.id;
        const filledFields = section.fields.filter(f => {
          const val = formValues[f.id];
          if (Array.isArray(val)) return val.some(v => v !== '');
          return !!val;
        }).length;
        const totalFields = section.fields.length;
        const isCompleted = totalFields > 0 && filledFields === totalFields;

        return (
          <div 
            key={section.id} 
            className={`border rounded-[24px] overflow-hidden transition-all duration-300 ${
              isOpen ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-100/20' : 'bg-gray-50/30 border-gray-100'
            }`}
          >
            <button 
              onClick={() => setActiveSection(isOpen ? null : section.id)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  isCompleted ? 'bg-emerald-50 text-emerald-600' : (isOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400')
                }`}>
                   {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-2 h-2 fill-current" />}
                </div>
                <div>
                   <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{section.title}</h3>
                   {section.description && (
                     <p className="text-[10px] text-gray-400 italic mb-1 line-clamp-1 group-hover:line-clamp-none transition-all">{section.description}</p>
                   )}
                   <span className="text-[10px] text-gray-400 font-medium">{filledFields} of {totalFields} fields completed</span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} />
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <div className="p-8 pt-0 space-y-10">
                    {/* Developer Debug Panel (Subtle) */}
                    <div className="mx-8 p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-between">
                       <div className="flex gap-4">
                         <div className="flex flex-col">
                           <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Type</span>
                           <span className="text-[10px] font-bold text-gray-600 capitalize">{(section.intent || 'student-fillable').replace('-', ' ')}</span>
                         </div>
                         <div className="w-[1px] h-6 bg-gray-200" />
                         <div className="flex flex-col">
                           <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Fields</span>
                           <span className="text-[10px] font-bold text-gray-600">{section.fields.length}</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <Box className="w-2.5 h-2.5 text-gray-300" />
                         <span className="text-[9px] font-medium text-gray-400">ID: {section.id}</span>
                       </div>
                    </div>

                    <div className="grid gap-8">
                       {section.fields.map((field) => renderField(field))}
                       {section.fields.length === 0 && (
                         <div className="p-8 bg-gray-50/20 rounded-2xl border border-dashed border-gray-100 text-center space-y-3">
                           <Layers className="w-6 h-6 text-gray-200 mx-auto" />
                           <div className="space-y-1">
                             <p className="text-[11px] font-semibold text-gray-400">No input fields detected</p>
                             <p className="text-[9px] text-gray-300 px-12">The parser couldn't identify editable tables or placeholders in this specific section of the template.</p>
                           </div>
                         </div>
                       )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {!visibleSections.length && (
         <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
               <Layers className="w-6 h-6 text-gray-300" />
            </div>
            <div className="space-y-1">
               <h4 className="text-sm font-semibold text-gray-900">No fillable sections found</h4>
               <p className="text-xs text-gray-400">We couldn't detect any student-fillable sections like Resources, Observations, or Results in this document.</p>
            </div>
         </div>
      )}
    </div>
  );
}
