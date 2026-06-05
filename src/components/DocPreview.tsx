/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useStore } from '@/src/store/useStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';

export function DocPreview() {
  const { document, highlightedFieldId } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document?.originalContent && containerRef.current && document.type === 'docx') {
      const renderDoc = async () => {
        try {
          const container = containerRef.current;
          if (!container) return;
          
          container.innerHTML = '';
          await renderAsync(document.originalContent as ArrayBuffer, container, undefined, {
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
            el.style.padding = '2cm'; // standard margin
          });
        } catch (error) {
          console.error('High fidelity render failed:', error);
        }
      };
      renderDoc();
    }
  }, [document]);

  if (!document) return null;

  return (
    <div className="w-full bg-transparent overflow-y-auto max-h-[90vh] py-12 scrollbar-hide">
      <div 
        ref={containerRef} 
        className="w-full max-w-[1000px] mx-auto docx-viewer-container"
      />
    </div>
  );
}
