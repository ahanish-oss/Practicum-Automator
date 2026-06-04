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
    if (!highlightedFieldId || !containerRef.current) return;

    const findAndScroll = () => {
      const allTextElements = containerRef.current!.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, td');
      
      const field = document?.sections
        .flatMap(s => s.fields)
        .find(f => f.id === highlightedFieldId);
      
      if (!field) return;

      const section = document?.sections.find(s => s.id === field.sectionId);
      const searchTerm = section?.title || field.label;

      for (const el of Array.from(allTextElements)) {
        const htmlEl = el as HTMLElement;
        if (htmlEl.textContent?.toLowerCase().includes(searchTerm.toLowerCase())) {
          htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          htmlEl.classList.add('highlighted-field');
          setTimeout(() => {
            htmlEl.classList.remove('highlighted-field');
          }, 3000);
          break;
        }
      }
    };

    findAndScroll();
  }, [highlightedFieldId, document]);

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
