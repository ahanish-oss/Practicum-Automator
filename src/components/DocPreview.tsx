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

  // Highlight logic for active field
  useEffect(() => {
    if (!highlightedFieldId || !containerRef.current) return;

    // Try to find text that matches the field's section or content
    // We search for elements containing text that might be related
    const findAndScroll = () => {
      const allTextElements = containerRef.current!.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6');
      
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
          htmlEl.style.backgroundColor = 'rgba(254, 240, 138, 0.4)'; // soft gold highlight
          setTimeout(() => {
            htmlEl.style.backgroundColor = '';
          }, 2000);
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
          // Clear previous content
          containerRef.current!.innerHTML = '';
          
          await renderAsync(
            document.originalContent as ArrayBuffer, 
            containerRef.current!, 
            undefined, 
            {
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
            }
          );

          // After rendering, we can apply some "SaaS" polish
          const pages = containerRef.current!.querySelectorAll('.docx-high-fidelity section');
          pages.forEach((page) => {
            (page as HTMLElement).style.boxShadow = '0 25px 50px -12px rgb(0 0 0 / 0.15)';
            (page as HTMLElement).style.marginBottom = '2rem';
            (page as HTMLElement).style.marginLeft = 'auto';
            (page as HTMLElement).style.marginRight = 'auto';
            (page as HTMLElement).style.backgroundColor = 'white';
            (page as HTMLElement).style.position = 'relative';

            // Add custom watermark overlay for professional authenticity
            if (!page.querySelector('.docx-watermark-overlay')) {
              const watermark = window.document.createElement('div');
              watermark.className = 'docx-watermark-overlay';
              watermark.innerHTML = `
                <div class="watermark-content">
                  <div class="watermark-text">PRACTICUM AUTOMATION</div>
                  <div class="watermark-subtext">PROFESSIONAL PLATFORM</div>
                </div>
              `;
              (page as HTMLElement).appendChild(watermark);
            }
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
    <div className="h-full bg-slate-100 dark:bg-zinc-950 flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="py-12 px-4 flex flex-col items-center">
            {document.type === 'docx' ? (
              <div 
                ref={containerRef} 
                className="w-full max-w-[900px] docx-viewer-container"
              />
            ) : (
              <div className="w-full max-w-[800px] bg-white dark:bg-zinc-900 shadow-2xl border border-slate-200 dark:border-zinc-800 p-16 min-h-[1120px] text-center flex items-center justify-center">
                <p className="text-slate-400 font-bold uppercase tracking-widest italic">
                  PDF Preview is limited in this version. Use DOCX for full fidelity.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 items-center gap-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-white text-[10px] font-bold uppercase tracking-widest border border-white/10 flex">
          <span>High Fidelity Preview Active</span>
        </div>
      </div>
    </div>
  );
}
