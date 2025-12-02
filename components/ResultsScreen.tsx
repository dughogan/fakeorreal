
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, RotateCcw, Trophy, Target } from 'lucide-react';
import { UserAnswer } from '../types';
import { soundManager } from '../utils/SoundManager';
import { playSound } from '../utils/music';
import { Background } from './Background';

interface ResultsScreenProps {
  answers: UserAnswer[];
  onReview: () => void;
  onPlayAgain: () => void;
}

const FIREWORK_COLORS = [
  '#f0c33b', // Gold
  '#1dbbe5', // Cyan
  '#9a281e', // Red
  '#ffffff', // White
  '#39ff14', // Neon Green
];

const BRAND_COLORS = [
  '#245397', // Blue
  '#f0c33b', // Gold
  '#1dbbe5', // Cyan
  '#39ff14', // Neon Green
  '#9a281e', // Red
];

// --- PARTICLES (Reused/Adapted for Results) ---

const TechConfettiParticle: React.FC<{ delay: number }> = ({ delay }) => {
  // Memoize random values to prevent re-render jumps
  const style = useMemo(() => {
    const randomColor = BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];
    const randomLeft = Math.random() * 100;
    const randomShape = Math.random(); 
    const size = 3 + Math.random() * 5; // Reduced size (3-8px)

    return {
      position: 'absolute' as const,
      top: -50,
      left: `${randomLeft}vw`,
      width: `${size}px`,
      height: randomShape > 0.66 ? `${size * 2}px` : `${size}px`, // Rect or Square/Circle
      borderRadius: randomShape < 0.33 ? '50%' : '0%', // Circle or Square
      border: `2px solid ${randomColor}`,
      backgroundColor: 'transparent',
      boxShadow: `0 0 8px ${randomColor}`,
      zIndex: 1,
    };
  }, []);

  return (
    <motion.div
      initial={{ y: -50, rotate: 0, opacity: 1 }}
      animate={{ y: '110vh', rotate: Math.random() * 360 + 180, opacity: [1, 1, 0] }}
      transition={{ duration: 3 + Math.random() * 2, delay: delay, ease: 'linear', repeat: Infinity }}
      style={style}
    />
  );
};

const FireworkParticle: React.FC<{ color: string, x: number, y: number }> = ({ color, x, y }) => {
  const animationProps = useMemo(() => {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 250 + Math.random() * 250; 
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      return { tx, ty };
  }, []);

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
      animate={{ 
        x: animationProps.tx, 
        y: animationProps.ty + 100, // Add gravity fall
        opacity: [1, 1, 0], 
        scale: [1, 1.5, 0] 
      }}
      transition={{ duration: 2.5, ease: "easeOut" }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: '5px',
        height: '5px',
        backgroundColor: color,
        borderRadius: '50%',
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
      }}
    />
  );
};

const FireworkBurst = () => {
    const [bursts, setBursts] = useState<{id: number, x: number, y: number}[]>([]);
    
    useEffect(() => {
        // Immediate bursts
        setBursts([
            { id: 1, x: 20, y: 30 },
            { id: 2, x: 80, y: 30 }
        ]);

        const interval = setInterval(() => {
             const id = Date.now();
             const x = 10 + Math.random() * 80; 
             const y = 10 + Math.random() * 50; 
             setBursts(prev => [...prev, { id, x, y }]);
             setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 3000);
        }, 1500); // Slower interval for big bursts
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none z-0"> 
            {bursts.map(burst => (
                 <div key={burst.id} style={{ position: 'absolute', left: `${burst.x}%`, top: `${burst.y}%` }}>
                     {Array.from({ length: 40 }).map((_, i) => (
                         <FireworkParticle 
                             key={i} 
                             color={FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]} 
                             x={0} 
                             y={0} 
                         />
                     ))}
                 </div>
            ))}
        </div>
    );
};

// --- COMPONENTS ---

// Reusable Tech Button
const TechButton = ({ 
    onClick, 
    children, 
    variant = 'cyan' 
  }: { 
    onClick: () => void; 
    children?: React.ReactNode; 
    variant?: 'cyan' | 'gold'; 
  }) => {
    const clipPath = "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";
    
    // Theme configurations
    const themes = {
      cyan: {
        border: '#1dbbe5',
        bg: 'rgba(29, 187, 229, 0.15)',
        text: 'text-[#1dbbe5]',
        hoverBg: '#1dbbe5',
        hoverText: 'group-hover:text-[#0f172a]'
      },
      gold: {
        border: '#f0c33b',
        bg: 'rgba(240, 195, 59, 0.15)',
        text: 'text-[#f0c33b]',
        hoverBg: '#f0c33b',
        hoverText: 'group-hover:text-[#0f172a]'
      }
    };
    
    const theme = themes[variant];
  
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="relative group w-full h-14 md:h-16 font-bold uppercase tracking-widest"
      >
        {/* Border / Shape */}
        <div 
            className="absolute inset-0 transition-all duration-300"
            style={{ 
                backgroundColor: theme.border, 
                clipPath: clipPath 
            }}
        />
        
        {/* Inner Content Area */}
        <div 
            className="absolute inset-[2px] flex items-center justify-center transition-all duration-300 bg-[#0f172a]"
            style={{ clipPath: clipPath }}
        >
             {/* Hover Fill */}
             <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ backgroundColor: theme.hoverBg }}
             />
             
             {/* Text Content */}
             <div className={`relative z-10 flex items-center gap-3 font-digital text-lg md:text-xl ${theme.text} ${theme.hoverText} transition-colors duration-300`}>
                {children}
             </div>
        </div>
      </motion.button>
    );
};

const ResultStatBox = ({ 
    type, 
    count, 
    label 
}: { 
    type: 'correct' | 'incorrect', 
    count: number, 
    label: string 
}) => {
    const isCorrect = type === 'correct';
    const color = isCorrect ? '#39ff14' : '#ff073a';
    const Icon = isCorrect ? Check : X; // Using basic icons inside a custom circle
    
    // Top-left chamfer
    const clipPath = "polygon(15px 0, 100% 0, 100% 100%, 0 100%, 0 15px)";

    return (
        <div className="relative h-24 sm:h-28 w-full group">
             {/* Glow effect */}
             <div className="absolute inset-0 opacity-20 blur-md transition-opacity group-hover:opacity-40" style={{ backgroundColor: color }} />
             
             {/* Border */}
             <div 
                className="absolute inset-0"
                style={{ backgroundColor: color, clipPath }}
             />
             
             {/* Inner Black Box */}
             <div 
                className="absolute inset-[2px] bg-[#0f172a] flex flex-col items-center justify-center"
                style={{ clipPath }}
             >
                 <div className="flex items-center gap-3 mb-1">
                     {/* Custom Circle Icon */}
                     <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: color }}
                     >
                        <Icon size={20} className="text-[#0f172a] stroke-[3px]" />
                     </div>
                     <span className="font-digital text-4xl sm:text-5xl font-bold text-white">{count}</span>
                 </div>
                 <span className="text-xs sm:text-sm font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
             </div>
        </div>
    );
};

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ answers, onReview, onPlayAgain }) => {
  const [showContent, setShowContent] = useState(false);
  
  const correctCount = answers.filter(a => a.isCorrect).length;
  const incorrectCount = answers.length - correctCount;
  const totalScore = answers.reduce((sum, ans) => sum + (ans.pointsEarned || 0), 0);
  const percentage = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

  useEffect(() => {
     setShowContent(true);
     if (percentage >= 50) {
         playSound('win');
     } else {
         playSound('lose');
     }
  }, [percentage]);

  const handleAction = (action: () => void) => {
      soundManager.playClick();
      action();
  };

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-start overflow-hidden font-sans pt-24 sm:pt-32">
      
      <Background />

      {/* PARTICLES */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => <TechConfettiParticle key={i} delay={i * 0.1} />)}
          <FireworkBurst />
      </div>

      {/* HEADER TITLE - MOVED TO ABSOLUTE TOP */}
      <div className="absolute top-0 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
        >
             <div 
                className="relative bg-gradient-to-r from-brand-gold via-[#ffbb00] to-brand-gold px-16 sm:px-32 py-4 sm:py-6 shadow-[0_0_60px_rgba(240,195,59,0.6)]"
                style={{ 
                    clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
                    minWidth: "min(95vw, 500px)"
                }}
             >
                <div className="text-center">
                    <h1 className="text-4xl sm:text-6xl font-digital font-black text-brand-navy tracking-widest drop-shadow-sm">
                        RESULTS
                    </h1>
                    <p className="text-brand-navy font-black text-xs sm:text-sm tracking-[0.3em] uppercase mt-0 sm:mt-1">
                        GAME COMPLETE
                    </p>
                </div>
             </div>
        </motion.div>
      </div>

      {/* CONTENT CONTAINER */}
      <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center">
         
         {/* MAIN SCORE CARD - MOVED DOWN */}
         <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-xl bg-[#0f172a]/90 border border-brand-cyan/30 backdrop-blur-md p-1 mt-12 sm:mt-20"
            style={{ 
                clipPath: "polygon(40px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 40px)" 
            }}
         >
             <div className="flex flex-col items-center py-8 px-8 sm:px-12 border border-white/5 h-full relative">
                
                 {/* SCORE SECTION */}
                 <div className="flex flex-col items-center mb-8">
                     <div className="flex items-center gap-3 mb-1">
                         <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-brand-gold" />
                         <span className="font-digital text-5xl sm:text-7xl font-bold text-brand-gold tracking-widest drop-shadow-md">
                             {totalScore}
                         </span>
                     </div>
                     <span className="text-brand-gold/80 text-sm font-bold uppercase tracking-[0.3em]">Score</span>
                 </div>

                 {/* ACCURACY SECTION */}
                 <div className="flex flex-col items-center mb-10 w-full">
                     <div className="text-white/70 text-sm font-bold uppercase tracking-widest mb-2">Accuracy</div>
                     <div className="flex items-center gap-3">
                         <Target className="w-8 h-8 text-white" />
                         <span className="font-digital text-5xl sm:text-6xl font-bold text-white tracking-widest">
                             {percentage}%
                         </span>
                     </div>
                 </div>

                 {/* BREAKDOWN GRID */}
                 <div className="grid grid-cols-2 gap-4 w-full">
                     <ResultStatBox type="correct" count={correctCount} label="Correct" />
                     <ResultStatBox type="incorrect" count={incorrectCount} label="Incorrect" />
                 </div>

             </div>
         </motion.div>

         {/* FOOTER BUTTONS */}
         <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-4 w-full max-w-xl mt-20"
         >
             <TechButton onClick={() => handleAction(onReview)} variant="gold">
                 REVIEW ALL
             </TechButton>
             <TechButton onClick={() => handleAction(onPlayAgain)} variant="cyan">
                 PLAY AGAIN
             </TechButton>
         </motion.div>

      </div>
    </div>
  );
};
