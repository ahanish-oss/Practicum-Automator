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

      setDocument: (doc) => {
        const initialValues: Record<string, any> = {};
        doc?.sections.forEach(section => {
          section.fields.forEach(field => {
            if (field.defaultValue !== undefined) {
              initialValues[field.id] = field.defaultValue;
            }
          });
        });
        set({ document: doc, formValues: initialValues });
      },
      setHighlightedField: (id) => set({ highlightedFieldId: id }),
      updateFormValue: (fieldId, value) =>
        set((state) => ({
          formValues: {
            ...state.formValues,
            [fieldId]: value,
          },
        })),
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
