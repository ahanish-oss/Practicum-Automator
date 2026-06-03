import { set, get, keys, del } from 'idb-keyval';

export interface Draft {
  id: string;
  templateName: string;
  timestamp: number;
  data: Record<string, any>;
}

const DRAFTS_KEY = 'practicum_drafts';

export const db = {
  async saveDraft(templateName: string, data: Record<string, any>) {
    const id = `draft_${Date.now()}`;
    const draft: Draft = {
      id,
      templateName,
      timestamp: Date.now(),
      data
    };
    
    const existing = await this.getDrafts();
    await set(DRAFTS_KEY, [draft, ...existing].slice(0, 50)); // Keep last 50
    return draft;
  },

  async getDrafts(): Promise<Draft[]> {
    return (await get(DRAFTS_KEY)) || [];
  },

  async deleteDraft(id: string) {
    const existing = await this.getDrafts();
    await set(DRAFTS_KEY, existing.filter(d => d.id !== id));
  },

  async clearAll() {
    await del(DRAFTS_KEY);
  }
};
