import { useState } from 'react';
import { motion } from 'framer-motion';
import { askMealAssistant } from '../api';

const MotionDiv = motion.div;

export default function FloatingCommandBar({ onJumpToMeal }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runAIQuery = async () => {
    const normalized = query.trim();
    if (!normalized) return;
    setIsLoading(true);
    try {
      const result = await askMealAssistant(normalized);
      setResponse(result.analysis_pretty || JSON.stringify(result.analysis || {}, null, 2));
      setQuery('');
    } catch (err) {
      setResponse(err.message || 'AI assistant failed to respond.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="sticky top-4 z-30 mb-6"
    >
      <div className="glass-card rounded-2xl border border-white/10 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex gap-2">
            <button type="button" onClick={() => onJumpToMeal('breakfast')} className="command-chip">Breakfast</button>
            <button type="button" onClick={() => onJumpToMeal('lunch')} className="command-chip">Lunch</button>
            <button type="button" onClick={() => onJumpToMeal('dinner')} className="command-chip">Dinner</button>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask AI: optimize today for budget + protein"
              className="input-field flex-1"
              id="input-ai-command"
            />
            <button
              type="button"
              onClick={runAIQuery}
              disabled={isLoading || !query.trim()}
              className="btn-primary whitespace-nowrap"
              id="btn-ai-command"
            >
              {isLoading ? 'Thinking...' : 'Run AI'}
            </button>
          </div>
        </div>

        {response && (
          <pre className="mt-3 text-xs text-[var(--text-soft)] border-t border-white/10 pt-3 whitespace-pre-wrap break-words font-mono">
            {response}
          </pre>
        )}
      </div>
    </MotionDiv>
  );
}
