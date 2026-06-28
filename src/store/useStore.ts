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
      activeModuleId: 'practicum',
      
      // Copilot States
      sectionReviews: {},
      reportQuality: null,
      isCopilotActive: false,

      setDocument: (doc) => {
        const initialValues: Record<string, any> = {};
        doc?.sections.forEach(section => {
          section.fields.forEach(field => {
            if (field.defaultValue !== undefined) {
              initialValues[field.id] = field.defaultValue;
            }
          });
        });
        set({ 
          document: doc, 
          formValues: initialValues, 
          generatedDocxBlob: null,
          sectionReviews: {},
          reportQuality: null,
          isCopilotActive: false
        });
      },
      setHighlightedField: (id) => set({ highlightedFieldId: id }),
      updateFormValue: (fieldId, value) =>
        set((state) => ({
          formValues: {
            ...state.formValues,
            [fieldId]: value,
          },
          generatedDocxBlob: null,
        })),
      setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
      setLoading: (loading) => set({ isLoading: loading }),
      toggleDarkMode: (dark) => set((state) => ({ 
        isDarkMode: dark !== undefined ? dark : !state.isDarkMode 
      })),
      resetAll: () => set({ 
        document: null, 
        formValues: {}, 
        analysisProgress: 0, 
        generatedDocxBlob: null,
        sectionReviews: {},
        reportQuality: null,
        isCopilotActive: false
      }),
      setFormValues: (values) => set({ formValues: values, generatedDocxBlob: null }),
      setGeneratedDocxBlob: (blob) => set({ generatedDocxBlob: blob }),
      setActiveModuleId: (id) => set({ activeModuleId: id }),
      
      // Copilot Setters
      setSectionReviews: (reviews) => set({ sectionReviews: reviews }),
      updateSectionReview: (fieldId, review) => set((state) => {
        const current = state.sectionReviews[fieldId] || {
          fieldId,
          content: '',
          approved: false,
          revisionHistory: [],
          aiSuggestions: []
        };
        return {
          sectionReviews: {
            ...state.sectionReviews,
            [fieldId]: {
              ...current,
              ...review
            }
          }
        };
      }),
      setReportQuality: (quality) => set({ reportQuality: quality }),
      setCopilotActive: (active) => set({ isCopilotActive: active }),
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
        isDarkMode: state.isDarkMode,
        activeModuleId: state.activeModuleId
      }),
    }
  )
);
