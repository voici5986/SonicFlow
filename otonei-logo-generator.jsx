import React, { useState, useMemo } from 'react';
import { Download, Sun, Moon } from 'lucide-react';

// 颜色常量定义
const COLORS = {
  light: {
    bg: '#ffffff',
    text: '#000000',
    card: '#f5f5f5',
    button: '#e5e5e5',
    accent: '#000000',
  },
  dark: {
    bg: '#0a0a0a',
    text: '#ffffff',
    card: '#1a1a1a',
    button: '#2a2a2a',
    accent: '#ffffff',
  }
};

const PRESETS = {
  balanced: { strokeWidth: 2.5, lineHeight: 30, lineOffset: 0, circleSize: 40 },
  delicate: { strokeWidth: 1.8, lineHeight: 28, lineOffset: 0, circleSize: 38 },
  bold: { strokeWidth: 3.5, lineHeight: 32, lineOffset: 0, circleSize: 42 },
  dynamic: { strokeWidth: 2.5, lineHeight: 30, lineOffset: 2, circleSize: 40 },
};

// Logo 预览组件
const Logo = ({ params, color, size = 64 }) => {
  const { strokeWidth, lineHeight, lineOffset, circleSize } = params;
  const center = size / 2;
  const radius = circleSize / 2;
  const lineY1 = center - lineHeight / 2;
  const lineY2 = center + lineHeight / 2;
  const lineX = center + lineOffset;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      {/* 左侧半圆 */}
      <path 
        d={`M ${center} ${center - radius} A ${radius} ${radius} 0 0 0 ${center} ${center + radius}`} 
        stroke={color} 
        strokeWidth={strokeWidth} 
        fill="none" 
        strokeLinecap="round"
      />
      {/* 右侧半圆 */}
      <path 
        d={`M ${center} ${center - radius} A ${radius} ${radius} 0 0 1 ${center} ${center + radius}`} 
        stroke={color} 
        strokeWidth={strokeWidth} 
        fill="none" 
        strokeLinecap="round"
      />
      {/* 中间竖线 (I) */}
      <line 
        x1={lineX} 
        y1={lineY1} 
        x2={lineX} 
        y2={lineY2} 
        stroke={color} 
        strokeWidth={strokeWidth} 
        strokeLinecap="round"
      />
    </svg>
  );
};

export default function OtoneiLogoGenerator() {
  const [params, setParams] = useState(PRESETS.balanced);
  const [darkMode, setDarkMode] = useState(false);
  const [activePreset, setActivePreset] = useState('balanced');

  const theme = darkMode ? COLORS.dark : COLORS.light;

  const updateParam = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
    setActivePreset('custom');
  };

  const applyPreset = (presetName) => {
    setParams(PRESETS[presetName]);
    setActivePreset(presetName);
  };

  const downloadSVG = () => {
    const size = 64;
    const { strokeWidth, lineHeight, lineOffset, circleSize } = params;
    const center = size / 2;
    const radius = circleSize / 2;
    const lineY1 = center - lineHeight / 2;
    const lineY2 = center + lineHeight / 2;
    const lineX = center + lineOffset;
    const color = theme.text;

    const svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <path d="M ${center} ${center - radius} A ${radius} ${radius} 0 0 0 ${center} ${center + radius}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round"/>
  <path d="M ${center} ${center - radius} A ${radius} ${radius} 0 0 1 ${center} ${center + radius}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round"/>
  <line x1="${lineX}" y1="${lineY1}" x2="${lineX}" y2="${lineY2}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otonei-logo-${activePreset}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-8 transition-colors duration-300" style={{ backgroundColor: theme.bg }}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-light mb-2" style={{ color: theme.text }}>
              OTONEI Logo Generator
            </h1>
            <p className="text-sm opacity-60" style={{ color: theme.text }}>
              调整参数，找到最适合你的设计
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded-full transition-all hover:scale-110"
            style={{ backgroundColor: theme.button, color: theme.text }}
            title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 预览区域 */}
          <section className="space-y-6">
            <div 
              className="rounded-2xl p-12 flex flex-col items-center justify-center transition-colors duration-300"
              style={{ 
                backgroundColor: theme.card,
                minHeight: '450px',
                boxShadow: darkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)'
              }}
            >
              <div className="text-center space-y-10">
                <div className="transform scale-150">
                  <Logo params={params} color={theme.text} />
                </div>
                <div className="text-3xl font-light tracking-[0.2em] pt-4" style={{ color: theme.text }}>
                  OTONEI
                </div>
              </div>
            </div>

            <button
              onClick={downloadSVG}
              className="w-full px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ 
                backgroundColor: theme.accent,
                color: theme.bg
              }}
            >
              <Download size={20} />
              <span className="font-medium">导出 SVG 文件</span>
            </button>
          </section>

          {/* 控制面板 */}
          <section className="space-y-8">
            {/* 预设方案 */}
            <div>
              <label className="block text-sm font-medium mb-4 opacity-50 uppercase tracking-wider" style={{ color: theme.text }}>
                预设方案
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.keys(PRESETS).map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className="px-4 py-3 rounded-xl text-sm transition-all border-2"
                    style={{
                      borderColor: activePreset === p ? theme.accent : 'transparent',
                      backgroundColor: activePreset === p ? theme.accent : theme.button,
                      color: activePreset === p ? theme.bg : theme.text,
                    }}
                  >
                    {p === 'balanced' && '平衡'}
                    {p === 'delicate' && '纤细'}
                    {p === 'bold' && '粗犷'}
                    {p === 'dynamic' && '动感'}
                  </button>
                ))}
              </div>
            </div>

            {/* 参数调整 */}
            <div className="space-y-6 bg-opacity-50 rounded-2xl p-6" style={{ backgroundColor: theme.card }}>
              <ControlSlider 
                label="线条粗细" 
                value={params.strokeWidth} 
                min={1} max={8} step={0.1} 
                unit="px"
                theme={theme}
                onChange={(v) => updateParam('strokeWidth', v)} 
              />
              <ControlSlider 
                label="竖线高度" 
                value={params.lineHeight} 
                min={20} max={60} step={1} 
                unit="px"
                theme={theme}
                onChange={(v) => updateParam('lineHeight', v)} 
              />
              <ControlSlider 
                label="竖线偏移" 
                value={params.lineOffset} 
                min={-10} max={10} step={0.5} 
                unit="px"
                theme={theme}
                onChange={(v) => updateParam('lineOffset', v)} 
              />
              <ControlSlider 
                label="圆圈大小" 
                value={params.circleSize} 
                min={20} max={60} step={1} 
                unit="px"
                theme={theme}
                onChange={(v) => updateParam('circleSize', v)} 
              />
            </div>

            {/* 设计建议 */}
            <div 
              className="p-6 rounded-2xl border border-opacity-10"
              style={{ 
                backgroundColor: theme.card,
                borderColor: theme.text,
                color: theme.text
              }}
            >
              <div className="flex items-center gap-2 mb-3 font-medium opacity-80">
                <span className="text-lg">💡</span>
                <span>设计建议</span>
              </div>
              <ul className="space-y-2 opacity-60 text-xs leading-relaxed">
                <li>• 极简风格推荐使用 <b>纤细</b> 预设，搭配较细的线条。</li>
                <li>• <b>App Icon</b> 建议使用 <b>平衡</b> 或 <b>粗犷</b>，确保在小尺寸下清晰可见。</li>
                <li>• <b>动感</b> 预设通过微调竖线位置，增加了视觉上的呼吸感。</li>
                <li>• 建议线条粗细保持在 2-3px 之间，以获得最佳的视觉平衡。</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// 抽离 Slider 组件以减少主组件冗余
const ControlSlider = ({ label, value, min, max, step, unit, onChange, theme }) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium opacity-70" style={{ color: theme.text }}>
        {label}
      </label>
      <span className="text-xs font-mono opacity-50" style={{ color: theme.text }}>
        {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-current"
      style={{ color: theme.accent }}
    />
  </div>
);