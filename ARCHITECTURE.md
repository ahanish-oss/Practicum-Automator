# System Architecture

## Overview

Practicum Automator with Authentication & History Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Window                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Landing Page                            │ │
│  │  - Hero Section                                            │ │
│  │  - Feature Highlights                                      │ │
│  │  - CTA Buttons (Login/Signup)                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Auth Modal                               │ │
│  │  ┌─────────────┐           ┌─────────────┐               │ │
│  │  │   Login     │  ◄──────► │   Signup    │               │ │
│  │  │   Form      │           │    Form     │               │ │
│  │  └─────────────┘           └─────────────┘               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Main Application                         │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  Header                                              │  │ │
│  │  │  - Logo                                              │  │ │
│  │  │  - User Menu (Name, History, Logout)                │  │ │
│  │  │  - Action Buttons (Preview, Generate)               │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  Document Upload / Processing                        │  │ │
│  │  │  - File Uploader                                     │  │ │
│  │  │  - AI Analysis Progress                              │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  Document Preview                                    │  │ │
│  │  │  - Original Template View                            │  │ │
│  │  │  - Generated Document View                           │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  Dynamic Form                                        │  │ │
│  │  │  - Field Inputs                                      │  │ │
│  │  │  - Table Editors                                     │  │ │
│  │  │  - Validation                                        │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  Drafts Panel (Slide-in)                            │  │ │
│  │  │  - Saved Drafts                                      │  │ │
│  │  │  - Load/Delete                                       │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                History Panel (Slide-in)                    │ │
│  │  - Document List (Last 50)                                 │ │
│  │  - Load Document                                           │ │
│  │  - Delete Entry                                            │ │
│  │  - Timestamps                                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Browser localStorage                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  practicum_users                                                │
│  ├─ User 1 {id, email, name, createdAt}                        │
│  ├─ User 2 {id, email, name, createdAt}                        │
│  └─ User N...                                                   │
│                                                                 │
│  practicum_credentials                                          │
│  ├─ email1: base64_password                                    │
│  ├─ email2: base64_password                                    │
│  └─ emailN...                                                   │
│                                                                 │
│  practicum_current_user                                         │
│  └─ {id, email, name, createdAt}                               │
│                                                                 │
│  practicum_history                                              │
│  ├─ Doc 1 {id, userId, name, timestamp, formValues, sections}  │
│  ├─ Doc 2 {id, userId, name, timestamp, formValues, sections}  │
│  └─ Doc N... (max 50 per user)                                 │
│                                                                 │
│  practicum-store (Zustand)                                      │
│  └─ {formValues, isDarkMode}                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App.tsx
│
├─ Landing Page Flow (Not Authenticated)
│  │
│  ├─ LandingPage
│  │  ├─ Hero Section
│  │  ├─ Features Grid
│  │  └─ Stats Section
│  │
│  └─ AuthModal
│     ├─ Login Form
│     └─ Signup Form
│
└─ Main App Flow (Authenticated)
   │
   ├─ Header
   │  ├─ Logo
   │  ├─ Document Info
   │  ├─ User Menu
   │  │  ├─ History Button
   │  │  ├─ User Avatar
   │  │  └─ Logout Button
   │  └─ Action Buttons
   │     ├─ Drafts
   │     ├─ Preview
   │     ├─ Generate
   │     ├─ Download DOCX
   │     └─ Download PDF
   │
   ├─ Main Content
   │  ├─ FileUploader
   │  ├─ AnalysisProgress
   │  ├─ DocPreview
   │  │  ├─ Original View
   │  │  └─ Generated View
   │  └─ DynamicForm
   │     ├─ Text Fields
   │     ├─ Text Areas
   │     ├─ Table Editors
   │     └─ List Editors
   │
   ├─ DraftsPanel (Slide-in)
   │  └─ Draft List
   │
   └─ HistoryPanel (Slide-in)
      └─ History List
```

---

## Data Flow

### Authentication Flow
```
User Input (Email, Password, Name)
         │
         ▼
   Validation
         │
         ▼
  createUser() / loginUser()
         │
         ├─ Store in localStorage
         │  └─ practicum_users
         │  └─ practicum_credentials
         │
         ▼
  setCurrentUser()
         │
         └─ practicum_current_user
         │
         ▼
   Update UI State
         │
         └─ Show Main App
```

### Document Generation Flow
```
Upload Document
      │
      ▼
AI Analysis (Gemini API)
      │
      ├─ Extract Sections
      ├─ Identify Fields
      └─ Create Mappings
      │
      ▼
User Fills Form
      │
      ├─ Text Inputs
      ├─ Tables
      └─ Lists
      │
      ▼
Generate Document
      │
      ├─ Validate Fields
      ├─ Create DOCX Blob
      └─ Auto-save to History
      │
      ▼
saveDocumentHistory()
      │
      └─ localStorage: practicum_history
            │
            └─ {userId, docName, formValues, sections}
```

### Load History Flow
```
Click History Button
      │
      ▼
getDocumentHistory(userId)
      │
      └─ Filter by current user
      │
      ▼
Display in HistoryPanel
      │
      ├─ Document List
      ├─ Timestamps
      └─ Field Counts
      │
      ▼
User Clicks Document
      │
      ▼
Load Document
      │
      ├─ Reconstruct DocumentData
      ├─ Restore Form Values
      └─ Update Store
      │
      ▼
Show in Editor
```

---

## State Management

### Zustand Store (useStore)
```typescript
{
  // Document State
  document: DocumentData | null,
  formValues: Record<string, string | any[]>,
  generatedDocxBlob: Blob | null,
  previewMode: 'original' | 'generated',
  
  // UI State
  isLoading: boolean,
  analysisProgress: number,
  isDarkMode: boolean,
  highlightedFieldId: string | null,
  
  // Actions
  setDocument,
  updateFormValue,
  setGeneratedDocxBlob,
  setPreviewMode,
  resetAll,
  ...
}
```

### Local Component State
```typescript
App.tsx:
  - currentUser: AuthUser | null
  - showAuth: boolean
  - authMode: 'login' | 'signup'
  - showLanding: boolean
  - showHistory: boolean
  - showDrafts: boolean
  - isConvertingPdf: boolean
```

---

## API Integration

### Gemini AI API
```
POST /api/gemini/generate
  ↓
Body: {
  contents: [{
    parts: [{
      inlineData: {
        mimeType: "application/vnd...",
        data: base64_document
      }
    }]
  }]
}
  ↓
Response: {
  analysis: {
    sections: [...],
    fields: [...],
    mappings: [...]
  }
}
```

### PDF Conversion API
```
POST /api/convert-to-pdf
  ↓
Body: {
  docx: base64_docx_data
}
  ↓
Response: {
  success: true,
  pdf: base64_pdf_data
}
```

---

## Security Architecture

### Current Implementation
```
Client-Side Only
├─ Base64 Password Encoding
├─ localStorage Storage
├─ No Server Authentication
└─ No Encryption at Rest
```

### Recommended Production Architecture
```
Client ◄──► Server ◄──► Database
   │           │           │
   │        JWT Auth    PostgreSQL
   │        bcrypt     or MongoDB
   │        HTTPS
   │
   └─── OAuth Providers
        (Google, GitHub)
```

---

## File Structure

```
src/
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   │
│   ├── LandingPage.tsx          # Landing page with features
│   ├── AuthModal.tsx            # Login/Signup modal
│   ├── HistoryPanel.tsx         # Document history panel
│   ├── FileUploader.tsx         # Document upload
│   ├── DynamicForm.tsx          # Form builder
│   ├── DocPreview.tsx           # Document viewer
│   ├── DraftsPanel.tsx          # Drafts management
│   ├── AnalysisProgress.tsx     # AI progress indicator
│   └── DocumentInspector.tsx    # Debug tool
│
├── lib/
│   ├── auth.ts                  # Authentication logic
│   ├── analyzer.ts              # AI document analysis
│   ├── exporter.ts              # DOCX generation
│   ├── db.ts                    # IndexedDB (drafts)
│   └── utils.ts                 # Utilities
│
├── store/
│   └── useStore.ts              # Zustand state
│
├── types.ts                     # TypeScript types
├── App.tsx                      # Main app component
├── main.tsx                     # App entry point
└── index.css                    # Global styles

api/
├── gemini/
│   └── generate.ts              # Gemini AI endpoint
└── convert-to-pdf.ts            # PDF conversion endpoint

server.ts                        # Express server
```

---

## Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **UI Components**: Radix UI
- **State**: Zustand + localStorage
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend/API
- **Server**: Express.js
- **AI**: Google Gemini API
- **Document Processing**: 
  - Mammoth.js (DOCX → HTML)
  - Docxtemplater (Template filling)
  - PizZip (ZIP handling)
- **PDF**: LibreOffice (server-side conversion)

### Storage
- **Client**: localStorage (5-10MB)
- **Drafts**: IndexedDB (via Dexie.js)
- **Sessions**: localStorage

---

## Performance Metrics

### Bundle Size
```
Uncompressed:
- HTML: 0.39 KB
- CSS: 80.65 KB
- JS: 1,147.23 KB

Compressed (gzip):
- CSS: 13.38 KB
- JS: 330.35 KB
```

### Load Times (Typical)
- First Contentful Paint: ~0.8s
- Time to Interactive: ~1.5s
- Full Load: ~2.5s

### Storage Usage
- Per User: ~10-50 KB
- Per Document: ~5-20 KB
- 50 Documents: ~250-1000 KB

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ Full Support |
| Firefox | 88+     | ✅ Full Support |
| Safari  | 14+     | ✅ Full Support |
| Edge    | 90+     | ✅ Full Support |
| Opera   | 76+     | ✅ Full Support |

**Requirements**:
- localStorage API
- IndexedDB API
- ES6+ JavaScript
- CSS Grid & Flexbox
- Fetch API

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│           Vercel Edge Network           │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   Static Files (CDN)              │  │
│  │   - HTML, CSS, JS                 │  │
│  │   - Fonts, Images                 │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   Serverless Functions            │  │
│  │   - /api/gemini/generate          │  │
│  │   - /api/convert-to-pdf           │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         External Services               │
├─────────────────────────────────────────┤
│  - Google Gemini API                    │
│  - LibreOffice (PDF conversion)         │
└─────────────────────────────────────────┘
```

---

## Future Enhancements

### Phase 1 (Security)
- [ ] Implement bcrypt password hashing
- [ ] Add JWT authentication
- [ ] HTTPS enforcement
- [ ] Rate limiting

### Phase 2 (Features)
- [ ] Search history
- [ ] Tags/categories
- [ ] Document templates library
- [ ] Bulk operations
- [ ] Export history to JSON

### Phase 3 (Cloud Sync)
- [ ] Optional cloud storage
- [ ] Multi-device sync
- [ ] Collaboration features
- [ ] Version history

### Phase 4 (Enterprise)
- [ ] Team workspaces
- [ ] Role-based access
- [ ] Audit logs
- [ ] SSO integration

---

## Monitoring & Analytics

### Recommended Tools
- **Error Tracking**: Sentry
- **Analytics**: PostHog or Plausible
- **Performance**: Vercel Analytics
- **User Feedback**: Canny or UserVoice

---

## License

Apache-2.0
