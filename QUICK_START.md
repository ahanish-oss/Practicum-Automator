# 🚀 Quick Start Guide

Get up and running with Practicum Automator in 5 minutes!

---

## 📋 Prerequisites

- Node.js (v16 or higher)
- A Google Gemini API key ([Get one here](https://ai.google.dev/))
- Modern web browser (Chrome, Firefox, Safari, or Edge)

---

## ⚡ Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Create or edit the `.env` file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

---

## 🎯 First Time Setup

### Step 1: Sign Up

1. Open the app in your browser
2. Click **"Sign Up"** or **"Get Started"**
3. Fill in:
   - Your full name
   - Email address
   - Password (minimum 6 characters)
4. Click **"Create Account"**

You'll be logged in automatically! 🎉

---

## 📄 Creating Your First Document

### Step 2: Upload a Template

1. Click **"Upload"** or drag-and-drop a DOCX file
2. Wait for AI analysis (~5-10 seconds)
3. See the intelligent field mapping

**Supported Files**: `.docx` files with fillable placeholders

### Step 3: Fill the Form

1. Review auto-detected fields
2. Fill in the required information
3. Tables and lists are editable
4. Save draft anytime with the floating button

### Step 4: Preview & Generate

1. Click **"Preview Generated Report"** to see your document
2. Toggle between Original and Generated views
3. Click **"Generate Report"** to download
4. Choose format: DOCX or PDF

**That's it!** Your document is automatically saved to history 📚

---

## 🔄 Working with History

### View Your Documents

1. Click the **"History"** button in the header
2. See all your generated documents
3. Documents show:
   - Name
   - Time generated (relative time)
   - Number of fields filled

### Load a Previous Document

1. Click any document in the history panel
2. All form values are restored
3. Edit and regenerate if needed

### Delete a Document

1. Hover over a document in history
2. Click the trash icon
3. Confirm deletion

**Note**: Deleted documents cannot be recovered!

---

## 💡 Pro Tips

### Keyboard Shortcuts

- `Esc` - Close modals and panels
- `Ctrl/Cmd + S` - Save draft (browser save)

### Form Tips

- **Required Fields**: All editable table cells in a row must be filled if any cell is filled
- **Auto-save**: Documents are automatically saved when you click "Generate Report"
- **Drafts vs History**: 
  - Drafts = Work in progress
  - History = Generated documents

### Template Tips

For best AI detection, use clear placeholders:
- `[Student Name]` or `{Student Name}`
- `......` (dots) for fillable lines
- `_______` (underscores) for fields
- Clear table headers

---

## 🛠️ Common Issues

### Issue: "Can't log in"

**Solution**:
- Check email and password are correct
- Passwords are case-sensitive
- Clear browser cache if needed

### Issue: "Document upload fails"

**Solution**:
- Ensure file is .docx format (not .doc or .pdf)
- File size should be < 10MB
- Check GEMINI_API_KEY is set correctly

### Issue: "History is empty"

**Solution**:
- Generate at least one document first
- Check browser localStorage is enabled
- Try a different browser if issue persists

### Issue: "PDF conversion fails"

**Solution**:
- Generate DOCX first
- Check server is running properly
- Fall back to DOCX download if needed

---

## 📱 Mobile Usage

The app works on mobile devices!

**Recommended**:
- Use landscape mode for better form experience
- Tablets work best for document editing
- History panel slides in smoothly

---

## 🔐 Security & Privacy

### Your Data is Safe

✅ All data stored locally in your browser  
✅ No cloud uploads  
✅ No tracking or analytics by default  
✅ Works offline after initial load

### What's Stored

- Your account (email, name)
- Generated document history (last 50)
- Form drafts
- User preferences

### Clear Your Data

To completely reset:

1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Find `practicum_*` keys
4. Delete all or specific entries

Or use browser's "Clear Site Data" option.

---

## 🚀 Deployment

### Deploy to Vercel

1. Build the project:
```bash
npm run build
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variable in Vercel dashboard:
```
GEMINI_API_KEY=your_key
```

### Deploy to Netlify

1. Build:
```bash
npm run build
```

2. Deploy the `dist` folder

3. Add environment variable in Netlify settings

**Note**: Authentication works on all platforms since it's client-side!

---

## 📚 Learn More

- [Full Documentation](./README.md)
- [Authentication Guide](./AUTHENTICATION_GUIDE.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Features Summary](./FEATURES_SUMMARY.md)

---

## 🆘 Get Help

### Stuck?

1. Check the console for errors (F12 → Console)
2. Verify API key is correct
3. Try a different browser
4. Clear cache and reload

### Report Issues

Found a bug? Have a feature request?

Create an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version
- Screenshots if applicable

---

## 🎉 Success!

You're all set! Start automating your practicum documents today.

### Next Steps

1. ✅ Upload your first template
2. ✅ Generate a document
3. ✅ Explore the history feature
4. ✅ Customize for your needs

**Happy Automating!** 🚀

---

## 📊 Quick Reference

| Action | Location | Shortcut |
|--------|----------|----------|
| Sign Up | Landing Page | Top Right |
| Login | Landing Page | Top Right |
| Upload | Main App | Drag & Drop |
| Preview | Header | Preview Button |
| Generate | Header | Generate Button |
| History | Header | History Button |
| Logout | Header | Logout Icon |
| Save Draft | Bottom Center | Floating Button |

---

**Version**: 2.0  
**Last Updated**: 2024  
**License**: Apache-2.0
