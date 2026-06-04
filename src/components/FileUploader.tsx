/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from 'react';
import { useStore } from '@/src/store/useStore';
import { analyzeDocx } from '@/src/lib/analyzer';
import JSZip from 'jszip';
import { Card } from '@/components/ui/card';
import { Upload, FileType, CheckCircle2 } from 'lucide-react';

export function FileUploader() {
  const { setLoading, setDocument, setAnalysisProgress } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    if (!file) return;
    
    setLoading(true);
    setAnalysisProgress(10);
    
    try {
      const isDocx = file.name.toLowerCase().endsWith('.docx');
      const isPdf = file.name.toLowerCase().endsWith('.pdf');

      if (!isDocx && !isPdf) {
        throw new Error('Unsupported file format. Please upload DOCX or PDF.');
      }

      const arrayBuffer = await file.arrayBuffer();
      setAnalysisProgress(30);
      
      let sections = [];
      let html = '';

      if (isDocx) {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const xmlContent = await zip.file('word/document.xml')?.async('string');
        const result = await analyzeDocx(arrayBuffer, xmlContent || '');
        sections = result.sections;
        html = result.html;
      } else {
        // PDF fallback - for now just set empty sections
        // Since pdf-lib doesn't extract, we'd need pdfjs-dist for real analysis
        sections = [{
          id: 'pdf-root',
          title: 'PDF Document',
          content: 'Analysis is currently optimized for DOCX. PDF files can be viewed but automated field detection is limited.',
          fields: []
        }];
        html = '<div class="p-8 text-center"><p>PDF Preview is coming soon. Use DOCX for full automation features.</p></div>';
      }

      setAnalysisProgress(80);
      
      const totalFields = sections.reduce((acc: number, s: any) => acc + s.fields.length, 0);
      
      setDocument({
        name: file.name,
        type: isPdf ? 'pdf' : 'docx',
        originalContent: arrayBuffer,
        htmlContent: html,
        sections,
        stats: {
          sectionCount: sections.length,
          fieldCount: totalFields,
          completionPercentage: 0
        }
      });
      
      setAnalysisProgress(100);
    } catch (error: any) {
      console.error('Analysis failed:', error);
      alert(error.message || 'Failed to analyze document. Please ensure it is a valid file.');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setAnalysisProgress(0);
      }, 500);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div 
      className={`relative group cursor-pointer border-2 border-dashed transition-all duration-300 p-16 text-center rounded-[32px]
        ${isDragging ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99] shadow-inner' : 'border-gray-200 hover:border-indigo-200 bg-white hover:bg-gray-50/50 shadow-sm'}
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => window.document.getElementById('file-upload')?.click()}
    >
      <input 
        id="file-upload"
        type="file" 
        className="hidden" 
        accept=".docx,.pdf"
        onChange={onFileChange}
      />
      
      <div className="flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200 group-hover:scale-105 transition-transform duration-500">
          <Upload className="w-8 h-8" />
        </div>
        
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight text-gray-900">Upload Practicum</h3>
          <p className="text-gray-400 text-sm font-medium">Drag and drop your template files here</p>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <FileType className="w-4 h-4 text-indigo-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">DOCX</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm opacity-60">
            <FileType className="w-4 h-4 text-rose-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">PDF</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-8 border-t border-gray-50 pt-8 w-full max-w-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Semantic</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">High Fidelity</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Private</span>
          </div>
        </div>
      </div>
    </div>
  );
}
