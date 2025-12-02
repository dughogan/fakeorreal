
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Settings, Volume2, VolumeX, ImageOff } from 'lucide-react';
import { soundManager } from '../utils/SoundManager';
import { initAudio, toggleMute as toggleMusicMute } from '../utils/music';
import { Background } from './Background';

interface WelcomeScreenProps {
  onStart: (duration: number) => void;
  onAdmin?: () => void;
}

// Reusable Tech Button Component for Welcome Screen
const ClipButton = ({ 
  onClick, 
  children, 
  active = false, 
  className = "",
  variant = 'cyan' 
}: { 
  onClick: () => void; 
  children?: React.ReactNode; 
  active?: boolean; 
  className?: string; 
  variant?: 'cyan' | 'gold'; 
}) => {
  // Tech/Sci-Fi cut corner shape
  const clipPath = "polygon(10px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 10px)";
  
  const colors = {
    cyan: { bg: '#1dbbe5', text: 'text-brand-cyan' },
    gold: { bg: '#f0c33b', text: 'text-brand-gold' },
  };
  const theme = colors[variant];
  const hoverBg = '#f0c33b'; // Always Gold on hover

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative group min-w-[100px] font-bold uppercase tracking-widest px-8 py-4 ${className}`}
    >
      {/* Border Layer - Always visible in background */}
      <div 
        className="absolute inset-0 transition-colors duration-300"
        style={{ backgroundColor: theme.bg, clipPath }}
      />
      
      {/* Active Fill Layer - Visible when active */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: theme.bg, clipPath }}
      />

      {/* Hover Fill Layer - Visible on hover (Overlays active fill for gold effect) */}
      <div 
        className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: hoverBg, clipPath }}
      />

      {/* Inner Content Layer (Hollow center logic) */}
      {/* Sits inside the border (3px). Background is Navy. Becomes transparent if Active OR Hovered. */}
      <div 
        className="absolute inset-[3px] flex items-center justify-center transition-colors duration-300"
        style={{ clipPath }}
      >
         <div className={`absolute inset-0 bg-brand-navy transition-opacity duration-300 ${active ? 'opacity-0' : 'group-hover:opacity-0'}`} />
      </div>

      {/* Text Content */}
      <div className={`relative z-10 flex items-center gap-3 transition-colors duration-300 ${active ? 'text-brand-navy' : `${theme.text} group-hover:text-brand-navy`}`}>
        {children}
      </div>
    </motion.button>
  );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onAdmin }) => {
  const [duration, setDuration] = useState<number>(30);
  const [isMuted, setIsMuted] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleStart = () => {
    soundManager.init();
    initAudio(); // Initialize Music Engine
    soundManager.playClick();
    onStart(duration);
  };

  const handleDurationChange = (newDur: number) => {
    soundManager.playClick();
    setDuration(newDur);
  };

  const handleToggleMute = () => {
    const musicMuted = toggleMusicMute();
    soundManager.toggleMute();
    setIsMuted(musicMuted);
    soundManager.playClick();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center relative overflow-hidden bg-brand-navy">
      
      <Background />

      {/* Mute Button */}
      <button 
          onClick={handleToggleMute}
          className="absolute top-6 left-6 p-2 text-brand-cyan/50 hover:text-brand-cyan transition-colors rounded-full hover:bg-white/5 z-20"
          title={isMuted ? "Unmute" : "Mute"}
      >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>

      {/* Background Ambient Animation */}
      <motion.div 
        className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-r from-brand-cyan/10 to-brand-gold/10 rounded-full blur-3xl z-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mb-8"
        >
          {/* ASU Logo with Fallback */}
          {!imgError ? (
            <img 
              src="/graphics/asu.png" 
              alt="ASU Logo" 
              className="w-64 h-auto object-contain drop-shadow-lg"
              onError={() => {
                console.error("Failed to load logo from '/graphics/asu.png'. Ensure the 'graphics' folder is in your project root.");
                setImgError(true);
              }}
            />
          ) : (
             <div className="w-64 h-32 border-2 border-dashed border-brand-cyan/30 bg-brand-navy/50 flex flex-col items-center justify-center p-4 rounded-lg text-brand-cyan/50">
                <ImageOff className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm font-bold uppercase tracking-widest">Logo Missing</span>
                <span className="text-[10px] mt-1 opacity-70">/graphics/asu.png</span>
             </div>
          )}
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-2 tracking-tight font-digital drop-shadow-lg"
        >
          Real or AI?
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-brand-cyan font-medium mb-8 drop-shadow-md"
        >
          {duration}-Second Challenge
        </motion.p>

        {/* Duration Selector */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-12"
        >
            <ClipButton 
              onClick={() => handleDurationChange(30)} 
              active={duration === 30}
              className="text-lg"
            >
              30s
            </ClipButton>
            <ClipButton 
              onClick={() => handleDurationChange(60)} 
              active={duration === 60}
              className="text-lg"
            >
              60s
            </ClipButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ClipButton 
            onClick={handleStart} 
            variant="gold"
            className="text-2xl px-12 py-6"
          >
            <Search className="w-8 h-8 stroke-[3px]" />
            Start Game
          </ClipButton>
        </motion.div>
      </div>

      {/* Admin Button */}
      {onAdmin && (
        <button 
          onClick={() => { soundManager.playClick(); onAdmin(); }}
          className="absolute top-6 right-6 p-2 text-brand-cyan/50 hover:text-brand-cyan transition-colors rounded-full hover:bg-white/5 z-20"
          title="Admin Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
