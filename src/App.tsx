/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { FileUploader } from './components/FileUploader';
import { DynamicForm } from './components/DynamicForm';
import { DocPreview } from './components/DocPreview';
import { DraftsPanel } from './components/DraftsPanel';
import { AnalysisProgress } from './components/AnalysisProgress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, RotateCcw, CheckCircle2, History } from 'lucide-react';
import { exportDocx } from './lib/exporter';
import { db } from './lib/db';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const { 
    document: appDocument, 
    analysisProgress, 
    resetAll,
    formValues 
  } = useStore();

  const [showDrafts, setShowDrafts] = useState(false);

  const handleSaveDraft = async () => {
    if (!appDocument) return;
    await db.saveDraft(appDocument.name, formValues);
    setShowDrafts(true);
  };

  const validateAndExport = () => {
    if (!appDocument) return;

    // Validation: Check if all editable columns are filled for any row that has at least one entry
    const allFields = appDocument.sections.flatMap(s => s.fields);
    const tableFields = allFields.filter(f => f.tableId !== undefined && f.rowId !== undefined);

    const rowGroups: Record<string, typeof tableFields> = {};
    tableFields.forEach(f => {
      const key = `t${f.tableId}_r${f.rowId}`;
      if (!rowGroups[key]) rowGroups[key] = [];
      rowGroups[key].push(f);
    });

    for (const [key, fields] of Object.entries(rowGroups)) {
      const fieldValues = fields.map(f => (formValues[f.id] || '').toString().trim());
      const filledCount = fieldValues.filter(v => v !== '').length;

      if (filledCount > 0 && filledCount < fields.length) {
        const rowLabel = fields[0].rowLabel || 'Row';
        const missingLabels = fields
          .filter(f => !(formValues[f.id] || '').toString().trim())
          .map(f => f.label);
        
        alert(`Validation Error for "${rowLabel}": Please provide ${missingLabels.join(', ')}.`);
        return;
      }
    }

    exportDocx(appDocument, formValues);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafb]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100/50">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[13px] font-semibold text-gray-900 tracking-tight">Practicum Intelligence</h1>
                <span className="text-[11px] text-gray-400 font-medium">Document Automation</span>
              </div>
            </div>
            
            {appDocument && (
              <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                <span className="text-xs font-medium text-gray-500 line-clamp-1 max-w-[200px]">
                  {appDocument.name}
                </span>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none px-2 py-0.5 text-[10px] font-semibold">
                  Processed
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {appDocument && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowDrafts(!showDrafts)}
                  className={`gap-2 text-[11px] font-medium transition-all ${showDrafts ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500'}`}
                >
                  <History className="w-4 h-4" />
                  Drafts
                </Button>
                <div className="w-px h-4 bg-gray-100 mx-1" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetAll}
                  className="text-gray-400 hover:text-red-500 transition-colors w-10 h-10 p-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button 
                   onClick={validateAndExport}
                   className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 h-11 text-[11px] font-semibold shadow-xl shadow-indigo-100 transition-all border-none"
                >
                   <Download className="w-4 h-4 mr-2" />
                   Generate Report
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-40">
        <div className="max-w-6xl mx-auto px-8">
          <AnimatePresence mode="wait">
            {!appDocument ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-20"
              >
                <div className="text-center space-y-4 max-w-xl mx-auto mb-16">
                  <h2 className="text-4xl font-semibold tracking-tight text-gray-900 leading-tight">
                    Transform your practicum into <span className="text-indigo-600">intelligence</span>.
                  </h2>
                  <p className="text-gray-400 text-lg leading-relaxed font-medium">
                    Upload your template and we'll map all student sections semantically for effortless completion.
                  </p>
                </div>
                <FileUploader />
              </motion.div>
            ) : (
              <motion.div
                key="workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-12 space-y-20"
              >
                {analysisProgress > 0 && analysisProgress < 100 && (
                  <div className="max-w-md mx-auto py-20">
                    <AnalysisProgress />
                  </div>
                )}

                {(analysisProgress === 100 || (analysisProgress === 0 && appDocument)) && (
                  <>
                    {/* Document View */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                         <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                            <h3 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">High-Fidelity Preview</h3>
                         </div>
                         <span className="text-[10px] text-gray-300 font-medium">Standard A4 Layout • ISO 216</span>
                      </div>
                      <div className="bg-white/50 rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                        <DocPreview />
                      </div>
                    </div>

                    {/* Editor View */}
                    <div className="max-w-4xl mx-auto mt-24 space-y-12">
                      <div className="text-center space-y-3">
                        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Practicum Details</h2>
                        <p className="text-gray-400 text-sm font-medium">Fill the identified student evaluation sections below.</p>
                      </div>
                      
                      <div className="relative">
                        <DynamicForm />
                        
                        <AnimatePresence>
                          {showDrafts && (
                            <div className="fixed inset-y-0 right-0 w-[420px] z-[60] p-6 pr-8 bg-[#fafafb]/80 backdrop-blur-sm pointer-events-none">
                               <div className="h-full pointer-events-auto">
                                 <DraftsPanel onClose={() => setShowDrafts(false)} />
                               </div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Quick Save */}
                    <motion.div 
                      initial={{ y: 100 }}
                      animate={{ y: 0 }}
                      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                      <Button 
                        onClick={handleSaveDraft}
                        className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-100 rounded-2xl px-6 py-6 shadow-2xl shadow-indigo-100 flex items-center gap-3 group transition-all pointer-events-auto"
                      >
                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                           <History className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                        </div>
                        <span className="text-xs font-semibold mr-2">Save Progress as Draft</span>
                        <Badge className="bg-indigo-600 text-[10px] uppercase font-bold py-1">Auto-save</Badge>
                      </Button>
                    </motion.div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
