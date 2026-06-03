/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, DocumentData } from '@/src/types';

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      document: null,
      formValues: {},
      isLoading: false,
      analysisProgress: 0,
      isDarkMode: false,
      highlightedFieldId: null,

      setDocument: (doc) => set({ document: doc, formValues: {} }),
      setHighlightedField: (id) => set({ highlightedFieldId: id }),
      updateFormValue: (fieldId, value) => 
        set((state) => {
          const newValues = { ...state.formValues, [fieldId]: value };
          
          // Heuristic "AI" mapping logic:
          // If a student enters a combined string like "Python 3.13", and field labels suggest versioning, auto-split.
          if (typeof value === 'string' && value.includes(' ')) {
            const parts = value.split(' ');
            const mainVal = parts[0];
            const subVal = parts.slice(1).join(' ');

            // Find related fields in same document
            state.document?.sections.forEach(section => {
              section.fields.forEach(field => {
                const labelLower = field.label.toLowerCase();
                if (field.id !== fieldId && !newValues[field.id]) {
                  if (labelLower.includes('version') || labelLower.includes('details')) {
                     newValues[field.id] = subVal;
                  }
                }
              });
            });
          }

          return { formValues: newValues };
        }),
      setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
      setLoading: (loading) => set({ isLoading: loading }),
      toggleDarkMode: (dark) => set((state) => ({ 
        isDarkMode: dark !== undefined ? dark : !state.isDarkMode 
      })),
      resetAll: () => set({ document: null, formValues: {}, analysisProgress: 0 }),
      setFormValues: (values) => set({ formValues: values }),
    }),
    {
      name: 'practicum-store',
      partialize: (state) => ({ 
        formValues: state.formValues, 
        isDarkMode: state.isDarkMode 
      }),
    }
  )
);
