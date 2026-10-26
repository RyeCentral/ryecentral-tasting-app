import React, { useState, useMemo, useRef, useEffect } from 'react';
import NoteIcon from './NoteIcons';

const MAX_OWN = 5;

/**
 * "+ Add note" for a pill box: lets a taster record a note that isn't among
 * the pills shown. Options come from the server (catalogue minus visible
 * pills, so it never reveals an answer). Added notes are saved with the
 * tasting and appear in the review, but are NOT scored and don't count
 * toward "select up to N".
 *
 * Props:
 *   options   [{ text, emoji, desc }]
 *   selected  [text]
 *   onChange  (nextSelectedArray) => void
 *   label     'nose' | 'palate' (for aria labels)
 */
export default function OwnNotePicker({ options = [], selected = [], onChange, label = 'note' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else setQ('');
  }, [open]);

  const available = useMemo(() => {
    const taken = new Set(selected);
    const needle = q.trim().toLowerCase();
    return options.filter((o) => !taken.has(o.text) && (!needle || o.text.includes(needle)));
  }, [options, selected, q]);

  if (!options.length && !selected.length) return null;

  const add = (text) => {
    if (selected.length >= MAX_OWN || selected.includes(text)) return;
    onChange([...selected, text]);
    setOpen(false);
  };
  const remove = (text) => onChange(selected.filter((t) => t !== text));

  return (
    <>
      {selected.map((text) => (
        <span
          key={'own-' + text}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 6px 6px 12px', minHeight: 40, borderRadius: 20,
            border: '2px dashed var(--rc-orange)', background: 'var(--rc-orange-light)',
            fontSize: 13, fontWeight: 500, color: 'var(--rc-black)',
          }}
          title="Your own note — saved to your review, not scored"
        >
          <NoteIcon name={text} size={14} />
          <span>{text}</span>
          <button
            type="button"
            onClick={() => remove(text)}
            aria-label={`Remove ${text}`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1,
              width: 28, height: 28, color: 'var(--rc-gray-500)', padding: 0,
            }}
          >
            ×
          </button>
        </span>
      ))}

      {selected.length < MAX_OWN && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Add a ${label} note that isn't listed`}
          style={{
            padding: '8px 14px', minHeight: 40, borderRadius: 20,
            border: '2px dashed var(--rc-gray-300)', background: 'transparent',
            cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--rc-gray-700)',
          }}
        >
          + Add note
        </button>
      )}

      {open && (
        <div style={{
          flexBasis: '100%', marginTop: 4, padding: 10, borderRadius: 12,
          border: '1px solid var(--rc-gray-300)', background: 'var(--rc-pure-white)',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes (e.g. cedar)"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="form-input"
              style={{ flex: 1, padding: '8px 12px' }}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-secondary btn-sm"
              style={{ minHeight: 40 }}
            >
              Done
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {available.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--rc-gray-500)', padding: '6px 2px' }}>
                No matching notes.
              </span>
            )}
            {available.map((o) => (
              <button
                key={o.text}
                type="button"
                onClick={() => add(o.text)}
                title={o.desc || ''}
                style={{
                  padding: '6px 12px', minHeight: 36, borderRadius: 18,
                  border: '1px solid var(--rc-gray-300)', background: 'var(--rc-gray-100)',
                  cursor: 'pointer', fontSize: 13, color: 'var(--rc-black)',
                }}
              >
                <NoteIcon name={o.text} size={13} /><span style={{ marginLeft: 4 }}>{o.text}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--rc-gray-500)', margin: '8px 0 0' }}>
            Your own notes go in your review but don't count toward your score.
          </p>
        </div>
      )}
    </>
  );
}
