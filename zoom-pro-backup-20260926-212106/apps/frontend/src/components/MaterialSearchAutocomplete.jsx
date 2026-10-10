import React, { useState, useEffect } from 'react';

export default function MaterialSearchAutocomplete({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query) return setResults([]);
      setLoading(true);
      fetch(`/api/materials/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => setResults(data || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="material-autocomplete">
      <input
        type="text"
        placeholder="Hledat materiál (kód nebo název)"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="input"
      />
      {loading && <div>Naèítám…</div>}
      {results.length > 0 && (
        <ul className="results">
          {results.map(item => (
            <li key={item.id} onClick={() => onSelect && onSelect(item)}>
              <strong>{item.code}</strong> — {item.name} ({item.unit}) • {item.price} CZK
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
