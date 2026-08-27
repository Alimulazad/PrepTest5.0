import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import katex from 'katex';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Download, Copy, Check, Eye, Code, Sparkles, AlertCircle } from 'lucide-react';

interface TikzRendererProps {
  code: string;
  className?: string;
  caption?: string;
  scale?: number;
  inline?: boolean;
}

// Clean and extract TikZ code from markdown blocks or raw \begin{tikzpicture}...\end{tikzpicture}
export function extractTikzCode(raw: string): string {
  let cleaned = raw.trim();
  
  // Remove markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:tikz|latex|tex)?\s*/i, '').replace(/```\s*$/, '');
  }
  
  // Ensure it has \begin{tikzpicture} and \end{tikzpicture} wrapper if omitted
  if (!cleaned.includes('\\begin{tikzpicture}')) {
    cleaned = `\\begin{tikzpicture}\n${cleaned}\n\\end{tikzpicture}`;
  }
  
  return cleaned.trim();
}

// Check if string contains TikZ markup
export function isTikzMarkup(text: string): boolean {
  if (!text) return false;
  return (
    text.includes('\\begin{tikzpicture}') ||
    /```(?:tikz|latex)[\s\S]*?\\begin\{tikzpicture\}[\s\S]*?```/i.test(text) ||
    /```tikz[\s\S]*?```/i.test(text)
  );
}

// Script loader helper for TikzJax
let isTikzJaxLoading = false;
let isTikzJaxReady = false;
const tikzJaxCallbacks: Array<() => void> = [];

function loadTikzJax(onReady: () => void) {
  if (isTikzJaxReady && (window as any).tikzjax) {
    onReady();
    return;
  }

  tikzJaxCallbacks.push(onReady);

  if (isTikzJaxLoading) return;
  isTikzJaxLoading = true;

  // 1. Add Fonts Stylesheet
  if (!document.querySelector('link[href*="tikzjax"]')) {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://tikzjax.com/v1/fonts.css';
    document.head.appendChild(fontLink);
  }

  // 2. Add TikzJax Script
  if (!document.querySelector('script[src*="tikzjax"]')) {
    const script = document.createElement('script');
    script.src = 'https://tikzjax.com/v1/tikzjax.js';
    script.async = true;
    script.onload = () => {
      isTikzJaxReady = true;
      isTikzJaxLoading = false;
      tikzJaxCallbacks.forEach((cb) => cb());
      tikzJaxCallbacks.length = 0;
    };
    script.onerror = () => {
      isTikzJaxLoading = false;
      // Fallback: execute callbacks anyway so native SVG engine runs
      tikzJaxCallbacks.forEach((cb) => cb());
      tikzJaxCallbacks.length = 0;
    };
    document.head.appendChild(script);
  }
}

// -------------------------------------------------------------
// Built-in Advanced TikZ-to-SVG Parser & Engine
// -------------------------------------------------------------
interface ParsedNode {
  x: number;
  y: number;
  content: string;
  position: string; // 'above', 'below', 'left', 'right', 'above right', etc.
  color?: string;
  distance?: number;
}

interface ParsedPath {
  type: 'line' | 'arrow' | 'double-arrow' | 'circle' | 'rectangle' | 'arc' | 'grid' | 'fill' | 'curve';
  points: Array<{ x: number; y: number }>;
  color: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeWidth: number;
  isDashed?: boolean;
  isDotted?: boolean;
  nodes: ParsedNode[];
  radius?: number;
  radiusY?: number;
  angles?: { start: number; end: number; radius: number };
  rectCorner?: { x: number; y: number };
}

// Color map for standard TikZ color names to hex
const COLOR_MAP: Record<string, string> = {
  red: '#EF4444',
  blue: '#2563EB',
  green: '#10B981',
  orange: '#F97316',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  magenta: '#D946EF',
  yellow: '#EAB308',
  black: '#0F172A',
  gray: '#64748B',
  grey: '#64748B',
  white: '#FFFFFF',
  darkgray: '#334155',
  lightgray: '#CBD5E1',
  brown: '#854D0E',
  pink: '#EC4899',
  teal: '#14B8A6',
  indigo: '#4F46E5',
  violet: '#7C3AED',
  emerald: '#059669',
  rose: '#E11D48',
  amber: '#D97706',
};

function parseTikzToSvgData(tikzCode: string): {
  paths: ParsedPath[];
  standaloneNodes: ParsedNode[];
  viewBox: string;
  width: number;
  height: number;
  scale: number;
} {
  const paths: ParsedPath[] = [];
  const standaloneNodes: ParsedNode[] = [];

  // 1. Extract scale from \begin{tikzpicture}[scale=...]
  let globalScale = 1.0;
  const envMatch = tikzCode.match(/\\begin\{tikzpicture\}(?:\[(.*?)\])?/);
  if (envMatch && envMatch[1]) {
    const scaleMatch = envMatch[1].match(/scale\s*=\s*([0-9.]+)/);
    if (scaleMatch) {
      globalScale = parseFloat(scaleMatch[1]) || 1.0;
    }
  }

  // Helper to resolve colors
  const resolveColor = (optStr: string, defaultColor = '#0F172A'): string => {
    for (const [name, hex] of Object.entries(COLOR_MAP)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(optStr)) {
        return hex;
      }
    }
    // Check hex directly if provided
    const hexMatch = optStr.match(/#[0-9a-fA-F]{3,8}/);
    if (hexMatch) return hexMatch[0];
    return defaultColor;
  };

  // Helper to extract points like (x,y)
  const extractCoords = (str: string): Array<{ x: number; y: number }> => {
    const coords: Array<{ x: number; y: number }> = [];
    const coordRegex = /\(\s*([+-]?[0-9]*\.?[0-9]+)\s*,\s*([+-]?[0-9]*\.?[0-9]+)\s*\)/g;
    let match;
    while ((match = coordRegex.exec(str)) !== null) {
      coords.push({
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
      });
    }
    return coords;
  };

  // Helper to extract node from a segment like node[right] {\( \vec{A} \)}
  const extractNodes = (str: string, fallbackPoint?: { x: number; y: number }): ParsedNode[] => {
    const nodes: ParsedNode[] = [];
    const nodeRegex = /node(?:\s*\[(.*?)\])?\s*\{([\s\S]*?)\}/g;
    let nodeMatch;
    while ((nodeMatch = nodeRegex.exec(str)) !== null) {
      const opts = nodeMatch[1] || '';
      const content = nodeMatch[2] || '';
      
      let pos = 'right';
      if (/above\s+right/i.test(opts)) pos = 'above right';
      else if (/above\s+left/i.test(opts)) pos = 'above left';
      else if (/below\s+right/i.test(opts)) pos = 'below right';
      else if (/below\s+left/i.test(opts)) pos = 'below left';
      else if (/above/i.test(opts)) pos = 'above';
      else if (/below/i.test(opts)) pos = 'below';
      else if (/left/i.test(opts)) pos = 'left';
      else if (/right/i.test(opts)) pos = 'right';
      else if (/mid|center/i.test(opts)) pos = 'center';

      nodes.push({
        x: fallbackPoint ? fallbackPoint.x : 0,
        y: fallbackPoint ? fallbackPoint.y : 0,
        content: content.trim(),
        position: pos,
        color: resolveColor(opts, '#0F172A'),
      });
    }
    return nodes;
  };

  // Strip comments and split by semicolon (TikZ statements terminate with ';')
  const cleanBody = tikzCode
    .replace(/\\begin\{tikzpicture\}(?:\[.*?\])?/g, '')
    .replace(/\\end\{tikzpicture\}/g, '')
    .replace(/%.*$/gm, '');

  const statements = cleanBody.split(';').map((s) => s.trim()).filter(Boolean);

  let minX = 0;
  let maxX = 1;
  let minY = 0;
  let maxY = 1;
  let hasPoints = false;

  const trackBounds = (x: number, y: number) => {
    if (!hasPoints) {
      minX = maxX = x;
      minY = maxY = y;
      hasPoints = true;
    } else {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  };

  for (const stmt of statements) {
    // 1. Check if standalone node: \node[options] at (x,y) {content};
    const standaloneNodeMatch = stmt.match(/\\node(?:\s*\[(.*?)\])?\s*at\s*\(\s*([+-]?[0-9.]+)\s*,\s*([+-]?[0-9.]+)\s*\)\s*\{([\s\S]*)\}/);
    if (standaloneNodeMatch) {
      const opts = standaloneNodeMatch[1] || '';
      const nx = parseFloat(standaloneNodeMatch[2]);
      const ny = parseFloat(standaloneNodeMatch[3]);
      const content = standaloneNodeMatch[4] || '';
      trackBounds(nx, ny);

      let pos = 'center';
      if (/above/i.test(opts)) pos = 'above';
      if (/below/i.test(opts)) pos = 'below';
      if (/left/i.test(opts)) pos = 'left';
      if (/right/i.test(opts)) pos = 'right';

      standaloneNodes.push({
        x: nx,
        y: ny,
        content: content.trim(),
        position: pos,
        color: resolveColor(opts, '#0F172A'),
      });
      continue;
    }

    // 2. Draw or Fill command: \draw[...] or \fill[...]
    const drawMatch = stmt.match(/\\(draw|fill|shade|filldraw)(?:\s*\[(.*?)\])?\s*([\s\S]*)/);
    if (drawMatch) {
      const cmd = drawMatch[1];
      const opts = drawMatch[2] || '';
      const rest = drawMatch[3] || '';

      const isArrow = /->/i.test(opts);
      const isDoubleArrow = /<->/i.test(opts);
      const isThick = /thick/i.test(opts);
      const isVeryThick = /very thick/i.test(opts);
      const isUltraThick = /ultra thick/i.test(opts);
      const isThin = /thin/i.test(opts);
      const isDashed = /dashed/i.test(opts);
      const isDotted = /dotted/i.test(opts);

      let strokeWidth = 2;
      if (isUltraThick) strokeWidth = 3.5;
      else if (isVeryThick) strokeWidth = 2.8;
      else if (isThick) strokeWidth = 2.2;
      else if (isThin) strokeWidth = 1.2;

      const strokeColor = resolveColor(opts, cmd === 'fill' ? 'none' : '#0F172A');
      const fillColor = cmd.includes('fill') ? resolveColor(opts, '#3B82F6') : undefined;

      // Check for circle: (x,y) circle (r)
      const circleMatch = rest.match(/\(\s*([+-]?[0-9.]+)\s*,\s*([+-]?[0-9.]+)\s*\)\s*circle\s*\(\s*([+-]?[0-9.]+)(?:cm|pt|mm)?\s*\)/);
      if (circleMatch) {
        const cx = parseFloat(circleMatch[1]);
        const cy = parseFloat(circleMatch[2]);
        const r = parseFloat(circleMatch[3]);
        trackBounds(cx - r, cy - r);
        trackBounds(cx + r, cy + r);
        paths.push({
          type: 'circle',
          points: [{ x: cx, y: cy }],
          radius: r,
          color: strokeColor,
          fillColor: fillColor,
          strokeWidth,
          isDashed,
          isDotted,
          nodes: extractNodes(rest, { x: cx, y: cy }),
        });
        continue;
      }

      // Check for rectangle: (x1,y1) rectangle (x2,y2)
      const rectMatch = rest.match(/\(\s*([+-]?[0-9.]+)\s*,\s*([+-]?[0-9.]+)\s*\)\s*rectangle\s*\(\s*([+-]?[0-9.]+)\s*,\s*([+-]?[0-9.]+)\s*\)/);
      if (rectMatch) {
        const x1 = parseFloat(rectMatch[1]);
        const y1 = parseFloat(rectMatch[2]);
        const x2 = parseFloat(rectMatch[3]);
        const y2 = parseFloat(rectMatch[4]);
        trackBounds(x1, y1);
        trackBounds(x2, y2);
        paths.push({
          type: 'rectangle',
          points: [{ x: x1, y: y1 }],
          rectCorner: { x: x2, y: y2 },
          color: strokeColor,
          fillColor: fillColor,
          strokeWidth,
          isDashed,
          isDotted,
          nodes: extractNodes(rest, { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }),
        });
        continue;
      }

      // Check for arc: (x,y) arc (start:end:radius)
      const arcMatch = rest.match(/\(\s*([+-]?[0-9.]+)\s*,\s*([+-]?[0-9.]+)\s*\)\s*arc\s*\(\s*([+-]?[0-9.]+)\s*:\s*([+-]?[0-9.]+)\s*:\s*([+-]?[0-9.]+)\s*\)/);
      if (arcMatch) {
        const ax = parseFloat(arcMatch[1]);
        const ay = parseFloat(arcMatch[2]);
        const startA = parseFloat(arcMatch[3]);
        const endA = parseFloat(arcMatch[4]);
        const ar = parseFloat(arcMatch[5]);
        trackBounds(ax - ar, ay - ar);
        trackBounds(ax + ar, ay + ar);
        paths.push({
          type: 'arc',
          points: [{ x: ax, y: ay }],
          angles: { start: startA, end: endA, radius: ar },
          color: strokeColor,
          fillColor: fillColor,
          strokeWidth,
          isDashed,
          isDotted,
          nodes: extractNodes(rest, { x: ax, y: ay }),
        });
        continue;
      }

      // Standard path with coordinates like (0,0) -- (2,0) node[right] {...}
      const coords = extractCoords(rest);
      if (coords.length >= 2) {
        coords.forEach((p) => trackBounds(p.x, p.y));
        const lastPoint = coords[coords.length - 1];
        const nodes = extractNodes(rest, lastPoint);

        paths.push({
          type: isDoubleArrow ? 'double-arrow' : isArrow ? 'arrow' : 'line',
          points: coords,
          color: strokeColor,
          fillColor: fillColor,
          strokeWidth,
          isDashed,
          isDotted,
          nodes,
        });
      }
    }
  }

  // Margin and viewBox calculation
  const padding = 0.8;
  const widthUnits = Math.max(maxX - minX, 1) + padding * 2;
  const heightUnits = Math.max(maxY - minY, 1) + padding * 2;

  const unitSize = 70 * globalScale; // 70px per TikZ coordinate unit
  const svgWidth = Math.min(Math.max(widthUnits * unitSize, 220), 650);
  const svgHeight = Math.min(Math.max(heightUnits * unitSize, 140), 450);

  const viewBox = `${(minX - padding) * unitSize} ${-(maxY + padding) * unitSize} ${widthUnits * unitSize} ${heightUnits * unitSize}`;

  return {
    paths,
    standaloneNodes,
    viewBox,
    width: svgWidth,
    height: svgHeight,
    scale: globalScale,
  };
}

// Math label renderer using KaTeX
function renderMathLabel(content: string): string {
  if (!content) return '';
  const cleanMath = content
    .replace(/^\\\(\s*/, '')
    .replace(/\s*\\\)$/, '')
    .replace(/^\$\s*/, '')
    .replace(/\s*\$$/, '');

  try {
    return katex.renderToString(cleanMath, {
      throwOnError: false,
      displayMode: false,
    });
  } catch (_) {
    return content;
  }
}

export const TikzRenderer: React.FC<TikzRendererProps> = ({
  code,
  className = '',
  caption,
  scale: customScale = 1,
  inline = false,
}) => {
  const [renderMode, setRenderMode] = useState<'svg' | 'tikzjax'>('svg');
  const [zoom, setZoom] = useState<number>(1);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tikzJaxError, setTikzJaxError] = useState<string | null>(null);
  const [isTikzJaxLoadingState, setIsTikzJaxLoadingState] = useState<boolean>(false);
  const [showCode, setShowCode] = useState<boolean>(false);

  const tikzJaxContainerRef = useRef<HTMLDivElement>(null);
  const formattedCode = useMemo(() => extractTikzCode(code), [code]);

  // Parse SVG fallback data
  const svgData = useMemo(() => {
    try {
      return parseTikzToSvgData(formattedCode);
    } catch (e: any) {
      return null;
    }
  }, [formattedCode]);

  // Coordinate transformer: TikZ (x,y) with Y going up -> SVG with Y going down
  const unitPx = 70 * (svgData?.scale || 1) * customScale;

  const toSvgX = useCallback((x: number) => x * unitPx, [unitPx]);
  const toSvgY = useCallback((y: number) => -y * unitPx, [unitPx]);

  // Handle TikzJax script execution
  useEffect(() => {
    if (renderMode === 'tikzjax') {
      setIsTikzJaxLoadingState(true);
      setTikzJaxError(null);

      loadTikzJax(() => {
        if (!tikzJaxContainerRef.current) {
          setIsTikzJaxLoadingState(false);
          return;
        }

        try {
          // Clear container and inject <script type="text/tikz">
          tikzJaxContainerRef.current.innerHTML = '';
          const tikzScript = document.createElement('script');
          tikzScript.type = 'text/tikz';
          tikzScript.textContent = formattedCode;
          tikzJaxContainerRef.current.appendChild(tikzScript);

          // Dispatch event to TikzJax
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('tikzjax-load-finished');
            window.dispatchEvent(event);
            if ((window as any).tikzjax) {
              try {
                (window as any).tikzjax();
              } catch (_) {}
            }
          }
          setIsTikzJaxLoadingState(false);
        } catch (err: any) {
          setTikzJaxError(err.message || 'TikzJax রেন্ডারে ত্রুটি হয়েছে। SVG ইঞ্জিন সক্রিয় রয়েছে।');
          setIsTikzJaxLoadingState(false);
        }
      });
    }
  }, [renderMode, formattedCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(formattedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const svgElement = document.getElementById(`tikz-svg-${Math.abs(hashString(formattedCode))}`);
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preptest-diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simple string hash for unique IDs
  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  const uniqueId = Math.abs(hashString(formattedCode));

  return (
    <div
      className={`my-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all duration-200 ${className} ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col shadow-2xl bg-white dark:bg-slate-900 max-w-5xl mx-auto' : ''
      }`}
    >
      {/* Top Header Bar with Controls */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>TikZ ডায়াগ্রাম</span>
          </span>

          {/* Engine Selector */}
          <div className="ml-2 flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setRenderMode('svg')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                renderMode === 'svg'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              SVG ফাস্ট
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('tikzjax')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                renderMode === 'tikzjax'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              TikzJax (WASM)
            </button>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.6))}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Toggle TikZ Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Copy TikZ Code"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Download SVG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Fullscreen Toggle"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code Viewer Panel (Collapsible) */}
      {showCode && (
        <div className="p-3 bg-slate-900 text-slate-200 text-xs font-mono border-b border-slate-800 overflow-x-auto max-h-48">
          <pre>{formattedCode}</pre>
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        className="p-4 sm:p-6 flex items-center justify-center min-h-[160px] overflow-auto bg-slate-50/40 dark:bg-slate-950/40 relative select-none"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        {/* TikzJax WebAssembly Mode */}
        {renderMode === 'tikzjax' && (
          <div className="w-full flex flex-col items-center justify-center">
            {isTikzJaxLoadingState && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-4">
                <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>TikZ WebAssembly কোর কম্পাইল হচ্ছে...</span>
              </div>
            )}

            {tikzJaxError && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{tikzJaxError}</span>
              </div>
            )}

            <div
              ref={tikzJaxContainerRef}
              className="tikz-container flex items-center justify-center overflow-auto max-w-full text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {/* Built-in Advanced SVG Vector Engine */}
        {renderMode === 'svg' && svgData && (
          <svg
            id={`tikz-svg-${uniqueId}`}
            viewBox={svgData.viewBox}
            width={svgData.width}
            height={svgData.height}
            className="overflow-visible max-w-full h-auto drop-shadow-xs transition-transform"
          >
            <defs>
              {/* Standard TikZ Arrowheads */}
              <marker
                id={`arrowhead-${uniqueId}`}
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0F172A" className="dark:fill-slate-100" />
              </marker>
              {Object.entries(COLOR_MAP).map(([name, hex]) => (
                <marker
                  key={name}
                  id={`arrowhead-${name}-${uniqueId}`}
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={hex} />
                </marker>
              ))}
            </defs>

            {/* Render Paths & Shapes */}
            {svgData.paths.map((p, idx) => {
              const markerEnd =
                p.type === 'arrow' || p.type === 'double-arrow'
                  ? `url(#arrowhead-${getColorName(p.color)}-${uniqueId})`
                  : undefined;
              const markerStart =
                p.type === 'double-arrow'
                  ? `url(#arrowhead-${getColorName(p.color)}-${uniqueId})`
                  : undefined;

              if (p.type === 'circle' && p.radius) {
                const cx = toSvgX(p.points[0].x);
                const cy = toSvgY(p.points[0].y);
                const r = p.radius * unitPx;
                return (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={p.fillColor || 'none'}
                    stroke={p.color}
                    strokeWidth={p.strokeWidth}
                    strokeDasharray={p.isDashed ? '5,5' : p.isDotted ? '2,2' : undefined}
                  />
                );
              }

              if (p.type === 'rectangle' && p.rectCorner) {
                const x1 = toSvgX(p.points[0].x);
                const y1 = toSvgY(p.points[0].y);
                const x2 = toSvgX(p.rectCorner.x);
                const y2 = toSvgY(p.rectCorner.y);
                const rx = Math.min(x1, x2);
                const ry = Math.min(y1, y2);
                const rw = Math.abs(x2 - x1);
                const rh = Math.abs(y2 - y1);
                return (
                  <rect
                    key={idx}
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rh}
                    fill={p.fillColor || 'none'}
                    stroke={p.color}
                    strokeWidth={p.strokeWidth}
                    strokeDasharray={p.isDashed ? '5,5' : p.isDotted ? '2,2' : undefined}
                  />
                );
              }

              // Multi-segment Line or Vector Arrow
              const d = p.points
                .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(pt.x)} ${toSvgY(pt.y)}`)
                .join(' ');

              return (
                <g key={idx}>
                  <path
                    d={d}
                    fill={p.fillColor || 'none'}
                    stroke={p.color}
                    strokeWidth={p.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={p.isDashed ? '5,5' : p.isDotted ? '2,2' : undefined}
                    markerEnd={markerEnd}
                    markerStart={markerStart}
                  />
                  {/* Path Nodes */}
                  {p.nodes.map((n, nIdx) => (
                    <NodeElement
                      key={nIdx}
                      node={n}
                      unitPx={unitPx}
                      toSvgX={toSvgX}
                      toSvgY={toSvgY}
                    />
                  ))}
                </g>
              );
            })}

            {/* Standalone Nodes */}
            {svgData.standaloneNodes.map((n, idx) => (
              <NodeElement
                key={idx}
                node={n}
                unitPx={unitPx}
                toSvgX={toSvgX}
                toSvgY={toSvgY}
              />
            ))}
          </svg>
        )}

        {/* Fallback if SVG parsing failed */}
        {renderMode === 'svg' && !svgData && (
          <div className="text-center py-6">
            <p className="text-xs text-rose-500 font-semibold mb-2">
              চিত্র পার্সিংয়ে সমস্যা হয়েছে। TikzJax ইঞ্জিনে স্যুইচ করুন।
            </p>
            <button
              type="button"
              onClick={() => setRenderMode('tikzjax')}
              className="px-3 py-1.5 bg-[#0A2540] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              TikzJax চালু করুন
            </button>
          </div>
        )}
      </div>

      {caption && (
        <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
          {caption}
        </div>
      )}
    </div>
  );
};

// Node Element with KaTeX Label Positioning
const NodeElement: React.FC<{
  node: ParsedNode;
  unitPx: number;
  toSvgX: (x: number) => number;
  toSvgY: (y: number) => number;
}> = ({ node, toSvgX, toSvgY }) => {
  const sx = toSvgX(node.x);
  const sy = toSvgY(node.y);

  let dx = 0;
  let dy = 0;
  const offset = 14;

  if (node.position.includes('above')) dy -= offset;
  if (node.position.includes('below')) dy += offset + 4;
  if (node.position.includes('left')) dx -= offset + 6;
  if (node.position.includes('right')) dx += offset;

  const htmlContent = renderMathLabel(node.content);

  return (
    <g transform={`translate(${sx + dx}, ${sy + dy})`}>
      <foreignObject x="-40" y="-18" width="80" height="36" className="overflow-visible pointer-events-none">
        <div
          className="flex items-center justify-center text-xs font-bold text-slate-900 dark:text-slate-100 select-none"
          style={{ color: node.color }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </foreignObject>
    </g>
  );
};

function getColorName(colorHex: string): string {
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (hex.toLowerCase() === colorHex.toLowerCase()) return name;
  }
  return 'black';
}

export default TikzRenderer;
