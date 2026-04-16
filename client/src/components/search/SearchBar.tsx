import { useState, useRef, useEffect } from 'react';
import { IoSearchOutline, IoCloseCircle } from 'react-icons/io5';
import { searchSuggestions } from '../../services/api';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
}

export function SearchBar({ value, onChange, onSearch }: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const results = await searchSuggestions(value);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [value]);

  const handleSubmit = (query?: string) => {
    const q = query || value;
    if (!q.trim()) return;
    onSearch(q.trim());
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        const q = suggestions[focusedIndex];
        onChange(q);
        handleSubmit(q);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full md:max-w-xl">
      <div className="relative">
        <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-muted text-lg" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="What do you want to listen to?"
          className="w-full pl-11 pr-10 py-3 rounded-lg bg-surface-200 border border-surface-400 text-cream text-sm
                     placeholder-cream-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                     transition-all duration-200"
        />
        {value && (
          <button
            onClick={() => { onChange(''); setSuggestions([]); inputRef.current?.focus(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream-dim transition-colors"
          >
            <IoCloseCircle className="text-lg" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-1.5 w-full bg-surface-100 border border-surface-400 rounded-lg overflow-hidden z-50 scale-in shadow-lg shadow-black/20">
          {suggestions.map((s, i) => (
            <button
              key={s}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                i === focusedIndex ? 'bg-surface-300/60 text-cream' : 'text-cream-dim hover:bg-surface-200/60 hover:text-cream'
              }`}
              onMouseDown={() => {
                onChange(s);
                handleSubmit(s);
              }}
            >
              <IoSearchOutline className="text-cream-muted shrink-0" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
