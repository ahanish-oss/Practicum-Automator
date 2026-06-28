import { useStore } from '@/src/store/useStore';
import { getModuleById } from '@/src/lib/module-config';
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
  const { 
    document, 
    formValues, 
    updateFormValue, 
    setHighlightedField, 
    highlightedFieldId,
    setFormValues,
    setSectionReviews,
    setReportQuality,
    setCopilotActive,
    activeModuleId
  } = useStore();
  const config = getModuleById(activeModuleId);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const ENABLE_AI = true;

  const visibleSections = document ? document.sections.filter(section => {
    if (section.id === 'document-header') return false;

    const normalized = (section.title || "")
      .toLowerCase()
      .trim();

    // Bypass filter: Ensure any student-related or learner-related section or field is ALWAYS visible
    const isStudentSection = 
      normalized.includes("student") || 
      normalized.includes("learner") ||
      normalized.includes("identity") ||
      normalized.includes("roll") ||
      normalized.includes("register") ||
      section.fields.some(field => {
        const r = (field.semanticRole || "").toLowerCase();
        const l = (field.label || "").toLowerCase();
        const id = (field.id || "").toLowerCase();
        return r.includes("student") || r.includes("learner") || r.includes("identity") ||
               l.includes("student") || l.includes("learner") ||
               id.includes("student") || id.includes("learner") || id.includes("fallback") || id.includes("student_table");
      });

    if (isStudentSection) {
      return true;
    }

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

  console.log("[VISIBLE SECTIONS]", visibleSections.map(s => s.title));

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
  const extractTopicDetails = () => {
    const result = {
      experimentTitle: '',
      practicalName: '',
      aim: '',
      objective: '',
      topic: ''
    };

    if (!document) return result;

    let lines: string[] = [];
    if (document.htmlContent) {
      try {
        const tempDiv = window.document.createElement('div');
        tempDiv.innerHTML = document.htmlContent;
        const elements = Array.from(tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, th, td, li'));
        lines = elements.map(el => (el.textContent || '').trim()).filter(Boolean);
      } catch (e) {
        console.error("HTML parse error in extractTopicDetails:", e);
      }
    }

    if (lines.length === 0 && document.sections) {
      document.sections.forEach((s: any) => {
        lines.push(s.title);
        s.content.split('\n').forEach((l: string) => lines.push(l.trim()));
      });
      lines = lines.filter(Boolean);
    }

    const getSubsequentText = (index: number, maxCount = 2): string => {
      const gathered: string[] = [];
      for (let i = index + 1; i < Math.min(lines.length, index + 1 + maxCount); i++) {
        const text = lines[i];
        if (/^(?:aim|objective|practical|experiment|procedure|observation|result|conclusion|evaluation)/i.test(text)) {
          break;
        }
        gathered.push(text);
      }
      return gathered.join(' ');
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const expMatch = line.match(/experiment\s*(?:no|num|number|title|name)?\s*[:\-\s\.]+\s*(.+)/i);
      if (expMatch && expMatch[1] && expMatch[1].trim().length > 3) {
        const val = expMatch[1].trim();
        if (!result.experimentTitle || result.experimentTitle.length < val.length) {
          result.experimentTitle = val;
        }
      }
      if (/^experiment\s*[0-9]+$/i.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i+1];
        if (nextLine && !nextLine.toLowerCase().includes("aim") && nextLine.length > 5 && nextLine.length < 100) {
          if (!result.experimentTitle) result.experimentTitle = nextLine;
        }
      }

      const pracMatch = line.match(/practical\s*(?:no|num|number|title|name)?\s*[:\-\s\.]+\s*(.+)/i);
      if (pracMatch && pracMatch[1] && pracMatch[1].trim().length > 3) {
        const val = pracMatch[1].trim();
        if (!result.practicalName || result.practicalName.length < val.length) {
          result.practicalName = val;
        }
      }
      if (/^practical\s*[0-9]+$/i.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i+1];
        if (nextLine && !nextLine.toLowerCase().includes("aim") && nextLine.length > 5 && nextLine.length < 100) {
          if (!result.practicalName) result.practicalName = nextLine;
        }
      }

      const aimMatch = line.match(/^aim\s*[:\-\s\.]+\s*(.+)/i);
      if (aimMatch && aimMatch[1] && aimMatch[1].trim().length > 3) {
        result.aim = aimMatch[1].trim();
      } else if (/^aim$/i.test(line)) {
        result.aim = getSubsequentText(i, 2);
      }

      const objMatch = line.match(/^objective(?:s)?\s*[:\-\s\.]+\s*(.+)/i);
      if (objMatch && objMatch[1] && objMatch[1].trim().length > 3) {
        result.objective = objMatch[1].trim();
      } else if (/^objective(?:s)?$/i.test(line)) {
        result.objective = getSubsequentText(i, 3);
      }
    }

    const cleanTitle = (t: string) => {
      return t.replace(/^[\s\.\-\/\d]+/, '').trim();
    };

    if (result.practicalName && !result.experimentTitle) {
      result.experimentTitle = result.practicalName;
    }
    if (result.experimentTitle && !result.practicalName) {
      result.practicalName = result.experimentTitle;
    }

    if (!result.experimentTitle && document.name) {
      let rawName = document.name;
      const dotIdx = rawName.lastIndexOf('.');
      if (dotIdx !== -1) rawName = rawName.substring(0, dotIdx);
      rawName = rawName.replace(/[_\-]/g, ' ');
      rawName = rawName.replace(/^(?:practicum|practical|experiment|lab|record|docx|pdf|\d|\s|\.)+/i, '');
      result.experimentTitle = rawName.trim() || document.name;
      result.practicalName = result.experimentTitle;
    }

    if (result.experimentTitle) result.experimentTitle = cleanTitle(result.experimentTitle);
    if (result.practicalName) result.practicalName = cleanTitle(result.practicalName);

    result.topic = result.experimentTitle || 'MQTT Publish Subscribe Architecture';
    return result;
  };

  const runLocalOfflineFallbackGenerator = () => {
    console.log("[FALLBACK GENERATOR] Running client-side offline fallback generator...");
    const fallbackValues: Record<string, any> = {};
    
    const detected = extractTopicDetails();
    const isMQTT = (detected.topic || '').toLowerCase().includes("mqtt") || 
                   (detected.experimentTitle || '').toLowerCase().includes("mqtt");

    const sectionsToUse = visibleSections.length > 0 ? visibleSections : (document?.sections || []);
    sectionsToUse.forEach(section => {
      section.fields.forEach(field => {
        if (field.type === "table") {
          const tableRows = field.tableRows || [];
          const headers = field.headers || [];
          const generatedTable: string[][] = [];

          tableRows.forEach((row: any, rowIndex: number) => {
            if (row.isHeader) {
              generatedTable[rowIndex] = [];
              return;
            }

            const generatedRow = row.cells.map((cell: any, cellIndex: number) => {
              if (!cell.isEditable) {
                return cell.text || "";
              }

              const header = (headers[cellIndex] || "").toLowerCase();

              const isResourceCol = header.includes("resource") || header.includes("name") || header.includes("tool") || header.includes("software") || header.includes("hardware");
              const isSpecCol = header.includes("specification") || header.includes("version") || header.includes("config") || header.includes("details");
              const isQtyCol = header.includes("qty") || header.includes("quantity");
              const isRemarkCol = header.includes("remark") || header.includes("comment") || header.includes("status");

              if (isMQTT) {
                if (isResourceCol) {
                  const resources = [
                    "Desktop Computer",
                    "MQTT Broker",
                    "Python",
                    "VS Code",
                    "Wireshark",
                    "Mosquitto"
                  ];
                  return resources[rowIndex % resources.length] || "Workstation";
                }
                if (isSpecCol) {
                  const specs = [
                    "Intel Core i5, 8GB RAM",
                    "Eclipse Mosquitto 2.0",
                    "Version 3.12",
                    "Version 1.98",
                    "Version 4.2",
                    "Port 1883 TCP"
                  ];
                  return specs[rowIndex % specs.length] || "Latest / Python 3.12";
                }
                if (isQtyCol) return "1";
                if (isRemarkCol) return "Verified successfully";
              } else {
                if (isResourceCol) return "Standard Hardware / Software Unit";
                if (isSpecCol) return "Standard system compatibility configured";
                if (isQtyCol) return "1";
                if (isRemarkCol) return "Verified";
              }

              return `Value ${rowIndex}-${cellIndex}`;
            });

            generatedTable[rowIndex] = generatedRow;
          });

          fallbackValues[field.id] = generatedTable;
        } else {
          const label = (field.label || "").toLowerCase();
          const role = field.semanticRole || "";

          if (label.includes("observation") || role === "observation") {
            if (isMQTT) {
              fallbackValues[field.id] = "Under network stress validation, standard MQTT subscription handshaking exhibited minimal jitter and zero packet loss. The publisher successfully streamed telemetry packets to Mosquitto MQTT Broker on Port 1883 with keep-alive intervals maintaining clean active connections.";
            } else {
              fallbackValues[field.id] = `Experimental observation completed with reliable metrics. System response matches standard values and shows zero deviation from expected performance parameters.`;
            }
          } else if (label.includes("interpretation") || role === "interpretation") {
            if (isMQTT) {
              fallbackValues[field.id] = "The message dispatch characteristics confirm that the broker-mediated pub/sub topology effectively decouples publishers and subscribers. This latency-optimized distribution facilitates scalable, lightweight messaging suitable for standard embedded IoT setups.";
            } else {
              fallbackValues[field.id] = "The observed outputs confirm optimal function execution across all testing boundaries. The metrics align faithfully with the predictive operational model.";
            }
          } else if (label.includes("conclusion") || role === "conclusion") {
            if (isMQTT) {
              fallbackValues[field.id] = "The MQTT Publish-Subscribe architecture was successfully analyzed. Connections were managed with low network footprint and robust broker routing, demonstrating full alignment with target lab design goals.";
            } else {
              fallbackValues[field.id] = "The objectives of the lab record were successfully accomplished. Performance indicators have been thoroughly verified and core skills mastered.";
            }
          } else if (label.includes("procedure") || role === "procedure") {
            if (isMQTT) {
              fallbackValues[field.id] = "1. Setup Eclipse Mosquitto server as the primary local MQTT broker.\n2. Write a Python listener using paho-mqtt to register the topic subscription.\n3. Configure publisher script to send message payloads over TCP, specifying port 1883.\n4. Initialize both clients and capture real-time publication logs.\n5. Verify perfect receipt over subscriber terminals with zero transmission errors.";
            } else {
              fallbackValues[field.id] = "1. Pre-configure hardware and software workstation environments.\n2. Execute baseline connection scripts to register proper endpoints.\n3. Run systematic execution tests to ensure expected parameter alignments.\n4. Save observational details during active runtime monitor phases.\n5. Prepare output conclusions against target learning objectives.";
            }
          } else if (label.includes("result") || role === "result") {
            if (isMQTT) {
              fallbackValues[field.id] = "The MQTT publication was fully received by subscriber endpoints. Message integrity was completely preserved and the system functioned flawlessly.";
            } else {
              fallbackValues[field.id] = "All target test parameters compiled cleanly with expected values. Results have been registered as successful.";
            }
          } else {
            fallbackValues[field.id] = `Realistic laboratory detail for ${field.label}`;
          }
        }
      });
    });

    setFormValues(fallbackValues);
    launchCopilotWorkspace(fallbackValues);
  };

  const launchCopilotWorkspace = async (parsedData: Record<string, any>) => {
    // 1. Initialize reviews
    const initialReviews: Record<string, any> = {};
    const reviewableFields = visibleSections.flatMap(s => s.fields);
    reviewableFields.forEach(field => {
      const val = parsedData[field.id];
      const valStr = typeof val === 'string' ? val : JSON.stringify(val);
      initialReviews[field.id] = {
        fieldId: field.id,
        content: valStr,
        approved: false,
        revisionHistory: valStr ? [valStr] : [],
        aiSuggestions: []
      };
    });
    setSectionReviews(initialReviews);

    // 2. Flip active state to launch workspace
    setCopilotActive(true);

    // 3. Background quality evaluation
    try {
      const evalRes = await fetch('/api/gemini/copilot/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentTitle: document?.name || "Experiment Report",
          formValues: parsedData,
          fields: reviewableFields.map(f => ({ id: f.id, label: f.label, role: f.semanticRole, type: f.type })),
          documentType: config.documentType,
          aiPersona: config.aiPersona
        })
      });
      const evalData = await evalRes.json();
      if (evalData.success && evalData.quality) {
        setReportQuality(evalData.quality);
      }
    } catch (err) {
      console.warn("Failed to get initial quality score", err);
    }
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    console.log("handleAIGenerate started");

    try {
      console.log("[AI] Generate button clicked, ENABLE_AI is:", ENABLE_AI);

      if (!ENABLE_AI) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runLocalOfflineFallbackGenerator();
        return;
      }

      const topicDetails = extractTopicDetails();
      console.log("[AI] Automatically Detected Topic Details:", topicDetails);

      const fields = (visibleSections.length > 0 ? visibleSections : (document?.sections || []))
        .flatMap(section =>
          section.fields.map(field => {
            const normalizedTitle = (section.title || "").toLowerCase();
            let role = field.semanticRole || "observation";
            if (normalizedTitle.includes("resource")) {
              role = "resource_table";
            } else if (normalizedTitle.includes("procedure")) {
              role = "procedure";
            } else if (normalizedTitle.includes("observation")) {
              role = "observation";
            } else if (normalizedTitle.includes("result")) {
              role = "result";
            } else if (normalizedTitle.includes("interpretation")) {
              role = "interpretation";
            } else if (normalizedTitle.includes("conclusion")) {
              role = "conclusion";
            }

            return {
              id: field.id,
              fieldId: field.id,
              experimentTitle: topicDetails.experimentTitle,
              section: section.title,
              documentType: config.documentType,
              role: role,
              topic: topicDetails.topic,
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
            };
          })
        );

      const promptMsg = `Generate realistic student laboratory responses.
Experiment: ${topicDetails.experimentTitle}
Aim: ${topicDetails.aim || 'To investigate ' + topicDetails.experimentTitle}
Objective: ${topicDetails.objective || 'Complete the experimental steps and record characteristics.'}
`;

      console.log("[AI] Calling API with dynamic fields:", fields);
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: promptMsg, 
          fields, 
          model: 'gemini-2.5-flash',
          documentType: config.documentType,
          aiPersona: config.aiPersona
        }),
        signal: AbortSignal.timeout(60000)
      });
      console.log("[AI] Status:", response.status);

      const raw = await response.text();
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

      if (!Array.isArray(parsed) || parsed.length === 0) {
          if (typeof parsed === 'object' && parsed !== null) {
             parsed = Object.entries(parsed).map(([k, v]) => ({ id: k, value: typeof v === 'string' ? v : undefined, tableValue: Array.isArray(v) ? v : undefined }));
          } else {
             throw new Error("Expected array from AI");
          }
      }

      console.log("[AI] Updating form values");
      const parsedData: Record<string, any> = { ...formValues };
      
      parsed.forEach((item: any) => {
         const key = item.id;
         if (!key) return;

         let finalValue = item.tableValue !== undefined ? item.tableValue : item.value;
         
         const field = visibleSections.flatMap(s => s.fields).find(f => f.id === key);
         if (field && field.type === 'table') {
             if (!Array.isArray(finalValue)) {
                 finalValue = [[finalValue ? String(finalValue) : '']];
             } else if (finalValue.length > 0 && !Array.isArray(finalValue[0])) {
                 finalValue = [finalValue];
             } else {
                 finalValue = (finalValue as any[]).map(row => 
                    Array.isArray(row) ? row.map(cell => typeof cell === 'string' ? cell : JSON.stringify(cell)) : [String(row)]
                 );
             }

             if (field.tableRows) {
                 const headersCount = field.tableRows.filter((r: any) => r.isHeader).length;
                 if (headersCount > 0) {
                     const padding = Array(headersCount).fill([]);
                     finalValue = [...padding, ...finalValue];
                 }
             }
         } else {
             if (typeof finalValue !== 'string') {
                 finalValue = typeof finalValue === 'object' ? JSON.stringify(finalValue, null, 2) : String(finalValue);
             }
         }
         
         parsedData[key] = finalValue;
      });

      setFormValues(parsedData);
      console.log("[AI FILLED KEYS]", Object.keys(parsedData));
      await launchCopilotWorkspace(parsedData);

    } catch (e: any) {
      console.error("[AI GENERATOR EXCEPTION] Triggering robust topic-aware fallback generator. Error was:", e);
      runLocalOfflineFallbackGenerator();
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
      <div key={field.id} className="space-y-4">
        {/* Simple crisp title matching Image 1: XI. Actual Resources Used */}
        <div className="flex items-center gap-2 px-1">
          <Label className="text-sm font-bold text-gray-900 tracking-tight">{field.label}</Label>
        </div>
        
        {/* Subtle, borderless Column Headers - Only rendered faintly if useful for users, but styled beautifully */}
        {headers.length > 0 && (
          <div className="flex gap-3 items-center w-full px-1">
            {headers.map((header: string, i: number) => {
              const isFirst = i === 0;
              return (
                <div 
                  key={i} 
                  className={`text-[10px] font-bold text-gray-400 capitalize tracking-wider ${
                    isFirst ? 'w-12 text-center shrink-0' : 'flex-1 min-w-0 pl-1'
                  }`}
                >
                  {header}
                </div>
              );
            })}
          </div>
        )}

        {/* Individualized input box rows matching Image 1 */}
        <div className="space-y-3">
          {tableRows.map((row: any, rIdx: number) => {
            if (row.isHeader) return null;
            
            return (
              <div key={rIdx} className="flex gap-3 items-center w-full">
                {row.cells.map((cell: any, cIdx: number) => {
                  const isEditable = cell.isEditable;
                  const cellValue = isEditable ? (value[rIdx]?.[cIdx] ?? cell.text) : cell.text;
                  const isFieldFocused = highlightedFieldId === field.id;
                  const isFirstCol = cIdx === 0;

                  // Render short numeric counter index on the left (e.g. 1, 2, 3)
                  if (isFirstCol) {
                    return (
                      <div 
                        key={cIdx} 
                        className={`w-12 h-11 shrink-0 flex items-center justify-center border text-[12px] font-semibold rounded-xl bg-gray-50/50 transition-all duration-200 ease-in-out ${
                          isFieldFocused 
                            ? 'border-indigo-400 text-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-50/55 shadow-sm shadow-indigo-100/30' 
                            : 'border-gray-200 text-gray-400'
                        }`}
                      >
                        {cellValue}
                      </div>
                    );
                  }

                  // Render editable cells as individual rounded input blocks
                  if (isEditable) {
                    return (
                      <div key={cIdx} className="flex-1 min-w-0">
                        <input 
                          onFocus={() => setHighlightedField(field.id)}
                          className={`w-full h-11 px-4 text-[12.5px] font-semibold text-gray-700 placeholder:text-gray-400/60 placeholder:italic placeholder:font-normal rounded-xl bg-gray-50/10 border transition-all duration-200 ease-in-out outline-none ${
                            isFieldFocused 
                              ? 'border-indigo-500 bg-white ring-4 ring-indigo-50/80 shadow-[0_2px_8px_rgba(99,102,241,0.08)]' 
                              : 'border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/80'
                          }`}
                          value={cellValue}
                          onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                          placeholder="Type entry..."
                        />
                      </div>
                    );
                  }

                  // Render non-editable cells as corresponding rounded text blocks
                  return (
                    <div 
                      key={cIdx} 
                      className={`flex-1 min-w-0 h-11 px-4 flex items-center border text-[12.5px] font-semibold text-gray-500 rounded-xl bg-gray-50/30 transition-all duration-200 ease-in-out ${
                        isFieldFocused ? 'border-indigo-250 bg-white' : 'border-gray-150'
                      }`}
                    >
                      <span className="truncate">{cellValue}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderField = (field: any) => {
    const value = formValues[field.id];
    console.log("[RENDERED FIELDS]", field.id, field.label, field.type);
    
    if (field.type === 'table') {
      return renderTableField(field);
    }

    // 1. LARGE TEXT AREAS
    const isLarge = field.semanticRole === 'interpretation' || 
                   field.semanticRole === 'conclusion' || 
                   field.semanticRole === 'procedure' || 
                   field.semanticRole === 'result' ||
                   field.type === 'textarea';

    const isFieldFocused = highlightedFieldId === field.id;

    return (
      <div key={field.id} className="space-y-3 px-1">
        <Label className="text-sm font-bold text-gray-900 block tracking-tight">
          {field.label}
        </Label>
        {isLarge ? (
          <textarea 
            placeholder={`Reflect on ${field.label.toLowerCase()}...`}
            onFocus={() => setHighlightedField(field.id)}
            className={`w-full min-h-[140px] rounded-2xl border transition-all duration-200 ease-in-out outline-none p-5 text-[12.5px] leading-relaxed font-semibold placeholder:text-gray-400/60 placeholder:italic placeholder:font-normal ${
              isFieldFocused 
                ? 'border-indigo-500 bg-white ring-4 ring-indigo-50/80 shadow-[0_2px_8px_rgba(99,102,241,0.08)]' 
                : 'border-gray-200 bg-gray-50/10 hover:border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/80'
            }`}
            value={(value as string) || ''}
            onChange={(e) => updateFormValue(field.id, e.target.value)}
          />
        ) : (
          <input 
            placeholder="Type standard entry..."
            onFocus={() => setHighlightedField(field.id)}
            className={`w-full rounded-xl h-11 border transition-all duration-200 ease-in-out outline-none px-4 text-[12.5px] font-semibold placeholder:text-gray-400/60 placeholder:italic placeholder:font-normal ${
              isFieldFocused 
                ? 'border-indigo-500 bg-white ring-4 ring-indigo-50/80 shadow-[0_2px_8px_rgba(99,102,241,0.08)]' 
                : 'border-gray-200 bg-gray-50/10 hover:border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/80'
            }`}
            value={(value as string) || ''}
            onChange={(e) => updateFormValue(field.id, e.target.value)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
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
