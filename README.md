# Practicum Automator - AI Document Intelligence Platform

An intelligent document automation platform that uses AI to analyze templates, extract fillable fields, and generate professional reports with user authentication and document history tracking.

View your app in AI Studio: https://ai.studio/apps/09e5c239-a02e-4142-8dc2-0a1d1a794062

## Features

### 🔐 **User Authentication**
- Secure signup and login system
- User sessions persisted in browser localStorage
- Per-user document history tracking
- Privacy-first: All data stored locally in browser

### 📄 **Smart Document Processing**
- AI-powered template analysis using Google Gemini
- Automatic field detection and mapping
- Support for complex document structures (tables, lists, procedures)
- High-fidelity DOCX preview with real-time updates

### 📚 **Document History**
- Automatic saving of all generated documents
- Quick access to previous work
- Load and edit past documents
- Per-user history management (up to 50 documents)

### 🎨 **Modern UI/UX**
- Beautiful landing page with feature highlights
- Smooth animations and transitions
- Responsive design
- Real-time document preview

### 🔄 **Export Options**
- Generate DOCX files
- Convert to PDF
- Download generated documents
- Draft saving functionality

## Run Locally

**Prerequisites:** Node.js (v16 or higher)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env](.env) to your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the URL shown in the terminal (typically http://localhost:5173)

## How It Works

1. **Sign Up / Login**: Create an account or login to access the platform
2. **Upload Template**: Upload your DOCX template file
3. **AI Analysis**: The system analyzes and maps all fillable fields
4. **Fill Fields**: Complete the intelligent form with your data
5. **Preview**: See a real-time preview of your document
6. **Generate**: Export as DOCX or PDF
7. **History**: All your documents are automatically saved to your history

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: Radix UI + TailwindCSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **AI**: Google Gemini API
- **Document Processing**: Mammoth.js, Docxtemplater
- **Storage**: Browser localStorage (no database required)

## Data Storage

All user data is stored **exclusively in browser localStorage**:
- User credentials (base64 encoded)
- Document generation history
- Form drafts
- User preferences

**Privacy Note**: Your data never leaves your browser. Even when deployed to Vercel or other platforms, all storage remains client-side.

## Deployment

The app is configured for easy deployment to Vercel:

```bash
npm run build
```

Then deploy the `dist` folder to your preferred hosting platform. The authentication and history features work seamlessly on any static hosting platform since all data is stored client-side.

## Security Note

This implementation uses browser-based localStorage for user authentication. While suitable for development and personal use, for production applications handling sensitive data, consider implementing:
- Server-side authentication
- Encrypted password storage
- Token-based authentication (JWT)
- Database for persistent storage

## License

Apache-2.0
