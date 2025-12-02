
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Lightbulb, CheckCircle, XCircle, Tag, Cpu } from 'lucide-react';
import { MediaItem, UserAnswer } from '../types';
import { MediaDisplay } from './MediaDisplay';

interface LearnModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: { answer: UserAnswer; itemData: MediaItem };
  onNext?: () => void;
  onPrev?: () => void;
}

export const LearnModal: React.FC<LearnModalProps> = ({ isOpen, onClose, data, onNext, onPrev }) => {
  const { answer, itemData } = data;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-brand-navy/95 backdrop-blur-md"
      >
        {/* Header/Nav Controls */}
        <div className="flex justify-between items-center p-4 shrink-0">
            <button 
                onClick={onClose} 
                className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-full"
            >
                <X className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
                 {onPrev && (
                    <button 
                        onClick={onPrev} 
                        className="p-2 bg-brand-blue text-white hover:bg-brand-blue/80 rounded-full"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                 )}
                 {onNext && (
                    <button 
                        onClick={onNext} 
                        className="p-2 bg-brand-blue text-white hover:bg-brand-blue/80 rounded-full"
                    >
                        <ArrowRight className="w-6 h-6" />
                    </button>
                 )}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
            {/* Media Area - Flexible height, contains image fully with blurred background */}
            <div className="relative w-full h-[50vh] bg-brand-navy mx-auto flex items-center justify-center overflow-hidden border-b border-brand-cyan/10">
                {/* Blurred Background Layer */}
                <div className="absolute inset-0 z-0">
                    <MediaDisplay 
                        item={itemData}
                        autoPlay={true}
                        enableZoom={false}
                        objectFit="cover"
                        muted={true}
                        className="w-full h-full blur-2xl scale-110 opacity-50"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                </div>

                {/* Main Foreground Media */}
                <div className="relative z-10 w-full h-full p-6">
                    <MediaDisplay 
                        item={itemData} 
                        enableZoom={true} 
                        objectFit="contain" 
                        transparent={true}
                        className="w-full h-full shadow-2xl"
                    />
                    
                    <div 
                        className={`absolute top-4 left-4 px-4 py-2 flex items-center gap-2 font-bold shadow-lg backdrop-blur-md ${answer.isCorrect ? 'bg-brand-cyan/90 text-brand-navy' : 'bg-brand-red/90 text-white'}`}
                        style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
                    >
                        {answer.isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        <span>{answer.isCorrect ? 'Correct!' : 'Incorrect'}</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-w-2xl mx-auto">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{itemData.title}</h2>
                    
                    {/* Categories & Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div 
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-gold/20 text-brand-gold border border-brand-gold/30 text-sm font-medium"
                        style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {itemData.category}
                      </div>
                      {itemData.aiModel && (
                        <div 
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm font-medium"
                            style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          {itemData.aiModel}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 mb-6">
                        <div 
                            className={`flex-1 p-3 text-center border ${answer.guessedReal ? 'bg-brand-blue border-brand-cyan text-brand-cyan' : 'bg-brand-red/20 border-brand-red text-brand-red'}`}
                            style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
                        >
                            <div className="text-xs opacity-70 uppercase">You Said</div>
                            <div className="font-bold text-lg">{answer.guessedReal ? 'Real' : 'AI'}</div>
                        </div>
                        <div 
                            className={`flex-1 p-3 text-center border ${itemData.isReal ? 'bg-brand-cyan text-brand-navy border-brand-cyan' : 'bg-brand-red text-white border-brand-red'}`}
                            style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
                        >
                            <div className="text-xs opacity-70 uppercase">Actually</div>
                            <div className="font-bold text-lg">{itemData.isReal ? 'Real' : 'AI'}</div>
                        </div>
                    </div>

                    <p className="text-gray-200 leading-relaxed text-lg">
                        {itemData.explanation}
                    </p>
                </div>

                {/* Tips Box */}
                <div 
                    className="bg-brand-blue/40 border border-brand-cyan/30 p-5"
                    style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
                >
                    <div className="flex items-center gap-2 text-brand-gold mb-3">
                        <Lightbulb className="w-5 h-5 fill-current" />
                        <h3 className="font-bold uppercase tracking-wide">How to Spot It</h3>
                    </div>
                    <ul className="space-y-3">
                        {itemData.tips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-200">
                                <span className="mt-1.5 w-1.5 h-1.5 bg-brand-cyan rounded-full flex-shrink-0" />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
