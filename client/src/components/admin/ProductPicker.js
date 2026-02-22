import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../../services/api';

export default function ProductPicker({ selectedProducts, onToggleProduct, onConfirm, onBack, loading }) {
  const [products, setProducts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    api.getProducts()
      .then((data) => {
        if (!cancelled) setProducts(data.products || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.vendor || '').toLowerCase().includes(q) ||
      (p.details?.proof || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const selectedHandles = useMemo(() =>
    new Set(selectedProducts.map((p) => p.handle)),
  [selectedProducts]);

  // Get the letter for a selected product
  const getLetterForProduct = (handle) => {
    const idx = selectedProducts.findIndex((p) => p.handle === handle);
    return idx >= 0 ? String.fromCharCode(65 + idx) : null;
  };

  if (fetching) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading rye whiskey reviews from RyeCentral...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="error-msg">Failed to load products: {error}</p>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: 12 }}>Back</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Select Your Bottles</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Choose up to 8 rye whiskeys for your blind tasting. ({selectedProducts.length} selected)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onBack}>Back</button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={loading || selectedProducts.length === 0}
          >
            {loading ? 'Adding...' : `Continue with ${selectedProducts.length} bottle${selectedProducts.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Selected bottles strip */}
      {selectedProducts.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
            {selectedProducts.map((p, i) => (
              <div key={p.handle} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <span className="bottle-letter" style={{ width: 28, height: 28, fontSize: 14 }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.title.replace(/ Review.*$/i, '').replace(/ Rye$/, '')}
                </span>
                <button
                  onClick={() => onToggleProduct(p)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#e74c3c', fontSize: 16, padding: '0 4px',
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search by name, distillery, proof..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Product Grid */}
      <div className="product-grid">
        {filtered.map((product) => {
          const isSelected = selectedHandles.has(product.handle);
          const letter = getLetterForProduct(product.handle);
          return (
            <div
              key={product.handle}
              className={`product-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleProduct(product)}
            >
              {isSelected && letter && (
                <div className="selected-badge">{letter}</div>
              )}
              {product.image?.url ? (
                <img src={product.image.url} alt={product.title} loading="lazy" />
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 48 }}>
                  🥃
                </div>
              )}
              <div className="product-name">
                {product.title.replace(/ Review.*$/i, '').replace(/\s*Rye Whiskey$/i, '')}
              </div>
              <div className="product-vendor">{product.vendor}</div>
              {product.community?.score && (
                <span className="product-score">{product.community.score}/5</span>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="emoji">🔍</div>
          <p>No whiskeys match "{search}"</p>
        </div>
      )}
    </div>
  );
}
