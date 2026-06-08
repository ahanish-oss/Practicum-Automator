import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { FileUploader } from './components/FileUploader';
import { DynamicForm } from './components/DynamicForm';
import { DocPreview } from './components/DocPreview';
import { DraftsPanel } from './components/DraftsPanel';
import { AnalysisProgress } from './components/AnalysisProgress';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { HistoryPanel } from './components/HistoryPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, RotateCcw, CheckCircle2, History, Eye, Loader2, LogOut, User, Clock } from 'lucide-react';
import { exportDocx, generateDocxBlob } from './lib/exporter';
import { db } from './lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAs } from 'file-saver';
import { 
  getCurrentUser, 
  loginUser, 
  createUser, 
  logoutUser, 
  saveDocumentHistory,
  type User as AuthUser,
  type DocumentHistory
} from './lib/auth';

export default function App() {
  const { 
    document: appDocument, 
    analysisProgress, 
    resetAll,
    formValues,
    generatedDocxBlob,
    previewMode,
    setGeneratedDocxBlob,
    setPreviewMode,
    setDocument,
    setFormValues
  } = useStore();

  const [showDrafts, setShowDrafts] = useState(false);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showLanding, setShowLanding] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Check for existing user session on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setShowLanding(false);
    }
  }, []);

  const handleSaveDraft = async () => {
    if (!appDocument || !currentUser) return;
    await db.saveDraft(appDocument.name, formValues);
    
    // Save to user's history
    saveDocumentHistory(
      currentUser.id,
      appDocument.name,
      formValues,
      appDocument.sections
    );
    
    setShowDrafts(true);
  };

  const validateAndGenerateBlob = async (): Promise<Blob | null> => {
    if (!appDocument) return null;

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
        return null;
      }
    }

    try {
      const blob = await generateDocxBlob(appDocument, formValues);
      setGeneratedDocxBlob(blob);
      return blob;
    } catch (error) {
      console.error("Failed to generate DOCX blob:", error);
      alert("Failed to generate document. Please check the template format.");
      return null;
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Use a slight timeout to revoke the object URL so the browser/download manager has time to start downloading
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleGenerateReport = async () => {
    const blob = await validateAndGenerateBlob();
    if (blob && appDocument && currentUser) {
      downloadFile(blob, `Filled_${appDocument.name}`);
      
      // Save to history after successful generation
      saveDocumentHistory(
        currentUser.id,
        appDocument.name,
        formValues,
        appDocument.sections
      );
    }
  };

  const handlePreviewGenerated = async () => {
    const blob = await validateAndGenerateBlob();
    if (blob) {
      setPreviewMode('generated');
      // Scroll to the preview area
      setTimeout(() => {
        const previewEl = document.querySelector('.docx-viewer-container');
        if (previewEl) {
          previewEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleDownloadDocx = () => {
    if (!generatedDocxBlob) {
      alert("Generate the report before previewing.");
      return;
    }
    downloadFile(generatedDocxBlob, `Filled_${appDocument.name}`);
  };

  const handleDownloadPdf = async () => {
    if (!generatedDocxBlob) {
      alert("Generate the report before exporting.");
      return;
    }
    if (!appDocument) return;

    setIsConvertingPdf(true);
    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(generatedDocxBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          const response = await fetch('/api/convert-to-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ docx: base64Data })
          });
          const data = await response.json();
          if (data.success && data.pdf) {
            const pdfBlob = new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], { type: 'application/pdf' });
            downloadFile(pdfBlob, `Filled_${appDocument.name.replace('.docx', '')}.pdf`);
          } else {
            alert(data.error || "Unable to generate PDF. Please try again.");
          }
        } catch (e) {
          console.error("PDF conversion endpoint error:", e);
          alert("Unable to generate PDF. Please try again.");
        } finally {
          setIsConvertingPdf(false);
        }
      };
    } catch (err) {
      console.error("Failed to read DOCX blob:", err);
      alert("Unable to generate PDF. Please try again.");
      setIsConvertingPdf(false);
    }
  };

  const handleAuth = (email: string, password: string, name?: string) => {
    try {
      let user: AuthUser;
      if (authMode === 'signup') {
        user = createUser(email, password, name!);
      } else {
        user = loginUser(email, password);
      }
      setCurrentUser(user);
      setShowAuth(false);
      setShowLanding(false);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logoutUser();
      setCurrentUser(null);
      resetAll();
      setShowLanding(true);
    }
  };

  const handleGetStarted = () => {
    setShowAuth(true);
    setAuthMode('signup');
  };

  const handleLoadHistory = (entry: DocumentHistory) => {
    // Reconstruct document from history
    const doc = {
      name: entry.documentName,
      type: 'docx' as const,
      originalContent: '',
      sections: entry.sections,
      stats: {
        sectionCount: entry.sections.length,
        fieldCount: entry.sections.reduce((acc, s) => acc + s.fields.length, 0),
        completionPercentage: 100
      }
    };
    setDocument(doc);
    setFormValues(entry.formValues);
    setShowHistory(false);
  };

  // Show landing page if not authenticated
  if (showLanding || !currentUser) {
    return (
      <>
        <div className="min-h-screen flex flex-col bg-white">
          {/* Auth Header */}
          <header className="absolute top-0 left-0 right-0 z-10 py-6 px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100/50">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-[13px] font-semibold text-gray-900 tracking-tight">Practicum Intelligence</h1>
                  <span className="text-[11px] text-gray-400 font-medium">Document Automation</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuth(true);
                  }}
                  className="text-gray-600 hover:text-gray-900 font-semibold"
                >
                  Login
                </Button>
                <Button
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuth(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-semibold shadow-lg shadow-indigo-200"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </header>

          <LandingPage onGetStarted={handleGetStarted} />
        </div>

        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          mode={authMode}
          onSwitch={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
          onAuth={handleAuth}
        />
      </>
    );
  }

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
            {/* User Menu */}
            <div className="flex items-center gap-3 pr-3 border-r border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="gap-2 text-[11px] font-medium text-gray-500 hover:text-indigo-600"
              >
                <Clock className="w-4 h-4" />
                History
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-xs font-semibold text-gray-700">{currentUser.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-500 w-9 h-9 p-0"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

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
                   onClick={handlePreviewGenerated}
                   variant="outline"
                   className="border-gray-200 text-gray-700 hover:text-indigo-600 rounded-xl px-4 h-11 text-[11px] font-semibold transition-all hover:bg-gray-50"
                >
                   <Eye className="w-4 h-4 mr-2" />
                   Preview Generated Report
                </Button>

                <Button 
                   onClick={handleGenerateReport}
                   className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 h-11 text-[11px] font-semibold shadow-xl shadow-indigo-100 transition-all border-none"
                >
                   <Download className="w-4 h-4 mr-2" />
                   Generate Report
                </Button>

                {generatedDocxBlob && (
                  <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
                    <Button 
                       onClick={handleDownloadDocx}
                       variant="outline"
                       className="border-indigo-100 text-indigo-600 hover:bg-indigo-50/50 rounded-xl px-4 h-11 text-[11px] font-semibold transition-all"
                    >
                       Download DOCX
                    </Button>
                    <Button 
                       onClick={handleDownloadPdf}
                       variant="outline"
                       className="border-indigo-100 text-indigo-600 hover:bg-indigo-50/50 rounded-xl px-4 h-11 text-[11px] font-semibold transition-all flex items-center gap-2"
                       disabled={isConvertingPdf}
                    >
                       {isConvertingPdf ? (
                         <>
                           <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                           Converting...
                         </>
                       ) : (
                         <>
                           <Download className="w-4 h-4" />
                           Download PDF
                         </>
                       )}
                    </Button>
                  </div>
                )}
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
                         
                         {/* Toggle Tabs for Original vs Generated Preview */}
                         <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                           <button
                             onClick={() => setPreviewMode('original')}
                             className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                               previewMode === 'original' 
                                 ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/20' 
                                 : 'text-gray-500 hover:text-gray-900 border border-transparent'
                             }`}
                           >
                             Original Template
                           </button>
                           <button
                             onClick={() => setPreviewMode('generated')}
                             className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                               previewMode === 'generated' 
                                 ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/20' 
                                 : 'text-gray-500 hover:text-gray-900 border border-transparent'
                             }`}
                           >
                             Generated Report
                           </button>
                         </div>
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

      {/* History Panel */}
      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        userId={currentUser.id}
        onLoadHistory={handleLoadHistory}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        mode={authMode}
        onSwitch={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
        onAuth={handleAuth}
      />
    </div>
  );
}
