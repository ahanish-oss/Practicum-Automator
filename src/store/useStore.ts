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
      generatedDocxBlob: null,
      previewMode: 'original',

      setDocument: (doc) => {
        const initialValues: Record<string, any> = {};
        doc?.sections.forEach(section => {
          section.fields.forEach(field => {
            if (field.defaultValue !== undefined) {
              initialValues[field.id] = field.defaultValue;
            }
          });
        });
        set({ document: doc, formValues: initialValues, generatedDocxBlob: null, previewMode: 'original' });
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
      resetAll: () => set({ document: null, formValues: {}, analysisProgress: 0, generatedDocxBlob: null, previewMode: 'original' }),
      setFormValues: (values) => set({ formValues: values }),
      setGeneratedDocxBlob: (blob) => set({ generatedDocxBlob: blob }),
      setPreviewMode: (mode) => set({ previewMode: mode }),
    }),
    {
      name: 'practicum-store',
      storage: {
        getItem: (name) => {
          const val = localStorage.getItem(name);
          if (!val || val === 'undefined') return null;
          try {
            return JSON.parse(val);
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            console.error('[ZUSTAND SETITEM ERROR]', e);
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (e) {
            console.error('[ZUSTAND REMOVEITEM ERROR]', e);
          }
        }
      } as any,
      partialize: (state) => ({ 
        formValues: state.formValues, 
        isDarkMode: state.isDarkMode 
      }),
    }
  )
);
