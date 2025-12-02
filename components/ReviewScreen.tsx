
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, RotateCcw, BrainCircuit, Image as ImageIcon, AlertTriangle, Trophy, Home, Eye } from 'lucide-react';
import { UserAnswer, MediaItem } from '../types';
import { MediaDisplay } from './MediaDisplay';
import { LearnModal } from './LearnModal';
import { soundManager } from '../utils/SoundManager';
import { Background } from './Background';

interface ReviewScreenProps {
  answers: UserAnswer[];
  items: MediaItem[]; // All items, to lookup data by ID
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

// Reusable Tech Button matching global style
const TechButton = ({ 
    onClick, 
    children, 
    className = "",
    variant = 'cyan' 
  }: { 
    onClick: () => void; 
    children?: React.ReactNode; 
    className?: string; 
    variant?: 'cyan' | 'gold' | 'red'; 
  }) => {
    // Chamfered corners
    const clipPath = "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";
    
    const colors = {
      cyan: { border: '#1dbbe5', bg: 'rgba(29, 187, 229, 0.1)', text: 'text-brand-cyan', hoverBg: '#1dbbe5' },
      gold: { border: '#f0c33b', bg: 'rgba(240, 195, 59, 0.1)', text: 'text-brand-gold', hoverBg: '#f0c33b' },
      red:  { border: '#9a281e', bg: 'rgba(154, 40, 30, 0.1)', text: 'text-brand-red', hoverBg: '#9a281e' },
    };
    const theme = colors[variant];
  
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`relative group w-full h-12 md:h-14 font-bold uppercase tracking-widest ${className}`}
      >
        {/* Border / Background Layer */}
        <div className="absolute inset-0 transition-colors duration-300" style={{ backgroundColor: theme.border, clipPath }} />
        
        {/* Inner Content Layer */}
        <div className="absolute inset-[2px] bg-[#0f172a] flex items-center justify-center transition-all duration-300" style={{ clipPath }}>
             {/* Hover Fill */}
             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: theme.hoverBg }} />
             
             {/* Text/Icon */}
             <div className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 ${theme.text} group-hover:text-[#0f172a]`}>
                {children}
             </div>
        </div>
      </motion.button>
    );
};

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ answers, items, onPlayAgain, onBackToHome }) => {
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [iconError, setIconError] = useState(false);
  
  // Timers references
  const idleTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  
  // State reference for event listeners to access current value without re-binding
  const isWarningVisibleRef = useRef(showIdleWarning);

  const IDLE_TIMEOUT = 60000; // 60 seconds before warning appears
  const COUNTDOWN_DURATION = 15000; // 15 seconds to click "I'm here" before reset

  useEffect(() => {
    isWarningVisibleRef.current = showIdleWarning;
  }, [showIdleWarning]);

  const startIdleTimer = useCallback(() => {
    // Clear any existing timers
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);

    // Start the main idle timer
    idleTimerRef.current = window.setTimeout(() => {
      setShowIdleWarning(true);
      
      // Start the hard reset timer immediately when warning shows
      resetTimerRef.current = window.setTimeout(() => {
        console.log("Idle timeout reached, resetting game.");
        onBackToHome();
      }, COUNTDOWN_DURATION);

    }, IDLE_TIMEOUT);
  }, [onBackToHome]);

  const handleUserActivity = useCallback(() => {
    // If warning is visible, ignore general activity (user must click button)
    if (isWarningVisibleRef.current) return;
    
    // Reset the timer
    startIdleTimer();
  }, [startIdleTimer]);

  const handleResumeGame = () => {
    soundManager.playClick();
    setShowIdleWarning(false);
    startIdleTimer();
  };

  const handleAction = (action: () => void) => {
    soundManager.playClick();
    action();
  };

  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    
    // Throttle the activity handler slightly to prevent excessive timer resets on mousemove
    let lastRun = 0;
    const throttledHandler = () => {
        const now = Date.now();
        if (now - lastRun > 1000) { // Only reset once per second max
            handleUserActivity();
            lastRun = now;
        }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, throttledHandler);
    });

    // Initial start
    startIdleTimer();

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      activityEvents.forEach(event => {
        window.removeEventListener(event, throttledHandler);
      });
    };
  }, [handleUserActivity, startIdleTimer]);

  // Process data: Merge answers with item data, then group and sort
  const { aiItems, realItems, flatList, correctCount, totalScore } = useMemo(() => {
    const merged = answers.map(answer => ({
      answer,
      itemData: items.find(i => i.id === answer.itemId)!
    }));

    // Sort helper: Correct first, then Incorrect
    const sortFn = (a: typeof merged[0], b: typeof merged[0]) => {
      if (a.answer.isCorrect === b.answer.isCorrect) return 0;
      return a.answer.isCorrect ? -1 : 1;
    };

    const ai = merged.filter(x => !x.itemData.isReal).sort(sortFn);
    const real = merged.filter(x => x.itemData.isReal).sort(sortFn);
    const score = answers.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);

    return {
      aiItems: ai,
      realItems: real,
      flatList: [...ai, ...real], // Flattened list for sequential modal navigation
      correctCount: answers.filter(a => a.isCorrect).length,
      totalScore: score
    };
  }, [answers, items]);

  // Navigation handlers for the modal
  const handleNext = () => {
    if (selectedItemIndex !== null && selectedItemIndex < flatList.length - 1) {
      soundManager.playClick();
      setSelectedItemIndex(selectedItemIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedItemIndex !== null && selectedItemIndex > 0) {
      soundManager.playClick();
      setSelectedItemIndex(selectedItemIndex - 1);
    }
  };

  const handleItemClick = (index: number) => {
      soundManager.playClick();
      setSelectedItemIndex(index);
  };

  // Helper to render a single grid item
  const renderGridItem = (data: typeof flatList[0], index: number) => {
    const isCorrect = data.answer.isCorrect;
    const color = isCorrect ? '#39ff14' : '#ff073a'; // Neon Green / Neon Red
    
    // Tech corners style
    const clipPath = "polygon(15px 0, 100% 0, 100% 100%, 0 100%, 0 15px)";

    return (
        <motion.div
          key={data.answer.itemId}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => handleItemClick(index)}
          className="relative aspect-square group cursor-pointer"
        >
            {/* Border Container */}
            <div className="absolute inset-0 transition-all duration-300 group-hover:scale-[1.02]" style={{ backgroundColor: color, clipPath }} />
            
            {/* Inner Content */}
            <div className="absolute inset-[3px] bg-[#0f172a] overflow-hidden" style={{ clipPath }}>
                 <MediaDisplay item={data.itemData} className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" autoPlay={false} />
                 
                 {/* Gradient Overlay for Text */}
                 <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                 
                 {/* Status Badge */}
                 <div className="absolute top-0 right-0 p-2">
                     <div className="bg-black/60 backdrop-blur-sm rounded-bl-lg p-1.5 border-l border-b border-white/10">
                        {isCorrect ? <Check className="w-4 h-4 text-[#39ff14]" strokeWidth={3} /> : <X className="w-4 h-4 text-[#ff073a]" strokeWidth={3} />}
                     </div>
                 </div>

                 {/* Title */}
                 <div className="absolute bottom-3 left-3 right-3">
                     <p className="text-white text-xs font-bold uppercase tracking-wider truncate border-l-2 pl-2" style={{ borderColor: color }}>
                        {data.itemData.title}
                     </p>
                 </div>
                 
                 {/* Hover 'View' Icon */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-brand-navy/80 p-2 rounded-full border border-brand-cyan/50">
                        <Eye className="w-6 h-6 text-brand-cyan drop-shadow-lg" />
                    </div>
                 </div>
            </div>
        </motion.div>
    );
  };

  const headerClip = "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 30px) 100%, 30px 100%, 0 calc(100% - 20px))";

  return (
    <div className="h-full flex flex-col relative font-sans overflow-hidden bg-brand-navy">
      
      <Background />

      {/* Header */}
      <div className="relative z-10 p-4 shrink-0">
         <div 
            className="bg-[#0f172a]/90 backdrop-blur-md border border-brand-cyan/20 p-6 flex flex-col md:flex-row justify-between items-center gap-4"
            style={{ clipPath: headerClip }}
         >
            <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-digital font-black text-white tracking-widest drop-shadow-[0_0_10px_rgba(29,187,229,0.5)]">
                    REVIEW <span className="text-brand-gold">LOG</span>
                </h2>
                <p className="text-brand-cyan/70 text-xs font-bold uppercase tracking-[0.2em] mt-1">
                    Select any file to analyze metadata
                </p>
            </div>

            <div className="flex items-center gap-6 md:gap-8">
                 {/* Score Display */}
                 <div className="flex flex-col items-center md:items-end">
                     <div className="flex items-center gap-2 text-brand-gold">
                         {!iconError ? (
                            <img 
                                src="https://raw.githubusercontent.com/dughogan/fakeorreal/f08a5fafb6820cd77b672d72df27f6abfa8efe27/trophy.png"
                                onError={() => setIconError(true)}
                                alt="Score" 
                                className="w-5 h-5 object-contain" 
                            />
                         ) : (
                            <Trophy className="w-5 h-5 text-brand-gold" />
                         )}
                         <span className="font-bold text-xs uppercase tracking-widest">Score</span>
                     </div>
                     <span className="text-3xl font-black text-white font-digital tracking-wider">{totalScore}</span>
                 </div>

                 {/* Divider */}
                 <div className="w-px h-10 bg-white/10 hidden md:block" />

                 {/* Count Display */}
                 <div className="flex flex-col items-center md:items-end">
                     <div className="text-brand-cyan font-bold text-xs uppercase tracking-widest mb-0.5">Accuracy</div>
                     <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white font-digital tracking-wider">{correctCount}</span>
                        <span className="text-white/40 font-bold text-sm">/ {answers.length}</span>
                     </div>
                 </div>
            </div>
         </div>
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-28 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-10 py-4">
            {/* AI Section */}
            {aiItems.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6 pb-2 border-b-2 border-brand-red/20">
                  <div className="p-2 bg-brand-red/10 rounded-md border border-brand-red/30">
                     <BrainCircuit className="w-6 h-6 text-brand-red" />
                  </div>
                  <h3 className="text-2xl font-digital font-bold text-white tracking-widest">AI GENERATED</h3>
                  <div 
                    className="ml-auto text-xs font-bold bg-brand-red/20 text-brand-red px-3 py-1 border border-brand-red/30"
                    style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}
                  >
                    {aiItems.filter(i => i.answer.isCorrect).length} / {aiItems.length} Correct
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {aiItems.map((item, i) => renderGridItem(item, i))}
                </div>
              </section>
            )}

            {/* Real Section */}
            {realItems.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6 pb-2 border-b-2 border-brand-cyan/20">
                  <div className="p-2 bg-brand-cyan/10 rounded-md border border-brand-cyan/30">
                     <ImageIcon className="w-6 h-6 text-brand-cyan" />
                  </div>
                  <h3 className="text-2xl font-digital font-bold text-white tracking-widest">REAL MEDIA</h3>
                  <div 
                    className="ml-auto text-xs font-bold bg-brand-cyan/20 text-brand-cyan px-3 py-1 border border-brand-cyan/30"
                    style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}
                  >
                    {realItems.filter(i => i.answer.isCorrect).length} / {realItems.length} Correct
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {realItems.map((item, i) => renderGridItem(item, aiItems.length + i))}
                </div>
              </section>
            )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-20 shrink-0 p-4 bg-gradient-to-t from-brand-navy via-brand-navy to-transparent">
        <div className="max-w-4xl mx-auto flex gap-4">
            <TechButton onClick={() => handleAction(onBackToHome)} variant="cyan">
               <Home className="w-5 h-5" /> Home
            </TechButton>
            <TechButton onClick={() => handleAction(onPlayAgain)} variant="gold">
               <RotateCcw className="w-5 h-5" /> Play Again
            </TechButton>
        </div>
      </div>

      {/* Learn Modal */}
      {selectedItemIndex !== null && (
        <LearnModal
          isOpen={true}
          onClose={() => { soundManager.playClick(); setSelectedItemIndex(null); }}
          data={flatList[selectedItemIndex]}
          onNext={selectedItemIndex < flatList.length - 1 ? handleNext : undefined}
          onPrev={selectedItemIndex > 0 ? handlePrev : undefined}
        />
      )}

      {/* Idle Warning Modal */}
      <AnimatePresence>
        {showIdleWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f172a] border-2 border-brand-cyan/30 p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(29,187,229,0.2)] relative overflow-hidden"
              style={{ clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)" }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-navy">
                 <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: COUNTDOWN_DURATION / 1000, ease: "linear" }}
                    className="h-full bg-brand-gold"
                 />
              </div>
              
              <div 
                className="mx-auto w-16 h-16 bg-brand-gold/10 flex items-center justify-center text-brand-gold mb-6 rounded-full border-2 border-brand-gold/50 animate-pulse"
              >
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-digital font-bold text-white mb-2 tracking-wide">IDLE DETECTED</h3>
              <p className="text-brand-cyan/80 mb-8 font-medium">Session expiring soon.</p>
              
              <TechButton onClick={handleResumeGame} variant="gold">
                I'm Still Here
              </TechButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
