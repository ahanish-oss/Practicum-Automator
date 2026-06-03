import React from 'react';
import { useStore } from '../store/useStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Search, CheckCircle, XCircle } from 'lucide-react';

export function DocumentInspector() {
  const { document, formValues } = useStore();

  if (!document) return null;

  const totalFields = document.sections.reduce((acc, s) => acc + s.fields.length, 0);
  const mappedFields = document.sections.reduce((acc, s) => 
    acc + s.fields.filter(f => f.mapping).length, 0
  );

  return (
    <Card className="bg-slate-900 border-slate-800 p-6 text-white overflow-hidden flex flex-col h-full rounded-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Engine Inspector</h2>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">
            {mappedFields}/{totalFields} MAPPED
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {document.sections.map((section) => (
          <div key={section.id} className="space-y-2">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 p-2 rounded-lg">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.fields.map((field) => {
                const value = formValues[field.id];
                const isMapped = !!field.mapping;
                const hasValue = !!value && (!Array.isArray(value) || value.length > 0);

                return (
                  <div key={field.id} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-300 truncate max-w-[150px]">
                        {field.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {isMapped ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        {hasValue && (
                           <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                    {isMapped && (
                      <div className="flex items-center gap-2 text-[8px] font-mono text-slate-500">
                        <span className="bg-slate-800 px-1 rounded uppercase">{field.mapping?.type}</span>
                        {field.mapping?.paragraphIndex !== undefined && (
                          <span>P_IDX: {field.mapping.paragraphIndex}</span>
                        )}
                        {field.mapping?.tableIndex !== undefined && (
                          <span>TBL_IDX: {field.mapping.tableIndex}</span>
                        )}
                      </div>
                    )}
                    {hasValue && (
                      <div className="mt-1 text-[9px] text-slate-400 truncate bg-black/20 p-1 rounded italic">
                         " {Array.isArray(value) ? `${value.length} rows` : String(value)} "
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
          <Search className="w-3 h-3" />
          <span>Real-time Sync Active</span>
        </div>
      </div>
    </Card>
  );
}
