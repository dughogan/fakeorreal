
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameState, MediaItem, UserAnswer, GameDebugConfig } from './types';
import { GAME_DATA } from './constants';
import { CustomContentManager } from './utils/db';
import { playBGM, stopBGM, initAudio } from './utils/music';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GameScreen } from './components/GameScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { AdminScreen } from './components/AdminScreen';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('WELCOME');
  const [gameItems, setGameItems] = useState<MediaItem[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [gameDuration, setGameDuration] = useState<number>(30);
  const [debugConfig, setDebugConfig] = useState<GameDebugConfig | undefined>(undefined);

  // Load custom content on mount
  const loadGameData = async () => {
    try {
      // This now fetches from BOTH IndexedDB and local game_data.json
      const allItems = await CustomContentManager.getAllItems();
      
      // Deduplicate against constants if any (Constants are empty now but keeping for safety)
      const itemMap = new Map<string, MediaItem>();
      GAME_DATA.forEach(item => itemMap.set(item.id, item));
      allItems.forEach(item => itemMap.set(item.id, item));
      
      return Array.from(itemMap.values());
    } catch (e) {
      console.error("Failed to load game items", e);
      return [];
    }
  };

  // Shuffle items when starting a new game
  const startGame = async (duration: number, config?: GameDebugConfig) => {
    setGameDuration(duration);
    setDebugConfig(config);
    
    // Initialize Audio Engine and Start Music
    initAudio();

    const allItems = await loadGameData();

    // CRITICAL: Check if we have any items. 
    // Since GAME_DATA is now empty, we must rely on uploaded content or local game_data.json.
    if (allItems.length === 0) {
      alert("No media found! Please upload a Game Pack (.zip) in the Admin Dashboard, OR ensure a 'game_data.json' and 'media' folder exist in the project root.");
      setGameState('ADMIN');
      return;
    }

    playBGM();
    const shuffled = [...allItems].sort(() => Math.random() - 0.5);
    setGameItems(shuffled);
    setUserAnswers([]);
    setGameState('PLAYING');
  };

  const handleEndGame = (answers: UserAnswer[]) => {
    stopBGM(); // Stop music when game ends
    setUserAnswers(answers);
    setGameState('RESULTS');
  };

  const handleBackToHome = () => {
    stopBGM(); // Ensure music stops if returning home mid-game
    setGameState('WELCOME');
  };

  return (
    <main className="w-full h-full overflow-hidden relative">
      <AnimatePresence mode="wait">
        {gameState === 'WELCOME' && (
          <motion.div
            key="welcome"
            className="w-full h-full"
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
          >
            <WelcomeScreen 
              onStart={(duration) => startGame(duration)} 
              onAdmin={() => setGameState('ADMIN')}
            />
          </motion.div>
        )}

        {gameState === 'ADMIN' && (
          <motion.div
            key="admin"
            className="w-full h-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <AdminScreen 
                onBack={handleBackToHome} 
                onTestGame={(config, duration) => startGame(duration || 30, config)}
            />
          </motion.div>
        )}

        {gameState === 'PLAYING' && (
          <motion.div
            key="playing"
            className="w-full h-full"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GameScreen 
                items={gameItems} 
                duration={gameDuration} 
                onEndGame={handleEndGame} 
                debugConfig={debugConfig}
            />
          </motion.div>
        )}

        {gameState === 'RESULTS' && (
          <motion.div
            key="results"
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResultsScreen 
              answers={userAnswers} 
              onReview={() => setGameState('REVIEW')} 
              onPlayAgain={() => startGame(gameDuration)} 
            />
          </motion.div>
        )}

        {gameState === 'REVIEW' && (
          <motion.div
            key="review"
            className="w-full h-full"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <ReviewScreen 
              answers={userAnswers} 
              items={gameItems} 
              onPlayAgain={() => startGame(gameDuration)}
              onBackToHome={handleBackToHome}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default App;
