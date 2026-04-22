/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { db, auth, googleProvider } from './lib/firebase';
import { Thought, PoetryMatch, UserProfile } from './types';
import { analyzeThoughtAndRecommendPoetry } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenLine, 
  Library, 
  History as HistoryIcon, 
  User, 
  LogOut, 
  Sparkles,
  ChevronRight,
  BookOpen,
  Share2,
  Bookmark
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<{ thought: Thought, recommendations: PoetryMatch[] } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [view, setView] = useState<'home' | 'input' | 'result' | 'history'>('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp()
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && view === 'history') {
      const q = query(
        collection(db, 'thoughts'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const thoughts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistory(thoughts);
      });
      return unsubscribe;
    }
  }, [user, view]);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  const handleSubmit = async () => {
    if (!input.trim() || !user) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeThoughtAndRecommendPoetry(input);
      
      const thoughtData: Partial<Thought> = {
        userId: user.uid,
        content: input,
        sentiment: analysis.sentiment,
        imagery: analysis.imagery,
        createdAt: serverTimestamp()
      };

      const thoughtRef = await addDoc(collection(db, 'thoughts'), thoughtData);
      
      const matches: PoetryMatch[] = analysis.recommendations.map((rec: any) => ({
        thoughtId: thoughtRef.id,
        ...rec,
        createdAt: serverTimestamp()
      }));

      for (const match of matches) {
        await addDoc(collection(db, `thoughts/${thoughtRef.id}/matches`), match);
      }

      setCurrentResult({
        thought: { ...thoughtData, id: thoughtRef.id } as Thought,
        recommendations: matches
      });
      setView('result');
      setInput('');
    } catch (error) {
      console.error("Failed to analyze sentiment", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-indigo-900 flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 bg-indigo-900 rounded-2xl flex items-center justify-center text-white text-4xl shadow-xl">灵</div>
          <span className="font-serif italic text-lg tracking-widest uppercase">Lumina</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 flex flex-col font-sans text-slate-800">
      {/* Header Navigation */}
      <header className="flex justify-between items-center mb-6 max-w-[1400px] mx-auto w-full">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => setView('home')}
        >
          <div className="w-10 h-10 bg-indigo-900 rounded-lg flex items-center justify-center text-white font-serif text-xl shadow-lg">灵</div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-950 uppercase hidden sm:block">Lumina Sentiment</h1>
        </div>
        
        <nav className="flex gap-4 md:gap-8 items-center text-sm font-medium text-slate-500">
          <button 
            onClick={() => setView('home')} 
            className={cn("transition-colors pb-1", view === 'home' ? "text-indigo-600 border-b-2 border-indigo-600" : "hover:text-indigo-900")}
          >
            首页
          </button>
          <button 
            onClick={() => user ? setView('input') : handleLogin()} 
            className={cn("transition-colors pb-1", view === 'input' ? "text-indigo-600 border-b-2 border-indigo-600" : "hover:text-indigo-900")}
          >
            解析感悟
          </button>
          <button 
            onClick={() => user ? setView('history') : handleLogin()} 
            className={cn("transition-colors pb-1", view === 'history' ? "text-indigo-600 border-b-2 border-indigo-600" : "hover:text-indigo-900")}
          >
            历史记录
          </button>
          
          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              <img 
                src={user.photoURL} 
                alt={user.displayName} 
                className="w-8 h-8 rounded-full border border-indigo-100 shadow-sm"
              />
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="px-6 py-2 bg-indigo-900 text-white rounded-lg font-bold uppercase tracking-tight hover:bg-indigo-950 transition-colors"
            >
              LOGIN
            </button>
          )}
        </nav>
      </header>

      <main className="flex-grow max-w-[1400px] mx-auto w-full">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full md:grid-rows-6"
            >
              {/* Hero Section */}
              <div className="md:col-span-8 md:row-span-4 bento-indigo-card flex flex-col justify-center p-12">
                <div className="relative z-10 space-y-8">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Experience Poetic Insight</span>
                  <h2 className="text-5xl md:text-7xl font-serif font-light leading-tight text-white">
                    心有所感，<br/>
                    <span className="italic font-normal text-indigo-200">必有回响。</span>
                  </h2>
                  <p className="text-indigo-100 text-lg max-w-md font-light leading-relaxed">
                    Recording your inner landscape, matched with timeless poetic wisdom.
                  </p>
                  <button 
                    onClick={() => user ? setView('input') : handleLogin()}
                    className="px-8 py-4 bg-white text-indigo-900 rounded-2xl font-bold uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-xl"
                  >
                    Start Analysis
                  </button>
                </div>
                <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-indigo-800 rounded-full blur-[100px] opacity-40"></div>
                <div className="absolute top-20 right-20 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl"></div>
              </div>

              {/* Browse Collection */}
              <div 
                onClick={() => user ? setView('history') : handleLogin()}
                className="md:col-span-4 md:row-span-4 bento-card flex flex-col justify-between group cursor-pointer hover:border-indigo-200"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <HistoryIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">归档足迹</h3>
                  <p className="text-slate-500 font-light">回顾您曾走过的情感桥梁，每一句心声都有诗词相伴。</p>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-indigo-600 uppercase tracking-widest">
                  <span>查看历史</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Stats Card */}
              <div className="md:col-span-4 md:row-span-2 bento-emerald-card flex flex-col justify-center items-center text-center">
                 <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-2">匹配次数</span>
                 <div className="text-5xl font-serif text-emerald-900">{history.length}</div>
                 <span className="text-xs text-emerald-700 mt-2">Captured poetic moments with AI</span>
              </div>

              {/* Info Card */}
              <div className="md:col-span-8 md:row-span-2 bg-slate-900 rounded-3xl p-8 text-slate-400 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold uppercase text-xs tracking-widest">Engine Status</span>
                  </div>
                  <p className="text-sm font-light">BERT-Lumina v2.0 is active and processing with 98% precision. 1.2M classical citations indexed.</p>
                </div>
                <div className="hidden md:flex gap-1">
                   {[...Array(12)].map((_, i) => (
                     <div key={i} className={cn("w-1 h-8 rounded-full", i % 3 === 0 ? "bg-indigo-500" : "bg-slate-800")} />
                   ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-3xl mx-auto py-12"
            >
              <div className="bento-card p-12 space-y-8">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Thought Input / 感悟输入</span>
                  <h2 className="text-4xl font-serif font-bold text-slate-800">此刻，您在想什么？</h2>
                </div>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="雨后的清凉，抑或是一个不经意的回眸..."
                  className="w-full h-64 p-0 bg-transparent text-2xl font-serif resize-none focus:outline-none placeholder:text-slate-200 text-slate-700 leading-relaxed"
                />

                <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <span>{input.length} Characters</span>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isAnalyzing}
                    className={cn(
                      "group px-10 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg hover:shadow-indigo-200 hover:-translate-y-1",
                      input.trim() && !isAnalyzing 
                        ? "bg-indigo-600 text-white" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    {isAnalyzing ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <PenLine className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                    {isAnalyzing ? "Processing..." : "ANALYZE"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'result' && currentResult && (
            <motion.div 
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4 h-full"
            >
              {/* User Insight Panel */}
              <div className="md:col-span-4 md:row-span-3 bento-card p-8 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">My Sentiment</span>
                  <span className="text-[10px] text-slate-300">Just Now</span>
                </div>
                <p className="text-xl leading-relaxed text-slate-700 italic font-serif flex-grow">
                  “{currentResult.thought.content}”
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                  {currentResult.thought.imagery.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-semibold">#{tag}</span>
                  ))}
                </div>
              </div>

              {/* NLP Analysis Visualization */}
              <div className="md:col-span-5 md:row-span-3 bento-indigo-card p-8">
                <div className="relative z-10">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">AI Visualization / 意象识别</span>
                  <div className="mt-8 grid grid-cols-2 gap-8">
                    <div>
                      <div className="text-5xl font-light mb-1">{currentResult.thought.sentiment ? "100%" : "0%"}</div>
                      <div className="text-xs text-indigo-200 uppercase tracking-tighter">共鸣指数 (Resonance)</div>
                      <div className="w-full bg-indigo-800 h-1 mt-4 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: '100%' }} 
                          className="bg-indigo-400 h-full" 
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-4xl font-serif mb-1">{currentResult.thought.sentiment}</div>
                      <div className="text-xs text-indigo-200 uppercase tracking-tighter font-sans">核心基调 (Core Vibe)</div>
                      <div className="w-full bg-indigo-800 h-1 mt-4 rounded-full overflow-hidden">
                        <div className="bg-indigo-400 h-full w-[80%]"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-12">
                    <div className="text-xs text-indigo-300 mb-6 uppercase tracking-widest">提取核心意象：</div>
                    <div className="flex flex-wrap gap-6">
                      {currentResult.thought.imagery.slice(0, 3).map((tag, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="w-14 h-14 rounded-full border border-indigo-500 flex items-center justify-center mb-3 italic text-xl font-serif text-white bg-indigo-800 shadow-inner">
                            {tag.charAt(0)}
                          </div>
                          <span className="text-[10px] text-indigo-300 uppercase group-hover:text-white transition-colors">{tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-800 rounded-full blur-3xl opacity-50"></div>
              </div>

              {/* Quick Matches Count */}
              <div className="md:col-span-3 md:row-span-2 bento-emerald-card flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-2">Matches Found</span>
                <div className="text-5xl font-serif text-emerald-900">{currentResult.recommendations.length}</div>
                <span className="text-xs text-emerald-700 mt-2">Relevant classical citations</span>
              </div>

              {/* Actions */}
              <div className="md:col-span-3 md:row-span-1 grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 cursor-pointer shadow-sm text-slate-400 hover:text-indigo-600 transition-colors">
                  <Share2 className="w-5 h-5" />
                </div>
                <div className="bg-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-700 cursor-pointer text-white shadow-lg shadow-indigo-100 transition-all">
                  <Bookmark className="w-5 h-5" />
                </div>
              </div>

              {/* Primary Poem Panel */}
              <div className="md:col-span-6 md:row-span-3 bento-card p-12 flex flex-col justify-center items-center text-center shadow-indigo-50 shadow-xl border-indigo-100">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-8">Primary Recommendation / 核心推荐</span>
                <div className="space-y-4 mb-8">
                  {currentResult.recommendations[0].content.split(/[，。？！；\n]/).filter(s => s.trim()).slice(0, 2).map((line, i) => (
                    <h2 key={i} className="text-3xl md:text-4xl font-serif font-bold text-slate-800">{line}</h2>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="h-px w-10 bg-slate-200"></div>
                  <span className="font-serif text-xl text-slate-600">
                    {currentResult.recommendations[0].author}《{currentResult.recommendations[0].poetryTitle}》
                  </span>
                  <div className="h-px w-10 bg-slate-200"></div>
                </div>
                <button 
                  onClick={() => alert(`全文内容：\n${currentResult.recommendations[0].content}`)}
                  className="mt-10 px-8 py-3 border border-slate-200 rounded-full text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                >
                  View Full Poem →
                </button>
              </div>

              {/* Context Panel */}
              <div className="md:col-span-3 md:row-span-3 bg-stone-100 rounded-3xl p-8 border border-stone-200 flex flex-col">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-6">Cultural Context</span>
                <div className="flex-grow text-sm text-stone-600 leading-relaxed overflow-auto pr-2 custom-scrollbar">
                  <p className="mb-4"><strong>{currentResult.recommendations[0].author}：</strong> {currentResult.recommendations[0].background.split('。')[0]}。</p>
                  <p><strong>推荐理由：</strong> {currentResult.recommendations[0].matchReason}</p>
                </div>
                <div className="h-24 bg-stone-200 rounded-2xl mt-6 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] opacity-40 shadow-inner"></div>
              </div>

              {/* Secondary Matches */}
              <div className="md:col-span-3 md:row-span-3 bento-card p-8 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Secondary Matches</span>
                <div className="space-y-6 flex-grow">
                  {currentResult.recommendations.slice(1).map((poem, i) => (
                    <div key={i} className="pb-4 border-b border-slate-50 last:border-0 group cursor-pointer">
                      <div className="text-base font-serif font-bold text-slate-700 group-hover:text-indigo-600 transition-colors leading-tight">
                        “{poem.content.split(/[，。？！；\n]/)[0]}”
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-tight">
                        {poem.author} · Affinity {90 - (i * 10)}%
                      </div>
                    </div>
                  ))}
                </div>
                 <button 
                   onClick={() => setView('home')}
                   className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-colors"
                 >
                   Return Home
                 </button>
              </div>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 space-y-8"
            >
              <div className="flex justify-between items-center bg-white p-8 rounded-3xl border border-slate-200">
                <div className="space-y-1">
                   <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Personal Archive</span>
                   <h2 className="text-4xl font-serif font-bold text-slate-800">历史足迹</h2>
                </div>
                <button 
                  onClick={() => setView('input')}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg hover:-translate-y-1 transition-all"
                >
                  Write New
                </button>
              </div>

              {history.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {history.map((item, i) => (
                    <div 
                      key={item.id}
                      className={cn(
                        "bento-card p-8 cursor-pointer hover:border-indigo-200 group flex flex-col justify-between",
                        i % 5 === 0 ? "md:col-span-8" : "md:col-span-4"
                      )}
                      onClick={() => {
                        // Prototype note: In a production app you'd load the full matches here
                        // For this turn, we focus on the visual bento layout
                         alert(`感悟：${item.content}\n\n情感：${item.sentiment}`);
                      }}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">
                            {new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold uppercase">
                            {item.sentiment}
                          </span>
                        </div>
                        <p className={cn(
                          "text-slate-700 italic font-serif leading-relaxed line-clamp-3",
                          i % 5 === 0 ? "text-2xl" : "text-lg"
                        )}>
                          “{item.content}”
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                         <div className="flex gap-1">
                           {item.imagery?.slice(0, 3).map((tag: string, j: number) => (
                             <span key={j} className="text-[10px] text-slate-400 uppercase">#{tag}</span>
                           ))}
                         </div>
                         <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200">
                  <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-serif italic text-xl">暂无记录，待君提笔。</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="mt-8 max-w-[1400px] mx-auto w-full flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
        <div className="flex gap-4">
          <span>Engine: BERT-Lumina v2.0</span>
          <span>Status: Synchronized</span>
        </div>
        <span>© 2026 灵犀诗词空间 · 诗意栖居</span>
      </footer>
    </div>
  );
}

