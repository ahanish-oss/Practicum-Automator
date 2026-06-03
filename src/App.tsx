/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { FileUploader } from './components/FileUploader';
import { DynamicForm } from './components/DynamicForm';
import { DocPreview } from './components/DocPreview';
import { DocumentInspector } from './components/DocumentInspector';
import { DraftsPanel } from './components/DraftsPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, RotateCcw, CheckCircle2, Layout, SlidersHorizontal, Database, X, History } from 'lucide-react';
import { exportDocx } from './lib/exporter';
import { db } from './lib/db';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const { 
    document: appDocument, 
    isLoading, 
    analysisProgress, 
    isDarkMode, 
    resetAll,
    formValues 
  } = useStore();

  const [showInspector, setShowInspector] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);

  const handleSaveDraft = async () => {
    if (!appDocument) return;
    await db.saveDraft(appDocument.name, formValues);
    setShowDrafts(true);
  };

  useEffect(() => {
    if (isDarkMode) {
      window.document.documentElement.classList.add('dark');
    } else {
      window.document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleDownload = async () => {
    if (!appDocument) return;
    await exportDocx(appDocument, formValues);
  };

  const completionRate = appDocument && appDocument.stats.fieldCount > 0 ? Math.floor(
    (Object.keys(formValues).filter(k => formValues[k]).length / appDocument.stats.fieldCount) * 100
  ) : 0;

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-300 font-sans text-slate-900 dark:text-zinc-100`}>
      {/* Enterprise Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-black dark:bg-white p-1.5 rounded-lg">
              <FileText className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase">Practicum.</span>
          </div>
          
          <nav className="flex items-center gap-1">
            {['Overview', 'Problems (11)', 'Quizzes (0)', 'Document', 'My Team'].map((tab) => (
              <button 
                key={tab}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg ${
                  tab === 'Document' 
                  ? 'bg-slate-100 text-black dark:bg-zinc-800 dark:text-white' 
                  : 'text-slate-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {appDocument && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowInspector(!showInspector)}
              className={`gap-2 text-[9px] font-black uppercase tracking-widest ${showInspector ? 'text-blue-500 bg-blue-50/50' : 'text-slate-400'}`}
            >
              <Database className="w-3.5 h-3.5" />
              Inspector
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDrafts(!showDrafts)}
            className={`gap-2 text-[9px] font-black uppercase tracking-widest ${showDrafts ? 'text-blue-500 bg-blue-50/50' : 'text-slate-400'}`}
          >
            <History className="w-3.5 h-3.5" />
            Drafts
          </Button>
          <button 
            onClick={handleSaveDraft}
            className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 text-slate-500 hover:text-black transition-colors"
          >
            Save Draft
          </button>
          <Badge className="bg-slate-800 text-white dark:bg-zinc-100 dark:text-black rounded-lg px-3 py-1 text-[10px] font-bold">Submitted</Badge>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button variant="ghost" size="icon" onClick={resetAll} className="rounded-full">
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </Button>
        </div>
      </header>


      <main className="max-w-[1500px] mx-auto p-12 space-y-12">
        {!appDocument ? (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center items-center min-h-[50vh]"
          >
            <div className="w-full max-w-xl text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl font-black tracking-tighter">Professional <span className="text-slate-300">Automation.</span></h1>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.2em]">Upload your practicum template to begin</p>
              </div>
              <FileUploader />
              {isLoading && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analyzing Protocol...</span>
                    <span className="text-xs font-bold">{analysisProgress}%</span>
                  </div>
                  <Progress value={analysisProgress} className="h-1" />
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            {/* Template Card */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8"
            >
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Document Template</h3>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold text-slate-900 dark:text-zinc-100">{appDocument.name}</span>
                  <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span>LATEST SAVE: <span className="text-slate-800">JUNE 2, 2026</span></span>
                    <span>ENGINE STATUS: <span className="text-green-500">READY</span></span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={handleDownload} className="h-12 px-8 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/10">
                  Generate Document
                </Button>
                <Button variant="outline" className="h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest border-slate-200">
                  Download Template
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative"
            >
              {/* Preview System (Left) */}
              <div className={`${showInspector ? 'lg:col-span-4' : 'lg:col-span-7'} space-y-6 transition-all duration-500`}>
                 <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl">
                    <Layout className="w-4 h-4 text-slate-500" />
                  </div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-zinc-300">Professional Preview</h2>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl p-1 h-[900px]">
                  <div className="bg-slate-50/50 dark:bg-zinc-950/50 rounded-[2.25rem] h-full overflow-hidden">
                    <DocPreview />
                  </div>
                </div>
              </div>

              {/* Form System (Right) */}
              <div className={`${(showInspector || showDrafts) ? 'lg:col-span-4' : 'lg:col-span-5'} space-y-6 transition-all duration-500`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl">
                      <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-zinc-300">Intake Protocol</h2>
                  </div>
                  <div className="bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-zinc-700">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress: {completionRate}%</span>
                  </div>
                </div>
                <div className="h-[900px] overflow-hidden">
                  <DynamicForm />
                </div>
              </div>

              {/* Inspector Panel (Optional Side) */}
              <AnimatePresence>
                {showInspector && (
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    className="lg:col-span-4 h-[930px]"
                  >
                    <DocumentInspector />
                  </motion.div>
                )}
                {showDrafts && (
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    className="lg:col-span-4 h-[930px]"
                  >
                    <DraftsPanel onClose={() => setShowDrafts(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </main>

      <footer className="py-8 border-t border-slate-200 dark:border-zinc-800 mt-20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-400 uppercase tracking-widest">
          <p>© 2026 Practicum Automation Platform</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Client-Side Only</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> No Data Collection</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
