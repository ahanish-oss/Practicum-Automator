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
  Monitor,
  Code2,
  Library,
  Box,
  Cpu,
  Terminal,
  Layers
} from 'lucide-react';
import { useState } from 'react';

const getResourceIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('operating')) return <Monitor className="w-4 h-4" />;
  if (l.includes('language')) return <Code2 className="w-4 h-4" />;
  if (l.includes('library')) return <Library className="w-4 h-4" />;
  if (l.includes('software')) return <Layers className="w-4 h-4" />;
  if (l.includes('hardware')) return <Cpu className="w-4 h-4" />;
  if (l.includes('simulation')) return <Terminal className="w-4 h-4" />;
  return <Box className="w-4 h-4" />;
};

export function DynamicForm() {
  const { document, formValues, updateFormValue, setHighlightedField } = useStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!document) return null;

  // Initialize first section as active
  if (!activeSection && document.sections.length > 0) {
    setActiveSection(document.sections[0].id);
  }

  const renderField = (field: any) => {
    const value = formValues[field.id];
    
    // 1. STEPPED LISTS (Procedure/Results)
    if (field.semanticRole === 'procedure' || field.semanticRole === 'result' || field.type === 'procedure-steps') {
       const items = (value as string[]) || ['', ''];
       const updateItem = (idx: number, val: string) => {
         const newItems = [...items];
         newItems[idx] = val;
         updateFormValue(field.id, newItems);
       };
       const addItem = () => updateFormValue(field.id, [...items, '']);

       const label = field.semanticRole === 'result' ? 'Expected Result' : 'Action Step';

       return (
         <div key={field.id} className="space-y-4">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{field.label}</Label>
              </div>
              <Button variant="ghost" onClick={addItem} className="h-7 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg">
                <Plus className="w-3 h-3 mr-1" /> Add Step
              </Button>
           </div>
           <div className="space-y-3">
             {items.map((item, idx) => (
               <div key={idx} className="flex gap-4 p-1">
                 <div className="flex-none w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-400">
                   {idx + 1}
                 </div>
                 <textarea
                   className="flex-1 min-h-[50px] bg-white border border-gray-100 rounded-xl px-4 py-3 text-[13px] leading-relaxed focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none font-medium placeholder:text-gray-200"
                   placeholder={`Describe ${label.toLowerCase()}...`}
                   value={item}
                   onChange={(e) => updateItem(idx, e.target.value)}
                 />
               </div>
             ))}
           </div>
         </div>
       );
    }

    // 2. LARGE TEXT AREAS
    const isLarge = field.semanticRole === 'interpretation' || field.semanticRole === 'conclusion' || field.type === 'textarea';

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

  const renderTableRow = (group: any) => {
    return (
      <div key={group.groupKey} className="group relative">
        <div className="flex flex-col gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:border-indigo-100 transition-all hover:shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 transition-colors">
              {getResourceIcon(group.rowLabel)}
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Source Row</span>
              <h4 className="text-[13px] font-bold text-gray-900">{group.rowLabel}</h4>
            </div>
            {group.fields.every((f: any) => formValues[f.id]) && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex-none">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </motion.div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.fields.map((field: any) => (
              <div key={field.id} className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">
                  {field.label}
                </Label>
                <input 
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  className="w-full bg-gray-50/50 border border-transparent rounded-xl px-3 py-2 text-[12px] font-medium text-gray-900 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 transition-all outline-none placeholder:text-gray-300"
                  value={(formValues[field.id] as string) || ''}
                  onChange={(e) => updateFormValue(field.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const groupFields = (fields: any[]) => {
    const groups: any[] = [];
    let currentTableGroup: any = null;

    fields.forEach(field => {
      if (field.tableId !== undefined && field.rowId !== undefined) {
        const groupKey = `t${field.tableId}_r${field.rowId}`;
        if (!currentTableGroup || currentTableGroup.groupKey !== groupKey) {
          currentTableGroup = {
            type: 'table-row',
            groupKey,
            rowLabel: field.rowLabel,
            semanticRole: field.semanticRole,
            fields: []
          };
          groups.push(currentTableGroup);
        }
        currentTableGroup.fields.push(field);
      } else {
        groups.push({ type: 'single', field });
        currentTableGroup = null;
      }
    });
    return groups;
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

        const groupedContent = groupFields(section.fields);

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
                       {groupedContent.map((group) => 
                         group.type === 'table-row' ? renderTableRow(group) : renderField(group.field)
                       )}
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
