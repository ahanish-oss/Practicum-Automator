/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FieldType = 'text' | 'textarea' | 'table' | 'list' | 'procedure-steps' | 'kv-pair';

export interface FieldMapping {
  type: 'paragraph' | 'table-cell' | 'composite';
  paragraphIndex?: number;
  startParagraph?: number;
  endParagraph?: number;
  placeholderParagraphs?: number[];
  tableIndex?: number;
  rowIndex?: number;
  cellIndex?: number;
  fieldIndexInText?: number; 
  subMappings?: Record<string, FieldMapping>; // For composite types like "Resources"
}

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  sectionId: string;
  defaultValue?: string | any[];
  rows?: number; 
  headers?: string[]; // for table headers
  isDynamic?: boolean; // Can user add more rows?
  originalPattern?: string; // The pattern detected in the DOCX (e.g. ".....")
  mapping?: FieldMapping;
  semanticRole?: 'resource' | 'resource_table' | 'student_table' | 'procedure' | 'observation' | 'result' | 'interpretation' | 'conclusion';
  tableId?: number;
  rowId?: number;
  colId?: number;
  rowLabel?: string;
  tableRows?: {
    isHeader?: boolean;
    cells: {
      text: string;
      isEditable: boolean;
      columnHeader: string;
    }[];
  }[];
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  headerParagraphIndex?: number;
  content: string;
  fields: Field[];
  intent?: 'student-fillable' | 'faculty-evaluation' | 'template-static' | 'assessment';
}

export interface DocumentData {
  name: string;
  type: 'docx' | 'pdf';
  originalContent: string | ArrayBuffer;
  htmlContent?: string; // for DOCX preview
  sections: Section[];
  stats: {
    sectionCount: number;
    fieldCount: number;
    completionPercentage: number;
  };
}

export interface SectionReview {
  fieldId: string;
  content: string; // current content (redundant mirrors or values)
  approved: boolean;
  revisionHistory: string[];
  aiSuggestions: string[];
}

export interface ReportQuality {
  score: number;
  strengths: string[];
  suggestions: string[];
  missingInfo: string[];
}

export interface AppState {
  document: DocumentData | null;
  formValues: Record<string, string | any[]>;
  isLoading: boolean;
  analysisProgress: number;
  isDarkMode: boolean;
  highlightedFieldId: string | null;
  generatedDocxBlob: Blob | null;
  activeModuleId: string;
  
  // Copilot States
  sectionReviews: Record<string, SectionReview>;
  reportQuality: ReportQuality | null;
  isCopilotActive: boolean;
  
  setDocument: (doc: DocumentData | null) => void;
  updateFormValue: (fieldId: string, value: string | any[]) => void;
  setAnalysisProgress: (progress: number) => void;
  setLoading: (loading: boolean) => void;
  toggleDarkMode: (dark?: boolean) => void;
  setHighlightedField: (id: string | null) => void;
  resetAll: () => void;
  setFormValues: (values: Record<string, string | any[]>) => void;
  setGeneratedDocxBlob: (blob: Blob | null) => void;
  setActiveModuleId: (id: string) => void;
  
  // Copilot Setters
  setSectionReviews: (reviews: Record<string, SectionReview>) => void;
  updateSectionReview: (fieldId: string, review: Partial<SectionReview>) => void;
  setReportQuality: (quality: ReportQuality | null) => void;
  setCopilotActive: (active: boolean) => void;
}
