import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import { Tag } from '@/shared/types/api';
import { apiClient } from '@/shared/lib/api-client';

const TAG_PATTERN = /^[a-z0-9-]+$/;

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  token?: string;
  className?: string;
  placeholder?: string;
  'data-testid'?: string;
}

export function TagInput({
  tags,
  onChange,
  token,
  className,
  placeholder = 'Add a tag...',
  'data-testid': testId,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const searchTags = useCallback(async (query: string) => {
    const normalized = normalize(query);
    if (!normalized) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const result = await apiClient.tags.search(normalized, 10);
      const filtered = result.items.filter((t) => !tags.includes(t.name));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [tags]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const normalized = normalize(value);
    if (normalized.length > 0) {
      debounceRef.current = setTimeout(() => searchTags(value), 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTags]);

  const addTag = useCallback((tagName: string) => {
    const normalized = normalize(tagName);
    if (!normalized || !TAG_PATTERN.test(normalized)) return;
    if (tags.includes(normalized)) return;

    onChange([...tags, normalized]);

    if (token) {
      apiClient.tags.create({ name: normalized }, token).catch(() => {
        // Tag may already exist — that's fine, create is idempotent
      });
    }
    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, [tags, onChange, token]);

  const removeTag = useCallback((tagName: string) => {
    onChange(tags.filter((t) => t !== tagName));
    inputRef.current?.focus();
  }, [tags, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        addTag(suggestions[activeIndex].name);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }, [input, tags, suggestions, activeIndex, showSuggestions, addTag, removeTag]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const classes = ['tag-input'];
  if (className) classes.push(className);

  return (
    <div ref={containerRef} className={classes.join(' ')} data-testid={testId}>
      <div
        className="tag-input__field"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} className="tag-input__tag">
            {tag}
            <button
              type="button"
              className="tag-input__tag-remove"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
            >
              x
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="tag-input__input"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder={tags.length === 0 ? placeholder : ''}
          aria-label="Tag input"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
        />
      </div>
      {showSuggestions && (
        <ul className="tag-input__suggestions" role="listbox">
          {suggestions.map((tag, index) => (
            <li
              key={tag.id}
              className={`tag-input__suggestion${index === activeIndex ? ' tag-input__suggestion--active' : ''}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(tag.name);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {tag.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

TagInput.displayName = 'TagInput';
