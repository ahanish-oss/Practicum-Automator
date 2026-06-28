/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { renderAsync } from 'docx-preview';
import { X, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAs } from 'file-saver';

interface GeneratedDocPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GeneratedDocPreviewModal({ isOpen, onClose }: GeneratedDocPreviewModalProps) {
  const { generatedDocxBlob, document: appDocument } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!isOpen || !generatedDocxBlob || !containerRef.current) return;

    const renderDoc = async () => {
      setRendering(true);
      setError(null);
      const container = containerRef.current;
      if (!container) return;

      try {
        container.innerHTML = '';
        
        // Render the generated DOCX blob utilizing docx-preview
        await renderAsync(generatedDocxBlob, container, undefined, {
          className: "docx-generated-fidelity",
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          debug: false,
          experimental: true,
          trimXmlDeclaration: true,
          useBase64URL: true,
        });

        // Apply premium styling to rendered document sheets
        const pages = container.querySelectorAll('.docx-generated-fidelity section');
        pages.forEach((page) => {
          const el = page as HTMLElement;
          el.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
          el.style.marginBottom = '2.5rem';
          el.style.marginLeft = 'auto';
          el.style.marginRight = 'auto';
          el.style.backgroundColor = 'white';
          el.style.borderRadius = '8px';
          el.style.padding = '1in'; // standard 1-inch Word margins
          el.style.border = '1px solid rgba(229, 231, 235, 0.5)';
        });
      } catch (err: any) {
        console.error('Generated document preview render failed:', err);
        setError("Unable to preview generated document.");
      } finally {
        setRendering(false);
      }
    };

    renderDoc();
  }, [isOpen, generatedDocxBlob]);

  const handleDownload = () => {
    if (generatedDocxBlob && appDocument) {
      saveAs(generatedDocxBlob, `Filled_${appDocument.name}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-gray-900/90 backdrop-blur-md"
        >
          {/* Header Panel */}
          <header className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <span className="text-indigo-400 font-bold text-xs uppercase">Preview</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-white">Generated Report Preview</h3>
                <span className="text-[11px] text-gray-400 font-medium">{appDocument?.name || 'Document'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 h-10 text-[11px] font-semibold transition-all flex items-center justify-center cursor-pointer border-none shadow-lg shadow-indigo-900/40"
              >
                <Download className="w-4 h-4 mr-2" />
                Download DOCX
              </button>
              
              <div className="w-px h-6 bg-gray-800 mx-1" />

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 w-10 h-10 rounded-xl flex items-center justify-center transition-colors border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Preview Container Area */}
          <div className="flex-1 overflow-y-auto py-12 px-4 scrollbar-hide flex flex-col items-center">
            {rendering && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-xs text-gray-400 font-medium">Rendering generated document sheets...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-md w-full text-center space-y-4 my-20">
                <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-white text-sm font-semibold">Preview Failed</h4>
                  <p className="text-xs text-gray-400">{error}</p>
                </div>
                <button
                  onClick={onClose}
                  className="bg-gray-800 hover:bg-gray-750 text-white rounded-xl px-4 py-2 text-[11px] font-semibold border-none cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            )}

            {!rendering && !error && (
              <div 
                ref={containerRef} 
                className="w-full max-w-[900px] mx-auto docx-generated-container my-4"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
