/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, FileText, ArrowRight, Shield, Cpu, Zap, 
  Layers, CheckCircle2, GraduationCap, Award, Globe, 
  BookOpen, Compass, Code, Terminal, FileCheck, Landmark, Copy,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DOCUMENT_MODULES, ModuleConfig } from '../lib/module-config';

interface LandingPageProps {
  onSelectModule: (moduleId: string) => void;
}

export function LandingPage({ onSelectModule }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'copilot' | 'parsing' | 'export'>('copilot');

  const activeModules = DOCUMENT_MODULES.filter(m => !m.isComingSoon);
  const comingSoonModules = DOCUMENT_MODULES.filter(m => m.isComingSoon);

  const moduleIcons: Record<string, React.ReactNode> = {
    practicum: <Terminal className="w-5 h-5 text-indigo-500" />,
    micro_project: <Zap className="w-5 h-5 text-amber-500" />,
    mini_project: <Code className="w-5 h-5 text-sky-500" />,
    major_project: <GraduationCap className="w-5 h-5 text-purple-500" />,
    internship: <Compass className="w-5 h-5 text-emerald-500" />,
    seminar: <BookOpen className="w-5 h-5 text-rose-500" />,
    research: <Landmark className="w-5 h-5 text-neutral-400" />,
    dissertation: <FileCheck className="w-5 h-5 text-neutral-400" />,
    assignment: <FileText className="w-5 h-5 text-neutral-400" />
  };

  const bentoFeatures = [
    {
      icon: <Cpu className="w-5 h-5 text-indigo-500" />,
      tag: "Intelligence Hub",
      title: "Contextual Academic Copilot",
      desc: "An advanced, discipline-specific AI co-author that understands your specific rubric guidelines and template contexts."
    },
    {
      icon: <Layers className="w-5 h-5 text-indigo-500" />,
      tag: "Semantic Isolation",
      title: "Dynamic Input Mapping",
      desc: "Our engine isolates editable sections from read-only instructions, presenting clean, focus-oriented entry fields."
    },
    {
      icon: <Shield className="w-5 h-5 text-indigo-500" />,
      tag: "Academic Integrity",
      title: "Pristine Style Alignment",
      desc: "Applies precise scholarly vocabulary, standard formatting configurations, and citation guidelines while retaining factual student observations."
    }
  ];

  const handleScrollToModules = () => {
    const el = document.getElementById('module-selector');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#fafafc] text-neutral-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden opacity-50 z-0">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100/40 blur-[120px]" />
        <div className="absolute top-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-gradient-to-bl from-amber-100/40 to-indigo-100/30 blur-[100px]" />
      </div>

      {/* Top Refined Header Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-gray-100/80 px-8 py-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-150/40">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-neutral-900">AETHER</span>
              <span className="text-[10px] text-gray-400 font-extrabold tracking-widest uppercase">AI STUDIO</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#module-selector" className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors">Workspace Modules</a>
            <a href="#features" className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#pricing" className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors">Tiers</a>
            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-none font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">
              V3.0 PLATFORM
            </Badge>
          </nav>

          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleScrollToModules}
              className="text-xs font-bold rounded-xl border-gray-200 hover:bg-neutral-50 px-5 h-10 cursor-pointer"
            >
              Sign In
            </Button>
            <Button 
              onClick={handleScrollToModules}
              className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl px-5 h-10 shadow-lg shadow-neutral-200 transition-all border-none flex items-center gap-2 cursor-pointer"
            >
              Enter Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 z-10 px-8">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          
          {/* Badge indicator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-indigo-50/50 border border-indigo-100 rounded-full px-4 py-1.5 shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-indigo-700 uppercase">
              The Next-Gen Co-Authoring Environment for Academics
            </span>
          </motion.div>

          {/* Majestic Hero Headers */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl md:text-6xl font-black tracking-tight text-neutral-950 leading-[1.1]"
            >
              Transform academic documents into <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent">publication-ready</span> excellence.
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-gray-400 text-sm md:text-base font-medium max-w-2xl mx-auto leading-relaxed"
            >
              Upload any worksheet, report, or thesis template. Aether isolates editable sections semantically and provides a discipline-specific AI co-author. Instant export to perfect Microsoft Word (.docx) and PDF.
            </motion.p>
          </div>

          {/* Majestic Call-to-Actions */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button
              onClick={handleScrollToModules}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 text-xs font-bold shadow-xl shadow-indigo-100/80 transition-all border-none flex items-center justify-center gap-3 cursor-pointer"
            >
              Choose Workspace Module
              <ArrowRight className="w-4 h-4" />
            </Button>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-extrabold text-gray-500 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50/50 rounded-xl h-12 px-6 transition-all"
            >
              Explore Architecture
            </a>
          </motion.div>
        </div>
      </section>

      {/* NEW MODULE SELECTOR GRID SECTION */}
      <section id="module-selector" className="py-24 bg-white border-t border-gray-100/80 px-8 relative z-10 scroll-mt-20">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600">WORKSPACE HUB</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-950">Choose a document type</h2>
            <p className="text-gray-400 text-xs md:text-sm font-semibold leading-relaxed">
              Select any of the specialized automation modules below to launch your dedicated AI co-authoring workspace.
            </p>
          </div>

          {/* Active Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeModules.map((module, idx) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                onClick={() => onSelectModule(module.id)}
                className="group relative bg-white border border-gray-150 hover:border-indigo-400/80 rounded-[28px] p-6 cursor-pointer shadow-xs hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-300 flex flex-col justify-between h-[180px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                      {moduleIcons[module.id]}
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-[15px] font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-gray-400 text-xs font-semibold line-clamp-2 leading-relaxed">
                      Co-author and map {module.documentType.toLowerCase()}s with a customized {module.aiPersona}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50 group-hover:border-indigo-50 transition-colors">
                  <span className="text-[10px] text-gray-400 font-bold group-hover:text-indigo-600 transition-colors">Launch Workspace</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Coming Soon Section */}
          <div className="pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Coming Soon Modules</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
              {comingSoonModules.map((module) => (
                <div
                  key={module.id}
                  className="bg-[#fafbfc] border border-gray-150 rounded-[28px] p-6 flex flex-col justify-between h-[160px] cursor-not-allowed select-none"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center">
                        {moduleIcons[module.id]}
                      </div>
                      <Badge variant="secondary" className="bg-neutral-100 text-neutral-500 border-none font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">
                        Coming Soon
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-[15px] font-bold text-neutral-500">
                        {module.title}
                      </h3>
                      <p className="text-neutral-400 text-xs font-semibold leading-relaxed">
                        Scholarly template extraction and validation for {module.title.toLowerCase()} documents.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Grid of Bento Features */}
      <section id="features" className="py-24 bg-neutral-50 border-y border-gray-100/50 px-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600">The Technology Stack</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-950">Engineered for academic precision.</h2>
            <p className="text-gray-400 text-xs md:text-sm font-semibold leading-relaxed">
              We leverage semantic parsing combined with client-side document reconstruction to bring unparalleled luxury to worksheet drafting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {bentoFeatures.map((feat, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-gray-100 p-8 rounded-3xl space-y-5 hover:border-indigo-100/80 transition-all duration-300"
              >
                <div className="w-10 h-10 bg-neutral-50 rounded-2xl flex items-center justify-center shadow-sm">
                  {feat.icon}
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">{feat.tag}</span>
                  <h3 className="text-base font-bold text-neutral-950">{feat.title}</h3>
                  <p className="text-gray-400 text-xs font-semibold leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Feature Showcase Selector Tabs */}
          <div className="bg-neutral-50 border border-gray-100 rounded-[32px] p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex flex-wrap items-center justify-center gap-2 border-b border-gray-200 pb-4">
              {[
                { id: 'copilot', label: '⚡ Interactive AI Partner' },
                { id: 'parsing', label: '📂 Lossless A4 Sandbox' },
                { id: 'export', label: '📥 Instant Docx/PDF Export' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    activeTab === tab.id 
                    ? 'bg-neutral-900 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-900 bg-white border border-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'copilot' && (
                <motion.div 
                  key="copilot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left"
                >
                  <div className="space-y-4">
                    <h4 className="text-xl font-extrabold text-neutral-950">A partner sitting next to you.</h4>
                    <p className="text-gray-400 text-xs font-semibold leading-relaxed">
                      Instead of standard disconnected AI prompts, Aether AI monitors the precise input field you are typing in. Clicking an observation row automatically scopes the prompt to that exact metadata.
                    </p>
                    <ul className="space-y-2.5 text-xs font-bold text-gray-500">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Auto-suggests metrics based on previous inputs
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Preserves non-editable lab instructions perfectly
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white border border-gray-200/60 p-6 rounded-2xl shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Contextual Rubric</span>
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed font-semibold italic bg-neutral-50 p-4 rounded-xl border border-gray-100">
                        "Your conclusions should reflect appropriate parameters and cite theoretical equations where applicable."
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'parsing' && (
                <motion.div 
                  key="parsing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left"
                >
                  <div className="space-y-4">
                    <h4 className="text-xl font-extrabold text-neutral-950">High-fidelity ISO previews.</h4>
                    <p className="text-gray-400 text-xs font-semibold leading-relaxed">
                      No more blind submissions. Aether maps your dynamic responses back to a real-time preview of your target document, showing how the text fits standard professional printing formats.
                    </p>
                    <ul className="space-y-2.5 text-xs font-bold text-gray-500">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Fully aligned to actual DOCX templates
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Dynamic real-time font and table rendering
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white border border-gray-200/60 p-6 rounded-2xl shadow-sm flex items-center justify-center">
                    <div className="border border-gray-100 bg-neutral-50 w-full aspect-video rounded-xl flex flex-col items-center justify-center space-y-2">
                      <FileText className="w-8 h-8 text-gray-300" />
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">ISO 216 A4 Preview Mode</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'export' && (
                <motion.div 
                  key="export"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left"
                >
                  <div className="space-y-4">
                    <h4 className="text-xl font-extrabold text-neutral-950">Lossless document compiling.</h4>
                    <p className="text-gray-400 text-xs font-semibold leading-relaxed">
                      Compile your work directly to Microsoft Word (.docx) or industry-standard PDF. The formatting remains 100% true to the original file, replacing only the required template tags.
                    </p>
                    <ul className="space-y-2.5 text-xs font-bold text-gray-500">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Full support for embedded tables and headings
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Watermark-free clean premium downloads
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white border border-gray-200/60 p-6 rounded-2xl shadow-sm flex items-center justify-center">
                    <div className="space-y-3 w-full">
                      <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Compilation Successful! All validation passed.
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-neutral-100 h-2 rounded-full" />
                        <div className="flex-1 bg-neutral-100 h-2 rounded-full" />
                        <div className="flex-1 bg-indigo-600 h-2 rounded-full" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </section>

      {/* Modern Luxury Startup Pricing Section */}
      <section id="pricing" className="py-24 bg-neutral-950 text-white relative z-10 px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-400">Premium Alignment</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Flexible tiers for every researcher.</h2>
            <p className="text-gray-400 text-xs md:text-sm font-semibold leading-relaxed">
              Unlock the full potential of high-fidelity template co-authoring with our professional and institution tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Tier 1 */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Aether Lite</span>
                  <h3 className="text-2xl font-black mt-2">$0</h3>
                  <span className="text-[11px] text-gray-500">Free forever</span>
                </div>
                <p className="text-gray-400 text-xs font-semibold">Perfect for casual students getting started with template mapping.</p>
                <div className="w-full h-px bg-neutral-800" />
                <ul className="space-y-3 text-xs font-semibold text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Parse up to 3 documents
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Standard AI Chat guidance
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600">
                    ✕ Continuous field tracking
                  </li>
                </ul>
              </div>
              <Button 
                onClick={handleScrollToModules}
                className="w-full mt-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl h-11 text-xs font-bold border-none cursor-pointer"
              >
                Access Studio
              </Button>
            </div>

            {/* Tier 2: Premium Pro */}
            <div className="bg-neutral-900 border-2 border-indigo-500 rounded-3xl p-8 flex flex-col justify-between relative shadow-2xl shadow-indigo-950/40">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-500 text-[9px] font-black uppercase tracking-wider text-white px-3 py-1 rounded-full">
                Most Popular
              </div>
              
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Aether Author</span>
                  <h3 className="text-2xl font-black mt-2">$19<span className="text-xs font-normal text-gray-500"> / month</span></h3>
                  <span className="text-[11px] text-gray-400">Academic & Individual power users</span>
                </div>
                <p className="text-gray-300 text-xs font-semibold">Unlock continuous context tracking, unlimited generations, and academic formatting guidelines.</p>
                <div className="w-full h-px bg-neutral-800" />
                <ul className="space-y-3 text-xs font-semibold text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Limitless document parsing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Advanced Copilot suggestions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Academic voice customization
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> 100% clean Word & PDF exports
                  </li>
                </ul>
              </div>
              <Button 
                onClick={handleScrollToModules}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 text-xs font-bold shadow-lg shadow-indigo-900 border-none cursor-pointer"
              >
                Upgrade to Author
              </Button>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Aether Institutional</span>
                  <h3 className="text-2xl font-black mt-2">Custom</h3>
                  <span className="text-[11px] text-gray-500">For university labs & faculties</span>
                </div>
                <p className="text-gray-400 text-xs font-semibold">Integrate directly with campus Canvas, Moodle or university-specific rubrics.</p>
                <div className="w-full h-px bg-neutral-800" />
                <ul className="space-y-3 text-xs font-semibold text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Canvas & Moodle LTI Integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Custom style templates enforcement
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Plagiarism & Integrity guardrails
                  </li>
                </ul>
              </div>
              <Button 
                onClick={handleScrollToModules}
                className="w-full mt-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl h-11 text-xs font-bold border-none cursor-pointer"
              >
                Contact Sales
              </Button>
            </div>
          </div>

          {/* Social Proof badge */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-12 border-t border-neutral-900 text-center text-xs font-bold text-gray-500">
            <span className="flex items-center gap-1"><Award className="w-4 h-4 text-indigo-400" /> Stanford Lab Verified</span>
            <span className="flex items-center gap-1"><Globe className="w-4 h-4 text-indigo-400" /> Used globally across 15+ universities</span>
          </div>

        </div>
      </section>

      {/* Luxury Minimal Footer */}
      <footer className="bg-[#fafafc] border-t border-gray-150 py-16 px-8 relative z-10 text-xs font-bold text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-neutral-950 font-black">AETHER AI</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-neutral-900 transition-colors cursor-pointer">Security Suite</span>
            <span className="hover:text-neutral-900 transition-colors cursor-pointer">Terms of Authoring</span>
            <span className="hover:text-neutral-900 transition-colors cursor-pointer">Campus Directory</span>
          </div>
          <span className="text-gray-400">© 2026 Aether AI Inc. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}
