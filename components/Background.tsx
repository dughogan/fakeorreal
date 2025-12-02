import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Component to animate a single path trace
const NeuronPath = ({ d, color, duration, delay }: { d: string, color: string, duration: number, delay: number }) => {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth="2" // Matches pattern stroke width roughly (pattern is 1px but double opacity)
      strokeLinecap="square" // Matches the tech/grid aesthetic
      strokeLinejoin="miter"
      vectorEffect="non-scaling-stroke"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ 
        pathLength: [0, 0.6, 0.6, 1], // Grow, hold length, finish
        opacity: [0, 1, 1, 0] // Fade in, stay, fade out before end
      }}
      transition={{ 
        duration: duration, 
        ease: "linear",
        repeat: Infinity, 
        repeatDelay: Math.random() * 4 + 2, 
        delay: delay 
      }}
      style={{
        filter: `drop-shadow(0 0 4px ${color})`
      }}
    />
  );
};

interface GridPath {
    id: string;
    d: string;
    color: string;
    duration: number;
    delay: number;
}

const COLORS = ['#1dbbe5', '#f0c33b', '#39ff14', '#1dbbe5']; 

// EXACT MATCH to the SVG Pattern Dimensions
const COL_W = 60;
const ROW_H = 100;

export const Background = () => {
  const [leftPaths, setLeftPaths] = useState<GridPath[]>([]);
  const [rightPaths, setRightPaths] = useState<GridPath[]>([]);
  
  // Walker that stays strictly on the grid graph
  const generatePaths = (count: number, offsetX: number, offsetY: number) => {
      const paths: GridPath[] = [];
      
      for (let i = 0; i < count; i++) {
        // Random start point in grid coordinates
        // We generate a wide field to ensure coverage after rotation
        let c = Math.floor(Math.random() * 20) - 10 + offsetX; 
        let r = Math.floor(Math.random() * 20) - 10 + offsetY;

        // Calculate actual pixel start coordinates
        // Logic: 
        // Even columns (0, 2, 4...) are "Spines" -> nodes at (c*60, r*100)
        // Odd columns (1, 3, 5...) are "Centers" -> nodes at (c*60 + 30, r*100 + 50) - Wait, no.
        // Let's stick to the Pattern definition:
        // Spines are at x=0, x=60. 
        // Centers are at x=30, y=50.
        
        // Simplified Grid Coordinate System:
        // Node Type A (Spine): X = even * 30. Y = integer * 100. (e.g. 0,0; 60,0)
        // Node Type B (Center): X = odd * 30. Y = integer * 100 + 50. (e.g. 30,50)
        
        // Let's randomize 'c' as the 30px unit column index
        // If c is even, y must be multiple of 100.
        // If c is odd, y must be multiple of 100 + 50.
        
        let x = c * 30;
        let y = r * 100;
        if (c % 2 !== 0) {
            y += 50;
        }

        let d = `M${x} ${y}`;
        
        // Walker State
        let currentC = c;
        let currentY = y;
        
        // Direction tracking for momentum (dx, dy)
        let lastDx = 0; 
        let lastDy = 0;

        const steps = 5 + Math.floor(Math.random() * 8); // 5 to 12 steps

        for(let s = 0; s < steps; s++) {
             const isSpine = (currentC % 2 === 0);
             const moves: { dc: number, dy: number }[] = [];

             // 1. Vertical Moves (Only possible if on a Spine / Even Column)
             if (isSpine) {
                 moves.push({ dc: 0, dy: -100 }); // Up
                 moves.push({ dc: 0, dy: 100 });  // Down
             }

             // 2. Diagonal Moves (Always possible to adjacent columns)
             // From Spine (Even): go to Odd (y + 50 or y - 50)
             // From Center (Odd): go to Spine (y + 50 or y - 50)
             
             // To Left
             moves.push({ dc: -1, dy: -50 });
             moves.push({ dc: -1, dy: 50 });
             
             // To Right
             moves.push({ dc: 1, dy: -50 });
             moves.push({ dc: 1, dy: 50 });

             // --- DECISION ENGINE ---
             
             // A. Filter out immediate reversals
             const validMoves = moves.filter(m => !(m.dc === -lastDx && m.dy === -lastDy));

             // B. Momentum Preference
             // If we were moving vertically, try to keep moving vertically (creates long lines)
             const verticalMove = validMoves.find(m => m.dc === 0 && m.dc === lastDx && m.dy === lastDy);
             
             let selected;
             
             if (verticalMove && Math.random() > 0.4) {
                 // 60% chance to continue straight line run
                 selected = verticalMove;
             } else {
                 // Random choice
                 selected = validMoves[Math.floor(Math.random() * validMoves.length)];
             }

             if (!selected) selected = moves[0]; // Fallback

             // Apply
             currentC += selected.dc;
             currentY += selected.dy;
             
             lastDx = selected.dc;
             lastDy = selected.dy;

             d += ` L${currentC * 30} ${currentY}`;
        }

        paths.push({
            id: `path-${offsetX}-${i}`,
            d,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            duration: 6 + Math.random() * 8, // Slower, more majestic
            delay: Math.random() * 8
        });
      }
      return paths;
  };

  useEffect(() => {
    // Generate paths relative to origin. 
    // Since we rotate the container, we just need enough density around (0,0) to fill the corner.
    setLeftPaths(generatePaths(40, 0, 0));
    setRightPaths(generatePaths(40, 5, 0)); // Offset seed slightly for variety
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#1c4177] z-0">
      
      {/* 1. SHARED PATTERN DEFINITION */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="tech-grid-rotated" x="0" y="0" width="60" height="100" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
             {/* Vertical Spines */}
             <path d="M0 0 V100" stroke="#466899" strokeWidth="1" fill="none" opacity="0.5" />
             <path d="M60 0 V100" stroke="#466899" strokeWidth="1" fill="none" opacity="0.5" />
             
             {/* Diamond Edges */}
             <path d="M0 0 L30 50 L0 100" stroke="#466899" strokeWidth="1" fill="none" opacity="0.7" />
             <path d="M60 0 L30 50 L60 100" stroke="#466899" strokeWidth="1" fill="none" opacity="0.7" />
             
             {/* Nodes */}
             <circle cx="0" cy="0" r="1.5" fill="#466899" opacity="0.9" />
             <circle cx="0" cy="100" r="1.5" fill="#466899" opacity="0.9" />
             <circle cx="60" cy="0" r="1.5" fill="#466899" opacity="0.9" />
             <circle cx="60" cy="100" r="1.5" fill="#466899" opacity="0.9" />
             <circle cx="30" cy="50" r="1.5" fill="#466899" opacity="0.9" />
          </pattern>
        </defs>
      </svg>

      {/* 2. LEFT CORNER ZONE */}
      <div 
        className="absolute bottom-0 left-0 w-[45vw] h-[45vh]"
        style={{
            // Radial mask fades out at 65% to avoid hard border cutoffs at top
            maskImage: 'radial-gradient(circle at bottom left, black 0%, black 20%, transparent 65%)',
            WebkitMaskImage: 'radial-gradient(circle at bottom left, black 0%, black 20%, transparent 65%)'
        }}
      >
         {/* Static Grid */}
         <div className="absolute inset-0 w-full h-full opacity-40">
             <svg width="100%" height="100%">
                 <rect width="100%" height="100%" fill="url(#tech-grid-rotated)" />
             </svg>
         </div>

         {/* Animation - Rotated to match pattern */}
         <svg className="absolute inset-0 w-full h-full overflow-visible">
            <g transform="rotate(45)"> 
                {leftPaths.map((p) => <NeuronPath key={p.id} {...p} />)}
            </g>
         </svg>
      </div>

      {/* 3. RIGHT CORNER ZONE */}
      <div 
        className="absolute bottom-0 right-0 w-[45vw] h-[45vh]"
        style={{
            maskImage: 'radial-gradient(circle at bottom right, black 0%, black 20%, transparent 65%)',
            WebkitMaskImage: 'radial-gradient(circle at bottom right, black 0%, black 20%, transparent 65%)'
        }}
      >
         {/* Static Grid */}
         <div className="absolute inset-0 w-full h-full opacity-40">
             <svg width="100%" height="100%">
                 <rect width="100%" height="100%" fill="url(#tech-grid-rotated)" />
             </svg>
         </div>

         {/* Animation - Rotated to match pattern */}
         <svg className="absolute inset-0 w-full h-full overflow-visible">
            <g transform="rotate(45)"> 
                {rightPaths.map((p) => <NeuronPath key={p.id} {...p} />)}
            </g>
         </svg>
      </div>

    </div>
  );
};