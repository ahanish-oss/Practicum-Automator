import React, { useEffect, useState } from 'react';
import { db, Draft } from '@/src/lib/db';
import { useStore } from '@/src/store/useStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, X, Trash2, LoaderCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DraftsPanel({ onClose }: { onClose: () => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const { setFormValues } = useStore();

  useEffect(() => { loadDrafts(); }, []);

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
      className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-2xl h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-900">Local Drafts</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-gray-400">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-gray-50 rounded-3xl">
              <p className="text-xs font-medium text-gray-300">No recent drafts</p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div 
                key={draft.id}
                onClick={() => handleSelect(draft)}
                className="group p-4 bg-gray-50/50 border border-gray-50 rounded-2xl cursor-pointer hover:border-indigo-100 transition-all hover:bg-white"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[13px] font-semibold text-gray-900 line-clamp-1">{draft.templateName}</p>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                      {new Date(draft.timestamp).toLocaleTimeString()} • {new Date(draft.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, draft.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
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
