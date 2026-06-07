/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useStore } from '@/src/store/useStore';
import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { AlertCircle } from 'lucide-react';

export function DocPreview() {
  const { document, generatedDocxBlob, previewMode } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);

    if (previewMode === 'generated' && !generatedDocxBlob) {
      setError("Generate the report before previewing.");
      if (containerRef.current) containerRef.current.innerHTML = '';
      return;
    }

    const contentToRender = previewMode === 'generated' ? generatedDocxBlob : document?.originalContent;

    if (contentToRender && containerRef.current && document?.type === 'docx') {
      const renderDoc = async () => {
        try {
          const container = containerRef.current;
          if (!container) return;
          
          container.innerHTML = '';
          
          const arrayBuffer = contentToRender instanceof Blob 
            ? await contentToRender.arrayBuffer() 
            : contentToRender as ArrayBuffer;

          await renderAsync(arrayBuffer, container, undefined, {
            className: "docx-high-fidelity",
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

          if (!containerRef.current) return;

          const pages = container.querySelectorAll('.docx-high-fidelity section');
          pages.forEach((page) => {
            const el = page as HTMLElement;
            el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.06)';
            el.style.marginBottom = '2rem';
            el.style.marginLeft = 'auto';
            el.style.marginRight = 'auto';
            el.style.backgroundColor = 'white';
            el.style.borderRadius = '2px';
            el.style.padding = '1in'; // standard word margin
          });
        } catch (err) {
          console.error('High fidelity render failed:', err);
          setError("Unable to preview generated report.");
        }
      };
      renderDoc();
    }
  }, [document, generatedDocxBlob, previewMode]);

  if (!document) return null;

  if (error) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4 min-h-[400px]">
        <AlertCircle className="w-12 h-12 text-indigo-500/80 mb-3" />
        <p className="text-sm font-semibold text-gray-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent overflow-y-auto max-h-[90vh] py-12 scrollbar-hide animate-fade-in">
      <div 
        ref={containerRef} 
        className="w-full max-w-[1000px] mx-auto docx-viewer-container"
      />
    </div>
  );
}
