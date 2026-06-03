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
    <Card 
      className={`relative group cursor-pointer border-2 border-dashed transition-all duration-300 p-12 text-center rounded-3xl
        ${isDragging ? 'border-black bg-slate-100 scale-[1.02]' : 'border-slate-200 hover:border-slate-400'}
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input 
        id="file-upload"
        type="file" 
        className="hidden" 
        accept=".docx,.pdf"
        onChange={onFileChange}
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform duration-300">
          <Upload className="w-8 h-8" />
        </div>
        
        <div>
          <h3 className="text-xl font-bold tracking-tight uppercase">Upload Practicum Template</h3>
          <p className="text-slate-500 text-sm mt-1">Drag and drop or click to browse</p>
        </div>

        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
            <FileType className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">DOCX</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200 opacity-50 grayscale">
            <FileType className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">PDF (Text Only)</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 border-t border-slate-100 pt-6 w-full max-w-md">
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Auto Detection</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Live Preview</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Local Export</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
