import React from 'react';
import { Container, Row, Col, Form, Button, Spinner } from 'react-bootstrap';
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
    <Container>
      <Form onSubmit={handleSearch} className="mb-4">
        <Row className="g-2 align-items-stretch">
          <Col xs={12} md={6}>
            <Form.Control
              type="search"
              enterKeyHint="search"
              placeholder="输入歌曲、歌手或专辑名称"
              value={query}
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
          </Col>
          <Col xs={6} md={2}>
            <Form.Select
              value={source}
              onChange={(e) => setField('source', e.target.value)}
              style={{ height: '48px' }}
            >
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col xs={6} md={2}>
            <Form.Select
              value={quality}
              onChange={(e) => setField('quality', parseInt(e.target.value))}
              style={{ height: '48px' }}
            >
              {qualities.map((q) => (
                <option key={q} value={q}>
                  {q === 999 ? '无损' : `${q}kbps`}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col xs={12} md={2}>
            <Button
              type="submit"
              variant="link"
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
                height: '48px'
              }}
            >
              {loading ? <Spinner animation="border" size="sm" /> : '开始搜索'}
            </Button>
          </Col>
        </Row>
      </Form>

      {results.length > 0 && (
        <Row className="g-3">
          {results.map((track) => (
            <Col key={track.id} xs={12} md={6}>
              <SearchResultItem track={track} searchResults={results} quality={quality} />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default Home;
