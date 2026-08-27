import React, { useRef, useState } from 'react';
import { Sparkles, Bot } from 'lucide-react';
import { motion, useDragControls } from 'motion/react';

interface MoveableAIFabProps {
  onOpenAITutor: () => void;
}

export const MoveableAIFab: React.FC<MoveableAIFabProps> = ({ onOpenAITutor }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();

  const handlePointerUp = () => {
    // Small delay to reset dragging state so click handler doesn't fire if dragged
    setTimeout(() => setIsDragging(false), 80);
  };

  const handleClick = () => {
    if (!isDragging) {
      onOpenAITutor();
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.15}
      dragConstraints={{
        top: -window.innerHeight + 140,
        bottom: 0,
        left: -window.innerWidth + 80,
        right: 0,
      }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handlePointerUp}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className="fixed bottom-20 right-4 z-50 cursor-grab active:cursor-grabbing select-none touch-none"
      id="moveable-ai-fab"
    >
      <button
        onClick={handleClick}
        type="button"
        aria-label="PrepTest AI টিউটর খুলুন"
        className="relative group p-3 sm:p-3.5 rounded-full bg-gradient-to-tr from-[#0A2540] via-[#103459] to-[#FF6B00] text-white shadow-[0_8px_25px_rgba(255,107,0,0.35)] border-2 border-white/80 flex items-center justify-center transition-all hover:shadow-[0_12px_30px_rgba(255,107,0,0.5)]"
        title="PrepTest AI টিউটর (ড্র্যাগ করে সরানো যায়)"
      >
        {/* Pulsing outer ring */}
        <span className="absolute -inset-1 rounded-full bg-amber-400/30 animate-ping pointer-events-none opacity-75 duration-1000" />

        {/* AI Icon with sparkles */}
        <div className="relative flex items-center justify-center">
          <Bot className="w-6 h-6 text-white stroke-[2.2]" />
          <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1.5 -right-1.5 animate-pulse" />
        </div>

        {/* Floating Mini Label */}
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
          PrepTest AI
        </span>
      </button>
    </motion.div>
  );
};

export default MoveableAIFab;
