import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';
import 'katex/dist/katex.min.css';
import { TikzRenderer, isTikzMarkup, extractTikzCode } from './TikzRenderer';
import { normalizeLatexMath } from '../utils/mathNormalizer';

interface MathTextProps {
  text: string;
  className?: string;
  inline?: boolean;
}

// Module-level static references to prevent plugin/component re-initialization on every render
const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => {
    // Check if paragraph starts with structured section marker
    const textContent = Array.isArray(children)
      ? children.map((c) => (typeof c === 'string' ? c : '')).join('')
      : typeof children === 'string'
      ? children
      : '';

    const trimmed = textContent.trim();
    const isCorrectAns = trimmed.startsWith('✅');
    const isSolution = trimmed.startsWith('📝');
    const isShortcut = trimmed.startsWith('🚀');
    const isTrap = trimmed.startsWith('⚠️');
    const isTip = trimmed.startsWith('🎯');

    if (isCorrectAns || isSolution || isShortcut || isTrap || isTip) {
      let sectionClass = 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100';
      if (isCorrectAns) sectionClass = 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-medium';
      if (isSolution) sectionClass = 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200';
      if (isShortcut) sectionClass = 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200';
      if (isTrap) sectionClass = 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200';
      if (isTip) sectionClass = 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200';

      return (
        <div className={`mt-2.5 mb-2 p-3 rounded-xl border text-[15px] sm:text-base leading-relaxed shadow-2xs ${sectionClass}`}>
          {children}
        </div>
      );
    }

    return <p className="leading-relaxed my-0.5 text-inherit">{children}</p>;
  },
  span: ({ children }) => <span className="text-inherit">{children}</span>,
  strong: ({ children }) => (
    <strong className="font-bold text-inherit">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 space-y-1 text-[15px] sm:text-base text-inherit">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1 font-mono text-sm sm:text-[15px] text-inherit">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed text-inherit">{children}</li>
  ),
  code: ({ children, className: codeClass }) => {
    const isInline = !codeClass;
    const rawContent = Array.isArray(children) ? children.join('') : String(children || '');

    // Check if this code block is TikZ diagram
    if (codeClass?.includes('language-tikz') || isTikzMarkup(rawContent)) {
      return <TikzRenderer code={extractTikzCode(rawContent)} />;
    }

    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-900 dark:text-blue-300 font-mono text-sm border border-slate-200 dark:border-slate-700">
          {children}
        </code>
      );
    }
    return (
      <pre className="p-3 my-2 bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-200 rounded-xl overflow-x-auto font-mono text-xs sm:text-sm border border-slate-800">
        <code>{children}</code>
      </pre>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="pl-3 py-1 my-2 border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/40 text-slate-700 dark:text-slate-300 italic rounded-r-lg">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1.5">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2.5 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2 mb-1">{children}</h3>
  ),
};

// Splits input text into Markdown and raw TikZ blocks
interface TextBlock {
  type: 'markdown' | 'tikz';
  content: string;
}

function parseTextBlocks(inputText: string): TextBlock[] {
  if (!inputText) return [];

  // Normalize LaTeX delimiters \( -> $, \[ -> $$, fix mojibake & escape sequences
  const normalizedText = normalizeLatexMath(inputText);

  // Match raw \begin{tikzpicture}...\end{tikzpicture}
  const tikzRegex = /(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/gi;
  const blocks: TextBlock[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tikzRegex.exec(normalizedText)) !== null) {
    const matchStart = match.index;
    const matchEnd = tikzRegex.lastIndex;

    // Push preceding markdown text if any
    if (matchStart > lastIndex) {
      const mdContent = normalizedText.slice(lastIndex, matchStart);
      if (mdContent.trim()) {
        blocks.push({ type: 'markdown', content: mdContent });
      }
    }

    // Push the TikZ block
    blocks.push({
      type: 'tikz',
      content: match[1],
    });

    lastIndex = matchEnd;
  }

  // Push remaining markdown text if any
  if (lastIndex < normalizedText.length) {
    const tail = normalizedText.slice(lastIndex);
    if (tail.trim()) {
      blocks.push({ type: 'markdown', content: tail });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'markdown', content: normalizedText }];
}

const MathTextComponent: React.FC<MathTextProps> = ({ text, className = '', inline = false }) => {
  const blocks = useMemo(() => parseTextBlocks(text), [text]);

  if (!text) return null;

  if (inline) {
    return (
      <span className={`markdown-math-content inline leading-normal text-inherit ${className}`}>
        {blocks.map((block, idx) => {
          if (block.type === 'tikz') {
            return <TikzRenderer key={idx} code={block.content} />;
          }
          return (
            <ReactMarkdown
              key={idx}
              remarkPlugins={REMARK_PLUGINS}
              rehypePlugins={REHYPE_PLUGINS}
              components={{
                ...MARKDOWN_COMPONENTS,
                p: ({ children }) => <span className="inline text-inherit">{children}</span>,
              }}
            >
              {block.content}
            </ReactMarkdown>
          );
        })}
      </span>
    );
  }

  return (
    <div className={`markdown-math-content max-w-full min-w-0 overflow-x-auto leading-relaxed text-inherit space-y-2.5 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'tikz') {
          return <TikzRenderer key={idx} code={block.content} />;
        }
        return (
          <ReactMarkdown
            key={idx}
            remarkPlugins={REMARK_PLUGINS}
            rehypePlugins={REHYPE_PLUGINS}
            components={MARKDOWN_COMPONENTS}
          >
            {block.content}
          </ReactMarkdown>
        );
      })}
    </div>
  );
};

export const MathText = React.memo(MathTextComponent);
export default MathText;

