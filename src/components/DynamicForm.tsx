import { useStore } from '@/src/store/useStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Section } from '@/src/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ListOrdered, Table as TableIcon, AlignLeft, UserCircle, CheckCircle2, Circle, Plus } from 'lucide-react';

export function DynamicForm() {
  const { document, formValues, updateFormValue, setHighlightedField } = useStore();

  if (!document) return null;

  const renderField = (field: any) => {
    const value = formValues[field.id];
    const isFilled = !!value;

    if (field.type === 'table') {
      const tableData = (value as string[][]) || Array.from({ length: field.rows || 3 }).map((_, rIdx) => {
        const row = field.headers.map(() => '');
        // Auto-fill S.No if empty
        if (field.headers[0].toLowerCase().includes('s.no') || field.headers[0].toLowerCase().includes('no')) {
          row[0] = String(rIdx + 1);
        }
        return row;
      });

      const updateTableCell = (rIdx: number, cIdx: number, val: string) => {
        const newData = [...tableData];
        newData[rIdx] = [...newData[rIdx]];
        newData[rIdx][cIdx] = val;
        
        // Ensure S.No is preserved if it was deleted or changed manually and headers suggest it's a counter
        if (cIdx !== 0 && (field.headers[0].toLowerCase().includes('s.no') || field.headers[0].toLowerCase().includes('no')) && !newData[rIdx][0]) {
           newData[rIdx][0] = String(rIdx + 1);
        }
        
        updateFormValue(field.id, newData);
      };

      const addRow = () => {
        const newRow = field.headers.map(() => '');
        if (field.headers[0].toLowerCase().includes('s.no') || field.headers[0].toLowerCase().includes('no')) {
          newRow[0] = String(tableData.length + 1);
        }
        updateFormValue(field.id, [...tableData, newRow]);
      };

      return (
        <div key={field.id} className="space-y-4 pt-2">
          <div className="space-y-2">
            {tableData.map((row, rIdx) => (
              <motion.div 
                key={rIdx} 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <div className="flex-none w-8 flex items-center justify-center text-[10px] font-medium text-slate-300 bg-slate-50/50 rounded-lg border border-slate-100">
                  {rIdx + 1}
                </div>
                <div className="flex-1 grid grid-flow-col auto-cols-fr gap-2">
                  {field.headers?.slice(1).map((_: any, chIdx: number) => {
                    const cIdx = chIdx + 1;
                    return (
                      <input
                        key={cIdx}
                        className="w-full bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:border-slate-300 dark:focus:border-zinc-600 transition-all placeholder:text-slate-200"
                        value={row[cIdx] || ""}
                        onFocus={() => setHighlightedField(field.id)}
                        onBlur={() => setHighlightedField(null)}
                        onChange={(e) => updateTableCell(rIdx, cIdx, e.target.value)}
                        placeholder={field.headers[cIdx]}
                      />
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
          {field.isDynamic && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={addRow}
              className="w-full border border-dashed border-slate-100 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-black hover:bg-slate-50 transition-all py-6 h-auto"
            >
              <Plus className="w-3 h-3 mr-2" /> Add {field.label.split(' ')[0]} Row
            </Button>
          )}
        </div>
      );
    }

    if (field.type === 'list') {
      const listData = (value as string[]) || Array.from({ length: field.rows || 6 }).map(() => '');

      const updateListItem = (idx: number, val: string) => {
        const newData = [...listData];
        newData[idx] = val;
        updateFormValue(field.id, newData);
      };

      const addStep = () => {
        updateFormValue(field.id, [...listData, '']);
      };

      const addButtonLabel = field.label.toLowerCase().includes('procedure') ? 'Step' : 'List Item';

      return (
        <div key={field.id} className="space-y-4 pt-2">
          <div className="space-y-2.5">
            {listData.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-center group">
                <span className="text-[10px] font-bold text-slate-300 w-4 pl-1">{idx + 1}.</span>
                <input
                  className="flex-1 rounded-lg border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2.5 text-xs focus:outline-none focus:border-slate-300 dark:focus:border-zinc-600 transition-all placeholder:text-slate-200"
                  value={item || ""}
                  onFocus={() => setHighlightedField(field.id)}
                  onBlur={() => setHighlightedField(null)}
                  onChange={(e) => updateListItem(idx, e.target.value)}
                  placeholder="..."
                />
              </div>
            ))}
          </div>
          {field.isDynamic && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={addStep}
              className="w-full border border-dashed border-slate-100 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-black hover:bg-slate-50 transition-all py-6 h-auto"
            >
              <Plus className="w-3 h-3 mr-2" /> Add {addButtonLabel}
            </Button>
          )}
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-3">
        <div className="flex justify-between items-center group">
          <Label className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200">
            {field.label}
          </Label>
        </div>
        
        {field.type === 'textarea' ? (
          <div className="relative">
            <textarea 
              placeholder="Enter details..."
              className="w-full min-h-[100px] rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:border-slate-300 dark:focus:border-zinc-600 transition-all resize-none p-4 text-xs leading-relaxed"
              value={(value as string) || ''}
              onFocus={() => setHighlightedField(field.id)}
              onBlur={() => setHighlightedField(null)}
              onChange={(e) => updateFormValue(field.id, e.target.value)}
            />
            <div className="absolute right-3 bottom-3 text-slate-300 pointer-events-none">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
          </div>
        ) : (
          <input 
            placeholder="Type here..."
            className="w-full rounded-xl h-11 border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:border-slate-300 dark:focus:border-zinc-600 transition-all px-4 text-xs"
            value={(value as string) || ''}
            onFocus={() => setHighlightedField(field.id)}
            onBlur={() => setHighlightedField(null)}
            onChange={(e) => updateFormValue(field.id, e.target.value)}
          />
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full pr-4 -mr-4">
      <div className="space-y-8 pb-32">
        {document.sections.map((section: Section, sIdx: number) => {
          const filledFields = section.fields.filter(f => {
            const val = formValues[f.id];
            if (Array.isArray(val)) return val.some(v => v !== '');
            return !!val;
          }).length;
          
          const totalFields = section.fields.length;
          const isComplete = totalFields > 0 && filledFields === totalFields;

          return (
            <motion.div 
              key={section.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.05 }}
              className={`relative border rounded-3xl p-10 transition-all duration-500 overflow-hidden ${
                isComplete 
                ? 'border-green-400/20 bg-green-50/5 dark:bg-green-950/5 shadow-lg shadow-green-500/5' 
                : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md'
              }`}
            >
              {isComplete && (
                <div className="absolute top-0 right-0 p-6">
                   <div className="bg-green-500 rounded-full p-1 shadow-lg shadow-green-500/20">
                     <CheckCircle2 className="w-4 h-4 text-white" />
                   </div>
                </div>
              )}

          <div className="flex flex-col gap-1 mb-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-300 dark:text-zinc-700 uppercase tracking-[0.3em]">Phase {sIdx + 1}</span>
                    <div className="h-[1px] w-24 bg-slate-50 dark:bg-zinc-800" />
                  </div>
                  {isComplete && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-950/30 rounded-full border border-green-100 dark:border-green-900/50">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Verified</span>
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter mt-4 capitalize">
                  {section.title.toLowerCase()}
                </h3>
              </div>

              <div className="space-y-8">
                {section.fields.map(renderField)}
                {section.fields.length === 0 && (
                  <div className="py-6 px-6 bg-slate-50/30 dark:bg-zinc-800/30 rounded-xl border border-dashed border-slate-100 dark:border-zinc-700 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                      No faculty comments yet.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
