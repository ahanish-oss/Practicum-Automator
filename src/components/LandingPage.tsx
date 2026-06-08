import { motion } from 'framer-motion';
import { FileText, Sparkles, Zap, Shield, ArrowRight, CheckCircle, Brain, Lock, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-30 transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-30 transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-20 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-8 mb-32"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-700 px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>Powered by Advanced AI Technology</span>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 leading-[1.1] tracking-tight">
              Intelligent Document
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient">
                Automation
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-medium">
              Transform your practicum workflow with AI-powered field detection, 
              intelligent form generation, and seamless document processing.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 pt-8">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-7 text-lg font-semibold rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all group"
            >
              Get Started for Free
              <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Free forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>100% browser-based</span>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-8"
        >
          <div className="group relative bg-white/80 backdrop-blur-sm p-10 rounded-3xl border border-gray-200/50 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity"></div>
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Field Detection</h3>
              <p className="text-gray-600 leading-relaxed text-base">
                Advanced machine learning algorithms automatically identify and map all fillable fields in your documents with exceptional accuracy.
              </p>
            </div>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-sm p-10 rounded-3xl border border-gray-200/50 hover:border-purple-200 hover:shadow-2xl hover:shadow-purple-100/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity"></div>
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                <Gauge className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Lightning Performance</h3>
              <p className="text-gray-600 leading-relaxed text-base">
                Process documents in seconds with intelligent caching and optimized workflows. Complete your work 10x faster than traditional methods.
              </p>
            </div>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-sm p-10 rounded-3xl border border-gray-200/50 hover:border-green-200 hover:shadow-2xl hover:shadow-green-100/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity"></div>
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Privacy First</h3>
              <p className="text-gray-600 leading-relaxed text-base">
                Your documents never leave your browser. All processing happens locally with military-grade security and complete data sovereignty.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-32 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-[40px] opacity-90"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40 rounded-[40px]"></div>
          
          <div className="relative p-16 text-white">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Trusted by professionals worldwide</h2>
              <p className="text-indigo-100 text-lg">Join thousands who have transformed their workflow</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 text-center">
              <div className="space-y-2">
                <div className="text-6xl font-bold bg-gradient-to-br from-white to-indigo-100 bg-clip-text text-transparent">10x</div>
                <div className="text-indigo-100 text-lg font-medium">Faster Processing</div>
                <div className="text-indigo-200/80 text-sm">Than manual methods</div>
              </div>
              <div className="space-y-2">
                <div className="text-6xl font-bold bg-gradient-to-br from-white to-purple-100 bg-clip-text text-transparent">99.9%</div>
                <div className="text-indigo-100 text-lg font-medium">Accuracy Rate</div>
                <div className="text-indigo-200/80 text-sm">Field detection precision</div>
              </div>
              <div className="space-y-2">
                <div className="text-6xl font-bold bg-gradient-to-br from-white to-indigo-100 bg-clip-text text-transparent">100%</div>
                <div className="text-indigo-100 text-lg font-medium">Private & Secure</div>
                <div className="text-indigo-200/80 text-sm">Browser-based storage</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-32 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to transform your workflow?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who have already automated their document processing
          </p>
          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-7 text-lg font-semibold rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all group"
          >
            Start for Free Today
            <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
