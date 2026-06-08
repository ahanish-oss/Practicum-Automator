import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight, Sparkles, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSwitch: () => void;
  onAuth: (email: string, password: string, name?: string) => void;
}

export function AuthModal({ isOpen, onClose, mode, onSwitch, onAuth }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && !name) {
      setError('Please enter your name');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    onAuth(email, password, name);
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
    setFocusedField(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-black/60 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl z-50"
          >
            <div className="bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] overflow-hidden border border-gray-100">
              <div className="grid md:grid-cols-2">
                {/* Left Side - Branding & Features */}
                <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-12 text-white overflow-hidden hidden md:flex flex-col justify-between">
                  {/* Background decoration */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-300 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
                  </div>

                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-semibold">AI-Powered Platform</span>
                    </div>
                    
                    <h2 className="text-4xl font-bold mb-4 leading-tight">
                      {mode === 'login' ? 'Welcome back to' : 'Join'} the future of document automation
                    </h2>
                    <p className="text-indigo-100 text-lg leading-relaxed">
                      {mode === 'login' 
                        ? 'Continue your journey with intelligent document processing and seamless workflow automation.' 
                        : 'Transform your practicum workflow with AI-powered document intelligence and automated processing.'}
                    </p>
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Smart Field Detection</h3>
                        <p className="text-sm text-indigo-200">AI automatically maps all fillable fields</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Secure & Private</h3>
                        <p className="text-sm text-indigo-200">Your data stays in your browser, always</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Lightning Fast</h3>
                        <p className="text-sm text-indigo-200">Generate documents in seconds</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Form */}
                <div className="relative bg-white p-12">
                  <button
                    onClick={handleClose}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="mb-8">
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">
                      {mode === 'login' ? 'Sign in' : 'Create account'}
                    </h3>
                    <p className="text-gray-500">
                      {mode === 'login' 
                        ? 'Enter your credentials to access your account' 
                        : 'Get started with your free account today'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {mode === 'signup' && (
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                          Full Name
                        </Label>
                        <div className="relative group">
                          <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition-opacity ${focusedField === 'name' ? 'opacity-30' : ''}`}></div>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-hover:text-indigo-500" />
                            <Input
                              id="name"
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              onFocus={() => setFocusedField('name')}
                              onBlur={() => setFocusedField(null)}
                              placeholder="John Doe"
                              className="pl-12 h-14 rounded-xl border-2 border-gray-200 focus:border-indigo-500 transition-all text-base"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                        Email Address
                      </Label>
                      <div className="relative group">
                        <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition-opacity ${focusedField === 'email' ? 'opacity-30' : ''}`}></div>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-hover:text-indigo-500" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="you@example.com"
                            className="pl-12 h-14 rounded-xl border-2 border-gray-200 focus:border-indigo-500 transition-all text-base"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                          Password
                        </Label>
                        {mode === 'login' && (
                          <button type="button" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                            Forgot?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition-opacity ${focusedField === 'password' ? 'opacity-30' : ''}`}></div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-hover:text-indigo-500" />
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="••••••••"
                            className="pl-12 h-14 rounded-xl border-2 border-gray-200 focus:border-indigo-500 transition-all text-base"
                          />
                        </div>
                      </div>
                      {mode === 'signup' && (
                        <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                      )}
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-start gap-2"
                        >
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      type="submit"
                      className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all group"
                    >
                      <span>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</span>
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">
                          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onSwitch}
                      className="w-full h-14 border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-gray-700 hover:text-indigo-700 font-semibold rounded-xl transition-all"
                    >
                      {mode === 'login' ? 'Create new account' : 'Sign in instead'}
                    </button>

                    {mode === 'signup' && (
                      <p className="text-xs text-gray-500 text-center leading-relaxed">
                        By creating an account, you agree to our Terms of Service and Privacy Policy. 
                        All data is stored locally in your browser.
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
