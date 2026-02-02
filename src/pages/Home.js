import React from 'react';
import SearchResultItem from '../components/SearchResultItem';

const Home = ({ 
  query, 
  results, 
  source, 
  quality, 
  loading, 
  setField, 
  handleSearch 
}) => {
  const sources = [
    'netease', 'kuwo', 'joox', 'bilibili'
  ];

  const qualities = [128, 192, 320, 740, 999];

  return (
    <div className="page-content-wrapper">
      <form onSubmit={handleSearch} className="mb-4">
        <div className="row g-2 align-items-stretch">
          <div className="col-12 col-md-6">
            <input
              type="search"
              enterKeyHint="search"
              placeholder="输入歌曲、歌手或专辑名称"
              value={query}
              className="form-control-custom"
              onChange={(e) => setField('query', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // 确保失去焦点，收起键盘
                  e.target.blur();
                  e.preventDefault();
                  handleSearch();
                }
              }}
              style={{ height: '48px' }}
            />
          </div>
          <div className="col-6 col-md-2">
            <select
              value={source}
              className="form-select-custom"
              onChange={(e) => setField('source', e.target.value)}
              style={{ height: '48px' }}
            >
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              value={quality}
              className="form-select-custom"
              onChange={(e) => setField('quality', parseInt(e.target.value))}
              style={{ height: '48px' }}
            >
              {qualities.map((q) => (
                <option key={q} value={q}>
                  {q === 999 ? '无损' : `${q}kbps`}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <button
              type="submit"
              className="w-100 search-submit-btn"
              disabled={loading}
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--border-radius)',
                padding: '0',
                fontWeight: '600',
                textDecoration: 'none',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '48px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? <span className="spinner-custom" style={{ width: '1.2rem', height: '1.2rem' }}></span> : '开始搜索'}
            </button>
          </div>
        </div>
      </form>

      {results.length > 0 && (
        <div className="row g-3">
          {results.map((track) => (
            <div key={track.id} className="col-12 col-md-6 col-lg-4">
              <SearchResultItem track={track} searchResults={results} quality={quality} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
