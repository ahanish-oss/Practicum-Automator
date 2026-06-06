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
  Layers
} from 'lucide-react';
import { useState } from 'react';

export function DynamicForm() {
  const { document, formValues, updateFormValue, setHighlightedField } = useStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!document) return null;

  // Initialize first section as active
  if (!activeSection && document.sections.length > 0) {
    setActiveSection(document.sections[0].id);
  }

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
                  <th key={i} className="px-4 py-3 text-left font-bold text-gray-500 border-b border-gray-100 first:pl-6">
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
                      const cellValue = value[rIdx]?.[cIdx] ?? cell.text;
                      const isEditable = cell.isEditable;
                      
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
      {document.sections.map((section: Section, sIdx: number) => {
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
                           <span className="text-[10px] font-bold text-gray-600 capitalize">{section.intent.replace('-', ' ')}</span>
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
      {!document.sections.length && (
         <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
               <Layers className="w-6 h-6 text-gray-300" />
            </div>
            <div className="space-y-1">
               <h4 className="text-sm font-semibold text-gray-900">No input fields found</h4>
               <p className="text-xs text-gray-400">We couldn't detect any student sections in this document.</p>
            </div>
         </div>
      )}
    </div>
  );
}
