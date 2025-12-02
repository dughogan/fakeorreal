
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Flame, Trophy, XCircle as XCircleIcon, Search, Volume2, VolumeX } from 'lucide-react';
import { MediaItem, UserAnswer, GameDebugConfig } from '../types';
import { MediaDisplay } from './MediaDisplay';
import { soundManager } from '../utils/SoundManager';
import { toggleMute as toggleMusicMute } from '../utils/music';
import { Background } from './Background';

interface GameScreenProps {
  items: MediaItem[];
  duration: number;
  onEndGame: (answers: UserAnswer[]) => void;
  debugConfig?: GameDebugConfig;
}

// --- VISUAL COMPONENTS ---

const BRAND_COLORS = [
  '#245397', // Blue
  '#f0c33b', // Gold
  '#1c4177', // Navy
  '#cf982a', // Dark Gold
  '#1dbbe5', // Cyan
  '#c4a97c', // Beige
  '#9a281e', // Red
];

const FIREWORK_COLORS = [
  '#f0c33b', // Gold
  '#1dbbe5', // Cyan
  '#9a281e', // Red
  '#ffffff', // White
  '#39ff14', // Neon Green
];

// --- HUD PANEL COMPONENT ---
const HudPanel = ({ children, align = 'left' }: { children?: React.ReactNode, align?: 'left' | 'right' }) => {
  const isRight = align === 'right';

  return (
    <div className={`relative group ${isRight ? 'ml-auto' : 'mr-auto'}`}>
      
      {/* Main Background Shape */}
      <div 
        className="relative z-10 bg-[#1c4177]/90 backdrop-blur-md px-8 py-4 min-w-[180px]"
        style={{ 
          clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)"
        }}
      >
        {children}
      </div>
    </div>
  );
};

// --- PARTICLES ---

const TechConfettiParticle: React.FC<{ delay: number }> = ({ delay }) => {
  // Memoize style to prevent random values from regenerating on every parent render
  const style = useMemo(() => {
    const randomColor = BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];
    const randomLeft = Math.random() * 100;
    const randomShape = Math.random(); // < 0.33 circle, < 0.66 square, else rect
    const size = 3 + Math.random() * 5; // Reduced size (3-8px) for less clutter

    return {
      position: 'absolute' as const,
      top: -50,
      left: `${randomLeft}vw`,
      width: `${size}px`,
      height: randomShape > 0.66 ? `${size * 2}px` : `${size}px`, // Rect or Square/Circle
      borderRadius: randomShape < 0.33 ? '50%' : '0%', // Circle or Square
      border: `2px solid ${randomColor}`,
      backgroundColor: 'transparent',
      boxShadow: `0 0 8px ${randomColor}`, // Glow
      zIndex: 1,
    };
  }, []);

  return (
    <motion.div
      initial={{ y: -50, rotate: 0, opacity: 1 }}
      animate={{ y: '110vh', rotate: Math.random() * 360 + 180, opacity: [1, 1, 0] }}
      transition={{ duration: 3.5 + Math.random() * 2, delay: delay, ease: 'linear', repeat: Infinity }}
      style={style}
    />
  );
};

const ConfettiSystem = ({ isActive }: { isActive: boolean }) => {
  // Reduced count to 50
  const particles = useMemo(() => Array.from({ length: 50 }).map((_, i) => (
    <TechConfettiParticle key={i} delay={i * 0.1} />
  )), []);

  return <div className="absolute inset-0 overflow-hidden pointer-events-none">{particles}</div>;
};

const FireworkParticle: React.FC<{ color: string, x: number, y: number }> = ({ color, x, y }) => {
  // Memoize random trajectory to prevent jitter on re-renders
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
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`, // Stronger glow
      }}
    />
  );
};

const FireworkBurst = () => {
    const [bursts, setBursts] = useState<{id: number, x: number, y: number}[]>([]);
    
    useEffect(() => {
        const initialId = Date.now();
        setBursts([{ id: initialId, x: 50, y: 50 }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== initialId)), 3000);

        const interval = setInterval(() => {
             const id = Date.now();
             const x = 10 + Math.random() * 80; 
             const y = 10 + Math.random() * 60; 
             setBursts(prev => [...prev, { id, x, y }]);
             setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 3000);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none z-10"> 
            {bursts.map(burst => (
                 <div key={burst.id} style={{ position: 'absolute', left: `${burst.x}%`, top: `${burst.y}%` }}>
                     {Array.from({ length: 30 }).map((_, i) => (
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

// --- STREAK CHEVRONS ---
const StreakChevrons = ({ streak }: { streak: number }) => {
    if (streak < 3) return null;
    
    let count = 0;
    let colorClass = "text-brand-cyan";
    
    if (streak >= 7) { 
        count = 7; 
        colorClass = "text-[#ff073a]"; // Neon Red
    } else if (streak >= 5) { 
        count = 5; 
        colorClass = "text-brand-gold"; 
    } else { 
        count = 3; 
        colorClass = "text-brand-cyan"; 
    }

    return (
         <div className="flex justify-center gap-0.5 w-full mt-1">
            {Array.from({ length: count }).map((_, i) => (
                 <motion.span 
                    key={i}
                    animate={{ 
                        opacity: [0.3, 1, 0.3],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.08,
                        ease: "linear"
                    }}
                    className={`font-digital font-bold text-lg leading-3 ${colorClass}`}
                 >
                    &gt;
                 </motion.span>
            ))}
         </div>
    );
}

const TechButton = ({ 
    onClick, 
    disabled, 
    color, 
    label,
    className 
}: { 
    onClick: () => void, 
    disabled: boolean, 
    color: 'green' | 'red', 
    label: string,
    className?: string
}) => {
    const isGreen = color === 'green';
    
    // Colors based on request
    const baseColor = isGreen ? '#2ab679' : '#b62a2a';
    const borderColor = '#f0c33b';
    const hoverColor = '#f0c33b';

    // Top-left chamfer only
    const clipPath = "polygon(24px 0, 100% 0, 100% 100%, 0 100%, 0 24px)";

    return (
        <div className={`relative w-full h-20 sm:h-24 group ${className}`}>
            <motion.button
                whileHover={!disabled ? { scale: 1.02 } : {}}
                whileTap={!disabled ? { scale: 0.98 } : {}}
                onClick={() => {
                    soundManager.playClick();
                    onClick();
                }}
                disabled={disabled}
                className="relative w-full h-full outline-none"
            >
                 {/* Outer Border Container */}
                 <div 
                    className="absolute inset-0 bg-[#f0c33b]"
                    style={{ clipPath }}
                 />
                 
                 {/* Inner Button Face */}
                 <div 
                    className="absolute inset-[4px] flex items-center justify-center overflow-hidden"
                    style={{ 
                        backgroundColor: baseColor,
                        clipPath 
                    }}
                 >
                     {/* Hover Effect Layer */}
                     <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ backgroundColor: hoverColor }}
                     />
                     
                     {/* Gloss/Sheen Overlay */}
                     <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                     {/* Label */}
                     <span className="relative z-10 font-digital font-black text-4xl tracking-[0.2em] uppercase text-white group-hover:text-[#1c4177] transition-colors duration-300 drop-shadow-md">
                        {label}
                    </span>
                 </div>
            </motion.button>
        </div>
    );
};

const NextButton = ({ 
    onClick, 
    children, 
    variant = 'gold' 
  }: { 
    onClick: () => void; 
    children?: React.ReactNode; 
    variant?: 'cyan' | 'gold'; 
  }) => {
    const clipPath = "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";
    
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
        className="relative group w-64 h-16 font-bold uppercase tracking-widest pointer-events-auto"
      >
        <div className="absolute inset-0 transition-all duration-300" style={{ backgroundColor: theme.border, clipPath }} />
        <div className="absolute inset-[2px] flex items-center justify-center transition-all duration-300 bg-[#0f172a]" style={{ clipPath }}>
             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: theme.hoverBg }} />
             <div className={`relative z-10 flex items-center gap-3 font-digital text-xl ${theme.text} ${theme.hoverText} transition-colors duration-300`}>
                {children}
             </div>
        </div>
      </motion.button>
    );
};

export const GameScreen: React.FC<GameScreenProps> = ({ items, duration, onEndGame, debugConfig }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPointsEarned, setLastPointsEarned] = useState(0);
  
  const [streak, setStreak] = useState(debugConfig?.initialStreak || 0);
  const [score, setScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const [earnedBonus, setEarnedBonus] = useState(false);
  const [showBonusRound, setShowBonusRound] = useState(false);
  const [bonusTimer, setBonusTimer] = useState(10);
  const [bonusItems, setBonusItems] = useState<{ real: MediaItem; ai: MediaItem } | null>(null);
  const [bonusDisplayItems, setBonusDisplayItems] = useState<MediaItem[]>([]); 
  const [bonusResult, setBonusResult] = useState<'success' | 'fail' | null>(null);
  const [bonusFeedbackItem, setBonusFeedbackItem] = useState<MediaItem | null>(null);

  const currentItem = items[currentIndex];
  const correctCount = answers.filter(a => a.isCorrect).length;
  
  const BASE_POINTS = 100;
  const BONUS_POINTS = 1000;
  const STREAK_THRESHOLD = 3;
  const MEGA_STREAK_THRESHOLD = 7;
  const FIREWORK_THRESHOLD = 5;
  const BONUS_ROUND_QUALIFIER = 5;

  const isStreakActive = streak >= STREAK_THRESHOLD;
  const isMegaStreakActive = streak >= MEGA_STREAK_THRESHOLD;
  const isFireworksActive = streak >= FIREWORK_THRESHOLD;
  
  // Specific clip path for chamfered top-left corner
  const chamferStyle = {
      clipPath: "polygon(30px 0, 100% 0, 100% 100%, 0 100%, 0 30px)"
  };

  useEffect(() => {
    if (streak >= BONUS_ROUND_QUALIFIER) {
        if (!earnedBonus) {
             // Play subtle streak unlock sound
        }
        setEarnedBonus(true);
    }
  }, [streak, earnedBonus]);

  useEffect(() => {
      if (debugConfig?.forceBonusRound) {
          setEarnedBonus(true);
      }
  }, [debugConfig]);

  useEffect(() => {
    if (showBonusRound) return;

    if (timeLeft <= 0) {
      if (earnedBonus && !showBonusRound && !bonusResult) {
          startBonusRound();
      } else if (!showBonusRound) {
          onEndGame(answers);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onEndGame, answers, showBonusRound, earnedBonus, bonusResult]);

  useEffect(() => {
    if (!showBonusRound || bonusResult !== null) return;

    if (bonusTimer <= 0) {
      handleBonusResult('fail');
      return;
    }

    const timer = setInterval(() => {
      setBonusTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showBonusRound, bonusTimer, bonusResult]);

  const startBonusRound = () => {
      soundManager.playBonusStart();
      const availableReal = items.filter(i => i.isReal);
      const availableAI = items.filter(i => !i.isReal);
      
      const real = availableReal.length > 0 ? availableReal[Math.floor(Math.random() * availableReal.length)] : items[0];
      const ai = availableAI.length > 0 ? availableAI[Math.floor(Math.random() * availableAI.length)] : items[0];
      
      if (real && ai) {
          setBonusItems({ real, ai });
          setBonusFeedbackItem(null);
          setBonusDisplayItems([real, ai].sort(() => Math.random() - 0.5));
          setBonusTimer(10);
          setShowBonusRound(true);
      } else {
          onEndGame(answers);
      }
  };

  const handleBonusResult = (result: 'success' | 'fail', bonusAnswer?: UserAnswer) => {
      setBonusResult(result);
      
      if (result === 'success') {
          soundManager.playBonusSuccess();
          setScore(prev => prev + BONUS_POINTS);
      } else {
          soundManager.playBonusFail();
      }

      // Add bonus points/answer immediately
      if (bonusAnswer) {
          setAnswers(prev => [...prev, bonusAnswer]);
      }
  };

  const handleBonusAnswer = (selectedItem: MediaItem) => {
      if (bonusResult !== null) return;
      
      setBonusFeedbackItem(selectedItem);
      const isCorrect = !selectedItem.isReal; 

      const bonusAnswer: UserAnswer = {
        itemId: selectedItem.id,
        guessedReal: false, 
        isCorrect: isCorrect,
        timeTaken: 0,
        pointsEarned: isCorrect ? BONUS_POINTS : 0
      };

      if (isCorrect) {
          handleBonusResult('success', bonusAnswer);
      } else {
          handleBonusResult('fail', bonusAnswer);
      }
  };

  const handleAnswer = useCallback((guessedReal: boolean) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const isCorrect = guessedReal === currentItem.isReal;
    
    let points = 0;
    if (isCorrect) {
        soundManager.playCorrect();
        const newStreak = streak + 1;
        
        let multiplier = 1;
        if (newStreak >= MEGA_STREAK_THRESHOLD) {
            multiplier = 4;
        } else if (newStreak >= STREAK_THRESHOLD) {
            multiplier = 2;
        }

        points = BASE_POINTS * multiplier;
        setScore(prev => prev + points);
        setStreak(prev => newStreak);
        setLastPointsEarned(points);
        
        if (newStreak >= STREAK_THRESHOLD) {
             soundManager.playStreak();
        }
    } else {
        soundManager.playIncorrect();
        setStreak(0);
        setLastPointsEarned(0);
    }

    const newAnswer: UserAnswer = {
      itemId: currentItem.id,
      guessedReal,
      isCorrect,
      timeTaken: 0,
      pointsEarned: points
    };
    
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    setTimeout(() => {
      setFeedback(null);
      setIsProcessing(false);
      
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setTimeLeft(0);
      }
    }, 1800); // Increased slightly to let user read tip
  }, [currentIndex, currentItem, items.length, answers, isProcessing, streak]);

  const handleToggleMute = () => {
      const musicMuted = toggleMusicMute();
      soundManager.toggleMute();
      setIsMuted(musicMuted);
      soundManager.playClick();
  };

  const showEffects = (isStreakActive && !showBonusRound) || (showBonusRound && bonusResult === 'success');

  return (
    <div className="relative h-full flex flex-col overflow-hidden font-sans">
      
      <Background />

      {/* Mute Button */}
      <button 
          onClick={handleToggleMute}
          className="absolute top-4 left-4 p-2 text-brand-cyan/50 hover:text-brand-cyan transition-colors rounded-full hover:bg-white/5 z-40"
          title={isMuted ? "Unmute" : "Mute"}
      >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
      
      {/* Background Effects */}
      <AnimatePresence>
        {showEffects && (
           <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-0 pointer-events-none"
           >
              <ConfettiSystem isActive={true} />
              {(isFireworksActive || bonusResult === 'success') && <FireworkBurst />}
           </motion.div>
        )}
      </AnimatePresence>

      {/* --- HUD HEADER --- */}
      <div className="relative z-20 w-full pt-8 px-4 sm:px-12 flex justify-between items-start shrink-0">
          
          {/* LEFT: TIMER */}
          <HudPanel align="left">
             <div className="flex flex-col items-center leading-none min-w-[120px]">
                <div className={`text-5xl sm:text-6xl font-digital font-black tracking-widest ${timeLeft < 10 ? 'text-brand-red animate-pulse' : 'text-white'}`}>
                    0:{timeLeft.toString().padStart(2, '0')}
                </div>
                <div className="text-brand-cyan text-sm font-bold uppercase tracking-[0.2em] mt-2">
                    {showBonusRound ? 'BONUS' : 'TIMER'}
                </div>
             </div>
          </HudPanel>

          {/* RIGHT: SCORE & CORRECT */}
          <HudPanel align="right">
             <div className="flex items-center gap-8 min-w-[180px] justify-end">
                 {/* Score */}
                 <div className="flex flex-col items-center leading-none">
                     <span className="text-5xl sm:text-6xl font-digital font-black text-brand-gold drop-shadow-[0_0_15px_rgba(240,195,59,0.5)]">
                        {score}
                     </span>
                     <span className="text-brand-gold text-xs font-bold uppercase tracking-[0.2em] mt-1">Score</span>
                 </div>

                 {/* Divider */}
                 <div className="w-[2px] h-12 bg-brand-cyan/20" />

                 {/* Correct Count */}
                 <div className="flex flex-col items-center leading-none">
                     <div className="flex items-center gap-2">
                        <span className="text-5xl sm:text-6xl font-digital font-black text-white drop-shadow-[0_0_10px_rgba(57,255,20,0.3)]">{correctCount}</span>
                     </div>
                     <span className="text-brand-cyan text-xs font-bold uppercase tracking-wider mt-1">Correct</span>
                 </div>
             </div>
          </HudPanel>
      </div>

      {/* --- ABSOLUTE CENTER ELEMENTS --- */}
      
      {/* 1. STREAK BADGE - Moved Up to avoid overlapping main image */}
      {!showBonusRound && (
        <div className="absolute top-14 left-0 right-0 flex justify-center z-30 pointer-events-none">
             <AnimatePresence>
                {streak > 1 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className={`
                           relative flex flex-col items-center justify-center px-8 py-2
                           bg-brand-navy border-2 border-brand-cyan shadow-[0_0_30px_rgba(29,187,229,0.4)]
                        `}
                        style={{
                            clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)"
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <Flame className={`w-6 h-6 ${isStreakActive ? 'text-brand-red fill-brand-red animate-pulse' : 'text-brand-cyan'}`} />
                            <span className="font-digital text-3xl font-bold text-white tracking-widest drop-shadow-lg">
                                STREAK <span className="text-brand-gold">{streak}</span>
                            </span>
                             {isStreakActive && (
                                <motion.span 
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className={`text-sm font-bold ml-1 bg-black/60 px-2 py-1 border 
                                      ${isMegaStreakActive ? 'text-[#ff073a] border-[#ff073a]/30' : 'text-[#39ff14] border-[#39ff14]/30'}
                                    `}
                                    style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
                                >
                                    {isMegaStreakActive ? '4X' : '2X'}
                                </motion.span>
                             )}
                        </div>
                        
                        <StreakChevrons streak={streak} />
                    </motion.div>
                )}
             </AnimatePresence>
        </div>
      )}

      {/* 2. BONUS BANNER - Centered Top */}
      {showBonusRound && (
        <div className="absolute top-0 left-0 right-0 flex justify-center items-start z-30 pointer-events-none">
            <motion.div 
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative bg-gradient-to-r from-brand-gold via-[#ffbb00] to-brand-gold px-12 sm:px-20 py-2 sm:py-4 shadow-[0_0_60px_rgba(240,195,59,0.6)]"
                style={{ 
                    clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
                    minWidth: "min(90vw, 500px)"
                }}
            >
                <div className="text-center">
                    <h2 className="text-3xl sm:text-5xl font-digital font-black text-brand-navy tracking-widest drop-shadow-sm">
                        BONUS ROUND
                    </h2>
                    <p className="text-brand-navy font-black text-xs sm:text-sm tracking-[0.3em] uppercase mt-0 sm:mt-1">
                        SPOT THE DEEPFAKE
                    </p>
                </div>
            </motion.div>
        </div>
      )}

      {/* --- MAIN GAME CONTENT AREA --- */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 pb-12 z-10 w-full">
        
        {showBonusRound ? (
            /* BONUS ROUND LAYOUT */
            <motion.div
                key="bonus-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex flex-col items-center justify-center pb-12"
            >
                {/* Bonus Game Grid */}
                <div className="relative w-full max-w-5xl h-[50vh] min-h-[300px] flex flex-row gap-4 md:gap-8 px-2 md:px-0 mt-12">
                    
                    {/* Render Both Options */}
                    {bonusDisplayItems.map((item) => {
                         const isReal = item.isReal;
                         const isAi = !isReal;
                         const isRevealed = bonusResult !== null;
                         const borderWidth = isRevealed ? '6px' : '4px';
                         
                         return (
                            <button 
                                key={item.id}
                                onClick={() => handleBonusAnswer(item)}
                                disabled={isRevealed}
                                className={`
                                    flex-1 relative group outline-none
                                    transition-transform duration-300
                                    ${isRevealed && isReal ? 'scale-95 opacity-60' : ''}
                                    ${isRevealed && isAi ? 'z-20 scale-105' : ''}
                                `}
                            >
                                {/* BORDER LAYER */}
                                <div 
                                    className={`
                                        absolute inset-0 transition-colors duration-300
                                        ${!isRevealed ? 'bg-brand-navy group-hover:bg-brand-gold shadow-[0_0_30px_rgba(240,195,59,0)] group-hover:shadow-[0_0_30px_rgba(240,195,59,0.3)]' : ''}
                                        ${isRevealed && isReal ? 'bg-[#ff073a] shadow-2xl' : ''}
                                        ${isRevealed && isAi ? 'bg-[#39ff14] shadow-[0_0_50px_rgba(57,255,20,0.5)]' : ''}
                                    `}
                                    style={chamferStyle}
                                />

                                {/* CONTENT LAYER */}
                                <div 
                                    className="absolute bg-black overflow-hidden"
                                    style={{
                                        ...chamferStyle,
                                        top: borderWidth,
                                        left: borderWidth,
                                        right: borderWidth,
                                        bottom: borderWidth
                                    }}
                                >
                                    <div className="w-full h-full relative">
                                        <MediaDisplay item={item} enableZoom={false} objectFit="cover" />
                                        
                                        {/* Hover Tint */}
                                        {!isRevealed && (
                                            <div className="absolute inset-0 bg-brand-gold/0 group-hover:bg-brand-gold/10 transition-colors" />
                                        )}

                                        {/* REVEAL OVERLAYS */}
                                        {isRevealed && (
                                            <>
                                                {/* Bottom Label */}
                                                <div className={`absolute bottom-0 inset-x-0 py-3 md:py-4 text-center font-digital font-black text-2xl md:text-4xl tracking-widest uppercase ${isReal ? 'bg-[#ff073a] text-white' : 'bg-[#39ff14] text-black'}`}>
                                                    {isReal ? 'REAL' : 'FAKE'}
                                                </div>

                                                {/* Deepfake Detected Overlay (Only on AI item) */}
                                                {isAi && (
                                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%]">
                                                        <motion.div 
                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            className="bg-[#0f172a]/95 border-2 border-[#39ff14] p-4 text-center shadow-[0_0_50px_rgba(57,255,20,0.5)] backdrop-blur-md"
                                                            style={{ clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)" }}
                                                        >
                                                            <div className="flex items-center justify-center gap-3 md:gap-4 mb-2">
                                                                <div className="hidden sm:block rounded-full border-4 border-[#39ff14] p-1">
                                                                    <Check className="w-8 h-8 md:w-10 md:h-10 text-[#39ff14]" strokeWidth={4} />
                                                                </div>
                                                                <div className="text-left leading-none">
                                                                    <div className="text-[#39ff14] font-digital text-xs md:text-sm tracking-widest">CONFIRMED</div>
                                                                    <div className="text-white font-digital font-bold text-xl md:text-3xl tracking-wider">DEEPFAKE<br/>DETECTED</div>
                                                                </div>
                                                            </div>
                                                            {bonusResult === 'success' && (
                                                                <div className="text-brand-gold font-black text-4xl md:text-5xl mt-2 drop-shadow-md">
                                                                    +{BONUS_POINTS}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </button>
                         );
                    })}
                </div>

                {/* Next Button or Timer Bar */}
                <div className="mt-12 h-20 flex items-center justify-center w-full">
                    {bonusResult ? (
                         <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                         >
                            <NextButton onClick={() => {
                                soundManager.playClick();
                                onEndGame(answers);
                            }} variant="gold">
                                NEXT
                            </NextButton>
                         </motion.div>
                    ) : (
                        <div className="w-full max-w-md h-2 bg-brand-navy rounded-full overflow-hidden border border-white/20">
                            <motion.div 
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: 10, ease: 'linear' }}
                                className="h-full bg-gradient-to-r from-brand-red to-brand-gold"
                            />
                        </div>
                    )}
                </div>
            </motion.div>

        ) : (
            /* STANDARD GAME LAYOUT */
            <div className="relative w-full max-w-2xl aspect-[4/5] md:aspect-[3/4] max-h-[50vh] md:max-h-[60vh] mt-8 md:mt-0">
                <AnimatePresence mode="wait">
                <motion.div
                    key={currentItem.id}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.05, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full h-full relative"
                >
                    {/* Image Container with specific Chamfer Cut + Rounded styling */}
                    <div 
                        className="w-full h-full bg-black relative overflow-hidden shadow-2xl border-2 border-brand-cyan/20 rounded-br-2xl rounded-bl-lg rounded-tr-lg"
                        style={chamferStyle}
                    >
                         <MediaDisplay item={currentItem} enableZoom={true} />
                         
                         {/* Tech Corners (Decorative within the container) */}
                         <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-brand-cyan/50 rounded-tr-lg pointer-events-none" />
                         <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-brand-cyan/50 rounded-bl-lg pointer-events-none" />
                         <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-brand-cyan/50 rounded-br-2xl pointer-events-none" />
                    </div>

                    {/* Feedback Overlay */}
                    <AnimatePresence>
                      {feedback && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1.0 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-30 bg-brand-navy/80 backdrop-blur-md flex flex-col items-center justify-between py-4 overflow-hidden rounded-br-2xl rounded-bl-lg rounded-tr-lg"
                          style={chamferStyle}
                        >
                          {/* 1. TRUTH BANNER (Top) */}
                          <motion.div 
                            initial={{ y: -50 }}
                            animate={{ y: 0 }}
                            className="w-full flex justify-center pt-0"
                          >
                             <div 
                                className={`
                                    relative px-16 py-4 pb-6 
                                    ${currentItem.isReal ? 'bg-brand-cyan' : 'bg-[#ff073a]'}
                                    shadow-[0_10px_40px_rgba(0,0,0,0.5)]
                                `}
                                style={{ 
                                    clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)"
                                }}
                             >
                                <h2 className={`text-4xl sm:text-5xl font-digital font-black tracking-[0.2em] uppercase ${currentItem.isReal ? 'text-brand-navy' : 'text-white'}`}>
                                    {currentItem.isReal ? 'REAL' : 'AI'}
                                </h2>
                             </div>
                          </motion.div>

                          {/* 2. CENTER STATUS */}
                          <div className="flex flex-col items-center justify-center w-full relative">
                              {/* Big Circular Icon */}
                              <motion.div 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                className="mb-4"
                              >
                                 <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white flex items-center justify-center border-[6px] border-white shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                                     {feedback === 'correct' ? (
                                         <Check className="w-16 h-16 sm:w-20 sm:h-20 text-brand-navy stroke-[5]" />
                                     ) : (
                                         <X className="w-16 h-16 sm:w-20 sm:h-20 text-brand-red stroke-[5]" />
                                     )}
                                 </div>
                              </motion.div>

                              {/* Status Text */}
                              <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-center"
                              >
                                  <h2 className="text-4xl sm:text-5xl font-digital font-black tracking-widest uppercase text-white mb-2 drop-shadow-lg">
                                      {feedback === 'correct' ? 'CORRECT!' : 'WRONG!'}
                                  </h2>
                                  {feedback === 'correct' && lastPointsEarned > 0 && (
                                    <div className="text-5xl sm:text-6xl font-digital font-black text-brand-gold drop-shadow-[0_0_25px_rgba(240,195,59,0.8)]">
                                        +{lastPointsEarned}
                                    </div>
                                  )}
                              </motion.div>
                          </div>
                          
                          {/* 3. BOTTOM TIP PANEL */}
                          <motion.div 
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-full px-4 sm:px-8"
                          >
                              <div className="relative w-full min-h-[6rem] sm:min-h-[7rem] rounded-3xl overflow-hidden border-[3px] border-brand-gold bg-brand-navy shadow-2xl flex items-stretch">
                                  
                                  {/* Yellow Left Side Background - Trapezoid */}
                                  <div 
                                     className="absolute inset-y-0 left-0 w-[45%] bg-brand-gold z-0"
                                     style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)" }}
                                  />
                                  
                                  {/* Content Wrapper */}
                                  <div className="relative z-10 flex w-full">
                                      {/* Left Side Content */}
                                      <div className="w-[45%] flex flex-col items-center justify-center text-center p-2 shrink-0">
                                         <Search className="w-6 h-6 sm:w-8 sm:h-8 text-brand-navy mb-1" strokeWidth={3} />
                                         <div className="text-brand-navy font-black uppercase leading-none text-xs sm:text-base tracking-wide">
                                             DID YOU<br/>SPOT IT?
                                         </div>
                                      </div>
                                      
                                      {/* Right Side Content */}
                                      <div className="flex-1 flex items-center justify-start pl-4 pr-6 py-2">
                                          <p className="text-white font-bold text-sm sm:text-lg leading-tight">
                                              {currentItem.shortTip || currentItem.category}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          </motion.div>

                        </motion.div>
                      )}
                    </AnimatePresence>

                </motion.div>
                </AnimatePresence>
            </div>
        )}
      </div>

      {/* FOOTER BUTTONS (Only show in standard mode) */}
      {!showBonusRound && (
        <div className="relative z-20 px-6 pb-20 pt-2 grid grid-cols-2 gap-4 max-w-2xl mx-auto w-full shrink-0">
            <TechButton 
                color="green"
                label="REAL"
                onClick={() => handleAnswer(true)}
                disabled={isProcessing}
            />

            <TechButton 
                color="red"
                label="AI"
                onClick={() => handleAnswer(false)}
                disabled={isProcessing}
            />
        </div>
      )}
    </div>
  );
};
