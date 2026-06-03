import React, { useEffect, useState } from 'react';
import { db, Draft } from '@/src/lib/db';
import { useStore } from '@/src/store/useStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, X, Trash2, LoaderCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DraftsPanel({ onClose }: { onClose: () => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const { setFormValues, document } = useStore();

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    const list = await db.getDrafts();
    setDrafts(list);
  };

  const handleSelect = (draft: Draft) => {
    setFormValues(draft.data);
    onClose();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await db.deleteDraft(id);
    loadDrafts();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <History className="w-4 h-4 text-slate-400" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-zinc-300">Local Drafts</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-50 dark:border-zinc-800 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No drafts found</p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div 
                key={draft.id}
                onClick={() => handleSelect(draft)}
                className="group p-4 bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800 rounded-2xl cursor-pointer hover:border-slate-300 dark:hover:border-zinc-600 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-zinc-100 line-clamp-1">{draft.templateName}</p>
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                      {new Date(draft.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, draft.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
