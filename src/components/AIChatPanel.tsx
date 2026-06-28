import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/src/store/useStore';
import { getModuleById } from '@/src/lib/module-config';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, Copy, RefreshCw, Layers, ChevronDown, Check, 
  Trash2, CornerDownRight, Info, User, Bot, HelpCircle, CheckCircle2, Sparkle,
  Plus, ArrowUp, RotateCcw, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";

interface SuggestedDraft {
  fieldId: string;
  fieldLabel: string;
  content: string | string[][];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  time: string;
  targetFieldId?: string;
  targetFieldLabel?: string;
  suggestedDrafts?: SuggestedDraft[];
}

export function AIChatPanel() {
  const { 
    document, 
    formValues, 
    setFormValues,
    highlightedFieldId,
    setHighlightedField,
    activeModuleId
  } = useStore();

  const config = getModuleById(activeModuleId);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const greetingName = (() => {
    const email = "ahanish@karunya.edu.in";
    if (email) {
      const parts = email.split('@')[0];
      const first = parts.split('.')[0];
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
    return "partner";
  })();
  
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [insertedDraftId, setInsertedDraftId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!document) return null;

  // Filter out read-only sections just like DynamicForm
  const visibleSections = document.sections.filter(section => {
    if (section.id === 'document-header') return false;

    const normalized = (section.title || "").toLowerCase().trim();
    const isStudentSection = 
      normalized.includes("student") || 
      normalized.includes("learner") ||
      normalized.includes("identity") ||
      section.fields.some(field => {
        const r = (field.semanticRole || "").toLowerCase();
        const l = (field.label || "").toLowerCase();
        return r.includes("student") || r.includes("learner") || l.includes("student") || l.includes("learner");
      });

    if (isStudentSection) return true;

    const forbiddenTitles = [
      "usage", "practical outcome", "execute the python program", 
      "show uninterrupted data flow", "document and report findings", 
      "summarize latency", "resources required", "safety precautions", 
      "procedure", "competency", "related co", "ado"
    ];

    if (forbiddenTitles.some(t => t === "procedure" ? (normalized.includes(t) && !normalized.includes("actual")) : normalized.includes(t))) {
      return false;
    }

    const allowedRoles = ["student_table", "resource_table", "procedure", "observation", "result", "interpretation", "conclusion"];
    return section.fields.some(field => allowedRoles.includes(field.semanticRole || ""));
  });

  const reviewableFields = visibleSections.flatMap(s => 
    s.fields.map(f => ({
      ...f,
      sectionTitle: s.title
    }))
  );

  const selectedField = reviewableFields.find(f => f.id === highlightedFieldId);

  // Core chat send handler
  const handleChatSend = async (overrideMessage?: string) => {
    const rawMessage = (overrideMessage || chatInput).trim();
    if (!rawMessage || isChatSending) return;

    if (!overrideMessage) {
      setChatInput('');
    }
    
    setIsChatSending(true);
    const messageId = `msg-${Date.now()}`;
    const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Identify active target
    const targetIdAtSend = highlightedFieldId;
    const targetLabelAtSend = selectedField?.label;
    const currentFieldValue = targetIdAtSend ? formValues[targetIdAtSend] : undefined;

    // Build context-aware prompt prefix
    let finalPayloadMessage = rawMessage;
    if (targetIdAtSend && targetLabelAtSend) {
      const valueContext = currentFieldValue 
        ? `\n[The field current content is: "${typeof currentFieldValue === 'string' ? currentFieldValue : JSON.stringify(currentFieldValue)}"]` 
        : '\n[The field is currently empty.]';
      
      finalPayloadMessage = `[Revising Field - ID: "${targetIdAtSend}" / Label: "${targetLabelAtSend}"]: ${rawMessage}${valueContext}`;
    } else {
      finalPayloadMessage = `[Global Report Revision Mode] User desires a global/report-wide change: ${rawMessage}`;
    }

    const userMsg: ChatMessage = { 
      id: messageId,
      role: 'user', 
      text: rawMessage, 
      time: timeStamp,
      targetFieldId: targetIdAtSend || undefined,
      targetFieldLabel: targetLabelAtSend || undefined
    };

    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);

    try {
      const res = await fetch('/api/gemini/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalPayloadMessage,
          chatHistory: newMsgs.slice(-8).map(m => ({ role: m.role, text: m.text })),
          formValues,
          fields: reviewableFields.map(f => ({ id: f.id, label: f.label, role: f.semanticRole, type: f.type })),
          experimentTitle: document.name,
          documentType: config.documentType,
          aiPersona: config.aiPersona
        })
      });

      const data = await res.json();
      if (data.success) {
        const potentialDrafts: SuggestedDraft[] = [];

        if (data.updatedFields && Object.keys(data.updatedFields).length > 0) {
          Object.keys(data.updatedFields).forEach(fId => {
            const foundField = reviewableFields.find(f => f.id === fId);
            if (foundField) {
              potentialDrafts.push({
                fieldId: fId,
                fieldLabel: foundField.label,
                content: data.updatedFields[fId]
              });
            }
          });
        }

        // If a single field was targeted and updatedFields is empty, assume the text response itself is the suggestion
        if (potentialDrafts.length === 0 && targetIdAtSend && targetLabelAtSend) {
          potentialDrafts.push({
            fieldId: targetIdAtSend,
            fieldLabel: targetLabelAtSend,
            content: data.text || ""
          });
        }

        setChatMessages(prev => [...prev, {
          id: `reply-${Date.now()}`,
          role: 'model',
          text: data.text || "I've prepared a draft suggestion based on your request. Review it below and click insert whenever you're ready!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedDrafts: potentialDrafts.length > 0 ? potentialDrafts : undefined
        }]);

      } else {
        throw new Error(data.error || "Chat failed");
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'model',
        text: "I faced a temporary network glitch. Let's try that request once more index or simply re-tell me what to do!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Quick action command builder
  const handleQuickAction = (actionType: string) => {
    if (!highlightedFieldId || !selectedField) return;

    const actionPrompts: Record<string, string> = {
      generate: `Generate detail-rich and realistic engineering content for this section.`,
      improve: `Improve the current content. Make it flow more elegantly and address precise details.`,
      shorten: `Make this current content significantly more concise and bulletproof.`,
      expand: `Expand on this, adding technical steps and depth.`,
      technical: `Rewrite this in dense engineering jargon. Add metrics, standards, and technical terms.`,
      professional: `Rewrite this section in crisp, polite, academic and professional terms.`,
      grammar: `Fix any grammar, spelling or style issues while preserving all facts.`,
      humanize: `Make the voice more natural and reflective of a real student's workspace experience.`
    };

    const promptMessage = actionPrompts[actionType] || `Refining this field`;
    handleChatSend(promptMessage);
  };

  // Insert suggested content into Form
  const handleInsertDraft = (draft: SuggestedDraft) => {
    const newFormValues = { ...formValues };
    let contentToInsert = draft.content;

    // Formatting checks for table field content
    const originalField = reviewableFields.find(f => f.id === draft.fieldId);
    if (originalField && originalField.type === 'table') {
      if (!Array.isArray(contentToInsert)) {
        contentToInsert = [[String(contentToInsert)]];
      }
      if (originalField.tableRows) {
        const headersCount = originalField.tableRows.filter((r: any) => r.isHeader).length;
        if (headersCount > 0) {
          const padding = Array(headersCount).fill([]);
          contentToInsert = [...padding, ...contentToInsert];
        }
      }
    }

    newFormValues[draft.fieldId] = contentToInsert;
    setFormValues(newFormValues);

    setInsertedDraftId(draft.fieldId);
    setTimeout(() => setInsertedDraftId(null), 3000);
  };

  // Copy to clipboard
  const handleCopyDraft = (content: string | string[][], fieldId: string) => {
    let copyText = '';
    if (Array.isArray(content)) {
      copyText = content.map(row => (Array.isArray(row) ? row.join('\t') : String(row))).join('\n');
    } else {
      copyText = String(content);
    }

    navigator.clipboard.writeText(copyText);
    setCopiedDraftId(fieldId);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  const handleClearChat = () => {
    setChatMessages([]);
  };

  const handleResetToDefault = () => {
    setChatMessages([
      { 
        id: 'init-msg',
        role: 'model', 
        text: `Hey! I'm your ${config.title} Copilot, sitting right next to you. Let's write an outstanding ${config.documentType.toLowerCase()} together!\n\n💡 How to start:\n1. Click or focus on any field in the form opposite.\n2. Ask me to generate observations, procedures, or conclusions naturally.\n3. Make tweaks or insert the generated draft straight into the form with one click!`, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }
    ]);
  };

  // Determine if we should show the "New Chat" screen (Mockup 2)
  const isNewChat = chatMessages.length === 0;

  return (
    <div className="bg-white rounded-[24px] border border-zinc-200/80 overflow-hidden shadow-xl flex flex-col h-[640px] relative transition-all duration-300">
      
      {/* HEADER SECTION (Minimalist Shadcn style) */}
      <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-white select-none">
        <div className="flex flex-col">
          <span className="text-[16px] font-bold text-zinc-900 tracking-tight">
            {isNewChat ? "New Chat" : `${config.title} Copilot`}
          </span>
          <span className="text-[11.5px] text-zinc-400 font-medium">
            {isNewChat ? "How can I help you today?" : `A helpful ${config.title.toLowerCase()} partner sitting next to you`}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleClearChat}
            className="w-8 h-8 rounded-full border border-zinc-100 p-0 flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-zinc-50 transition-colors cursor-pointer"
            title="Start a fresh conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          
          {/* Active online dot */}
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
          </div>
        </div>
      </div>

      {/* TARGET FIELD DISPLAY - ONLY WHEN ACTIVE */}
      {!isNewChat && (
        <div className="px-5 py-3 border-b border-zinc-100 bg-[#fafbfe] flex flex-col gap-1.5 z-10 relative">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> FOCUS TARGET
            </span>
            {highlightedFieldId && (
              <button
                onClick={() => setHighlightedField(null)}
                className="text-[9px] font-bold text-zinc-400 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Reset to Global
              </button>
            )}
          </div>
          
          <div className="bg-white border border-zinc-200/60 rounded-[12px] px-3.5 py-2 text-xs font-semibold text-zinc-700 flex items-center justify-between gap-2 shadow-xs">
            <span className="truncate flex items-center gap-2 text-zinc-800">
              {highlightedFieldId ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <span className="text-zinc-400 font-bold text-[11px]">Target:</span>
                  <span className="truncate text-zinc-900 font-bold text-[11px]">{selectedField?.label}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <span className="text-zinc-400 font-bold text-[11px]">Target:</span>
                  <span className="truncate text-zinc-900 font-bold text-[11px]">Global Report Context</span>
                </>
              )}
            </span>
            {highlightedFieldId ? (
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/40 rounded-full py-0.5 px-2 text-[8.5px] font-extrabold select-none">
                Field Level
              </span>
            ) : (
              <span className="bg-orange-50 text-orange-700 border border-orange-100/40 rounded-full py-0.5 px-2 text-[8.5px] font-extrabold select-none">
                Whole Report
              </span>
            )}
          </div>

          {/* Localized shortcuts/quick actions */}
          {highlightedFieldId && (
            <div className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar scroll-smooth select-none">
              <span className="text-[9px] font-bold text-zinc-400 shrink-0 mr-1">⚡ ACTIONS:</span>
              {[
                { id: 'generate', label: '🪄 Generate' },
                { id: 'improve', label: '✨ Improve' },
                { id: 'shorten', label: '📝 Shorten' },
                { id: 'expand', label: '🔍 Expand' },
                { id: 'technical', label: '💻 Technical' },
                { id: 'professional', label: '👔 Professional' },
                { id: 'grammar', label: '✍️ Grammar' }
              ].map(act => (
                <button
                  key={act.id}
                  disabled={isChatSending}
                  onClick={() => handleQuickAction(act.id)}
                  className="bg-white hover:bg-indigo-50 border border-zinc-150 hover:border-indigo-200 text-[10px] text-zinc-600 hover:text-indigo-600 font-bold py-1 px-2.5 rounded-lg shrink-0 cursor-pointer shadow-3xs transition-all"
                >
                  {act.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHAT CHRONICLE TIMELINE OR NEW STATE */}
      {isNewChat ? (
        /* Image 2 style: "New Chat" Dashboard Empty State */
        <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white select-none">
          <div className="w-16 h-16 border border-zinc-200 border-dashed rounded-full flex items-center justify-center bg-zinc-50/50 mb-5 shadow-3xs">
            <MessageSquare className="w-6 h-6 text-zinc-400" />
          </div>
          <span className="text-[17px] font-bold text-zinc-900 tracking-tight mb-1">Morning, {greetingName}!</span>
          <span className="text-[13px] text-zinc-500 text-center max-w-[280px] leading-relaxed font-medium">
            What are we working on today? Press send or select a field to start co-authoring observations.
          </span>
        </div>
      ) : (
        /* Interactive Copilot Timeline with Shadcn typography */
        <MessageScrollerProvider autoScroll>
          <MessageScroller className="flex-1 bg-white">
            <MessageScrollerViewport className="no-scrollbar">
              <MessageScrollerContent className="space-y-6 px-5 py-4">
                {chatMessages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <MessageScrollerItem
                      key={msg.id}
                      messageId={msg.id}
                      scrollAnchor={isUser}
                    >
                      <Message align={isUser ? "end" : "start"} className="items-start gap-3">
                        {!isUser && (
                          <MessageAvatar>
                            <Avatar className="bg-indigo-50 border border-indigo-100/60 text-indigo-600 w-8 h-8 shadow-3xs flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                            </Avatar>
                          </MessageAvatar>
                        )}
                        
                        <MessageContent className={isUser ? "max-w-[85%]" : "max-w-[80%]"}>
                          {!isUser && (
                            <MessageHeader className="flex items-center gap-2 mb-1 select-none">
                              <span className="text-[11.5px] text-zinc-900 font-bold">{config.title} Copilot</span>
                              <span className="text-[9px] text-zinc-400 font-bold font-mono">{msg.time}</span>
                            </MessageHeader>
                          )}

                          <Bubble className={`border ${
                            isUser 
                              ? 'bg-[#f4f4f5] border-[#f4f4f5] text-[#18181b] rounded-2xl rounded-tr-none' 
                              : 'bg-white border-[#e4e4e7] rounded-2xl rounded-tl-none text-[#18181b] shadow-3xs'
                          }`}>
                            <BubbleContent className="p-3.5 text-[13px] leading-relaxed font-medium">
                              {isUser && msg.targetFieldLabel && (
                                <div className="flex items-center gap-1 text-[8.5px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 select-none">
                                  <CornerDownRight className="w-3 h-3 text-zinc-400" />
                                  <span>Target: {msg.targetFieldLabel}</span>
                                </div>
                              )}
                              <div className="whitespace-pre-wrap">{msg.text}</div>
                            </BubbleContent>
                          </Bubble>

                          {/* Display Suggested Draft Cards */}
                          {!isUser && msg.suggestedDrafts && (
                            <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3 w-full">
                              <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider flex items-center gap-1 select-none">
                                <Sparkle className="w-3.5 h-3.5 text-indigo-600" /> Suggested Draft Content:
                              </span>

                              {msg.suggestedDrafts.map((draft, idx) => {
                                const isFieldInserted = insertedDraftId === draft.fieldId;
                                const isFieldCopied = copiedDraftId === draft.fieldId;
                                const isTable = Array.isArray(draft.content);

                                return (
                                  <div key={idx} className="bg-zinc-50 border border-zinc-150 rounded-xl p-3.5 text-xs text-zinc-900 space-y-3 shadow-inner w-full">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-zinc-800 text-[10.5px]">
                                        Update Target: <span className="underline">{draft.fieldLabel}</span>
                                      </span>
                                    </div>

                                    {/* Render Table Preview */}
                                    {isTable ? (
                                      <div className="border border-zinc-200 rounded-lg overflow-x-auto bg-white max-h-[140px] overflow-y-auto">
                                        <table className="w-full text-[11px] border-collapse">
                                          <tbody>
                                            {(draft.content as string[][]).map((row, rI) => {
                                              if (!row || row.length === 0) return null;
                                              return (
                                                <tr key={rI} className="border-b border-zinc-100 last:border-0">
                                                  {row.map((cell, cI) => (
                                                    <td key={cI} className="px-2 py-1.5 text-zinc-700 border-r border-zinc-100 last:border-0 font-medium font-mono text-[10px]">
                                                      {cell}
                                                    </td>
                                                  ))}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="font-semibold text-zinc-700 max-h-[160px] overflow-y-auto pr-1 whitespace-pre-wrap leading-relaxed select-text text-[11.5px] bg-white border border-zinc-200/50 p-2.5 rounded-lg shadow-3xs">
                                        {draft.content}
                                      </div>
                                    )}

                                    {/* Suggestion actions */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      <Button
                                        size="sm"
                                        onClick={() => handleInsertDraft(draft)}
                                        className={`h-8 font-bold text-[10.5px] rounded-lg border-none cursor-pointer flex items-center justify-center transition-all ${
                                          isFieldInserted 
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100' 
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                                        }`}
                                      >
                                        {isFieldInserted ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 mr-1" />
                                            Inserted Into Field!
                                          </>
                                        ) : (
                                          <>
                                            Insert Into Field
                                          </>
                                        )}
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCopyDraft(draft.content, draft.fieldId)}
                                        className="h-8 bg-white border-zinc-200 hover:border-zinc-300 rounded-lg text-zinc-600 hover:text-indigo-600 font-bold text-[10.5px] cursor-pointer"
                                      >
                                        {isFieldCopied ? 'Copied!' : 'Copy'}
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isChatSending}
                                        onClick={() => {
                                          setHighlightedField(draft.fieldId);
                                          handleChatSend("Generate a completely fresh version from scratch.");
                                        }}
                                        className="h-8 hover:bg-zinc-150 rounded-lg text-zinc-500 text-[10.5px] font-bold"
                                      >
                                        🔍 Regenerate
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setHighlightedField(draft.fieldId);
                                          setChatInput("Add details about ");
                                        }}
                                        className="h-8 hover:bg-zinc-150 rounded-lg text-zinc-400 hover:text-zinc-800 text-[10.5px] font-bold"
                                      >
                                        ✏️ Continue Refining
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  );
                })}
                
                {isChatSending && (
                  <div className="flex items-center gap-2.5 text-zinc-400 py-1 font-bold text-xs pl-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Copilot is drafting...</span>
                  </div>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      {/* SUGGESTED COMMANDS SECTION */}
      <div className="px-5 py-3.5 bg-[#fcfcfe] border-t border-zinc-100 flex flex-col gap-2 z-10 select-none">
        <span className="text-[9.5px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> SUGGESTED COMMANDS:
        </span>
        
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Left: Buttons container */}
          <div className="col-span-11 flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1 no-scrollbar animate-fadeIn">
            {(highlightedFieldId ? [
              "Rewrite this in details",
              "Explain network characteristics",
              "Make it concise",
              "Apply academic passive voice"
            ] : [
              "Generate procedure and conclusions for me",
              "Ensure MQTT architecture references are complete",
              "Add latency calculations of 12ms to all fields"
            ]).map((preset, idx) => (
              <button
                key={idx}
                disabled={isChatSending}
                onClick={() => handleChatSend(preset)}
                className="w-full text-left bg-white border border-zinc-150 hover:border-zinc-300 text-[11.5px] text-zinc-700 hover:text-indigo-600 font-bold py-2 px-3 rounded-xl cursor-pointer transition-all truncate shadow-3xs hover:shadow-2xs hover:translate-x-0.5 duration-150"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Right: Premium Decorative Scroll Controller matching Image 1 */}
          <div className="col-span-1 flex flex-col items-center justify-between h-20 bg-zinc-50 border border-zinc-150 rounded-xl py-2 px-0.5 shrink-0 select-none">
            {/* Up arrow triangle button */}
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-zinc-400 cursor-pointer hover:border-b-indigo-600 transition-all" />
            
            {/* Scroll bar indicator thumb */}
            <div className="w-2.5 h-7 bg-zinc-300 rounded-full cursor-pointer hover:bg-indigo-600 transition-all shadow-3xs" />
            
            {/* Down arrow triangle button */}
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-zinc-400 cursor-pointer hover:border-t-indigo-600 transition-all" />
          </div>
        </div>
      </div>

      {/* FOOTER INPUT BAR CONTAINER */}
      <div className="p-4 border-t border-zinc-100 bg-white z-10 flex flex-col gap-1.5 select-none">
        {/* Rounded light gray box containing input, plus circle on left and blue circular arrow up send on right */}
        <div className="flex items-center gap-2 bg-[#f4f4f5] rounded-full px-3 py-1.5 border border-transparent focus-within:border-zinc-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-100 transition-all">
          <button 
            type="button" 
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-zinc-500 shadow-3xs hover:bg-zinc-50 border-none cursor-pointer hover:scale-105 active:scale-95 transition-all"
            onClick={() => setChatInput("Generate detailed observations for this section.")}
            title="Insert quick action template"
          >
            <Plus className="w-4 h-4 text-zinc-500" />
          </button>
          
          <Input
            placeholder={
              highlightedFieldId 
                ? "Send instructions to draft content..."
                : "How can I help you today?"
            }
            value={chatInput}
            disabled={isChatSending}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleChatSend();
            }}
            className="flex-1 h-9 bg-transparent border-none outline-none ring-0 focus:ring-0 focus-visible:ring-0 text-xs text-zinc-800 font-bold placeholder:text-zinc-400 px-1"
          />
          
          <Button
            onClick={() => handleChatSend()}
            disabled={isChatSending || !chatInput.trim()}
            className="bg-[#2563eb] hover:bg-blue-700 disabled:bg-zinc-200 text-white rounded-full w-8 h-8 p-0 shrink-0 flex items-center justify-center border-none shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            <ArrowUp className="w-4 h-4 text-white font-extrabold" />
          </Button>
        </div>
        
        {isNewChat && (
          <div className="text-[10px] text-zinc-400 text-center font-bold tracking-tight py-0.5 select-none">
            Demo is read only. Press send to send messages.
          </div>
        )}
      </div>

    </div>
  );
}
