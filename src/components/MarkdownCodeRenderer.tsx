import React, { useState, useMemo, useEffect } from 'react';
import {
  Copy,
  Check,
  Play,
  Code2,
  Columns,
  RotateCcw,
  Maximize2,
  Minimize2,
  Terminal,
  Loader2,
  Download
} from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
  isStreaming?: boolean;
}

const PREVIEWABLE_LANGS = new Set([
  'html',
  'htm',
  'svg',
  'xml',
  'javascript',
  'js',
  'css',
  'canvas',
  'jsx',
  'tsx'
]);

const TERMINAL_RUNNABLE_LANGS = new Set([
  'python',
  'py',
  'javascript',
  'js',
  'node',
  'typescript',
  'ts'
]);

function buildIframeDocument(language: string, code: string): string {
  const lang = language.toLowerCase();
  const trimmed = code.trim();
  if (
    lang === 'html' ||
    lang === 'htm' ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<canvas') ||
    (trimmed.includes('<style') && trimmed.includes('<script'))
  ) {
    return addPlaytestHarness(code);
  }
  if (lang === 'svg' || trimmed.startsWith('<svg')) {
    return addPlaytestHarness(`<!DOCTYPE html>
<html>
<head>
<style>
  body { margin: 0; background: #0e0d0c; color: #f5efe6; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
  svg { max-width: 95%; max-height: 92vh; }
</style>
</head>
<body>${code}</body>
</html>`);
  }
  if (lang === 'css') {
    return addPlaytestHarness(`<!DOCTYPE html>
<html>
<head>
<style>${code}</style>
</head>
<body style="background:#0e0d0c;color:#f5efe6;font-family:system-ui,sans-serif;padding:24px;">
  <div class="preview-stage game-container card box app">
    <h2>CSS Live Preview</h2>
    <p>Previewing generated stylesheet rules.</p>
    <button>Interactive Button</button>
  </div>
</body>
</html>`);
  }
  // JavaScript / Canvas fallback wrapper
  return addPlaytestHarness(`<!DOCTYPE html>
<html>
<head>
<style>
  body { margin: 0; background: #0e0d0c; color: #f5efe6; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
  canvas { border: 1px solid rgba(249,115,22,0.35); border-radius: 6px; background: #090807; }
  #console-log { position: fixed; bottom: 8px; left: 8px; right: 8px; max-height: 110px; overflow-y: auto; background: rgba(12,11,10,0.92); border: 1px solid rgba(255,255,255,0.12); padding: 8px 12px; font-size: 11.5px; color: #fdba74; border-radius: 8px; }
</style>
</head>
<body>
  <canvas id="canvas" width="600" height="380"></canvas>
  <canvas id="stage" width="400" height="400" style="display:none;"></canvas>
  <div id="app"></div>
  <div id="console-log"></div>
  <script>
    const logEl = document.getElementById('console-log');
    const origLog = console.log;
    console.log = (...args) => {
      origLog(...args);
      if (logEl) logEl.innerHTML += '<div>&gt; ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '</div>';
    };
    try {
      ${code}
    } catch (err) {
      if (logEl) logEl.innerHTML += '<div style="color:#f87171;">Error: ' + err.message + '</div>';
    }
  </script>
</body>
</html>`);
}

function addPlaytestHarness(documentHtml: string): string {
  const harness = `<script data-catalyst-playtest="true">
(() => {
  const errors = [];
  let frames = 0;
  let inputEvents = 0;
  window.addEventListener('error', event => errors.push(String(event.message || 'Runtime error').slice(0, 500)));
  window.addEventListener('unhandledrejection', event => errors.push(String(event.reason?.message || event.reason || 'Unhandled promise rejection').slice(0, 500)));
  ['keydown','keyup','pointerdown','mousedown','touchstart'].forEach(type => window.addEventListener(type, () => inputEvents++, { passive: true }));
  const countFrames = () => { frames += 1; if (frames < 90) requestAnimationFrame(countFrames); };
  requestAnimationFrame(countFrames);
  const report = phase => {
    const canvas = document.querySelector('canvas');
    parent.postMessage({ type: 'CATALYST_PLAYTEST_RESULT', result: {
      phase, ok: errors.length === 0 && frames >= 3 && (!canvas || (canvas.width > 0 && canvas.height > 0)),
      errors, frames, inputEvents, hasCanvas: Boolean(canvas),
      canvasSize: canvas ? [canvas.width, canvas.height] : null,
      elapsedMs: Math.round(performance.now())
    }}, '*');
  };
  setTimeout(() => {
    ['keydown','keyup'].forEach(type => window.dispatchEvent(new KeyboardEvent(type, { key: ' ', code: 'Space', bubbles: true })));
    ['pointerdown','pointerup'].forEach(type => window.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: 300, clientY: 190 })));
  }, 250);
  setTimeout(() => report('initial'), 1200);
  window.CATALYST_PLAYTEST = { report };
})();
</script>`;
  if (documentHtml.includes('</head>')) return documentHtml.replace('</head>', `${harness}</head>`);
  return documentHtml.includes('</body>')
    ? documentHtml.replace('</body>', `${harness}</body>`)
    : `${documentHtml}${harness}`;
}

const InteractiveCodeBlock: React.FC<CodeBlockProps> = ({ language, code, isStreaming }) => {
  const normLang = (language || 'text').toLowerCase().trim();
  const isHtmlLike =
    normLang === 'html' ||
    normLang === 'htm' ||
    normLang === 'svg' ||
    code.includes('<!DOCTYPE') ||
    code.includes('<!doctype') ||
    code.includes('<html') ||
    code.includes('<canvas');

  const isPreviewable = PREVIEWABLE_LANGS.has(normLang) || isHtmlLike;
  const isTerminalRunnable = TERMINAL_RUNNABLE_LANGS.has(normLang) && !isHtmlLike;

  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split' | 'terminal'>('code');
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [autoSwitched, setAutoSwitched] = useState(false);

  // Terminal execution state for Python / Node
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<{
    stdout: string;
    stderr: string;
    exit_code: number;
  } | null>(null);
  const [playtest, setPlaytest] = useState<{
    ok: boolean;
    errors: string[];
    frames: number;
    inputEvents: number;
    hasCanvas: boolean;
    canvasSize: number[] | null;
    elapsedMs: number;
  } | null>(null);

  // Auto-switch to live preview once streaming completes for HTML/Canvas games!
  useEffect(() => {
    if (!isStreaming && !autoSwitched && isHtmlLike && code.length > 120) {
      setViewMode('preview');
      setAutoSwitched(true);
    }
  }, [isStreaming, autoSwitched, isHtmlLike, code.length]);

  const lines = useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
  const srcDoc = useMemo(() => buildIframeDocument(normLang, code), [normLang, code, reloadKey]);

  useEffect(() => {
    const handlePlaytest = (event: MessageEvent) => {
      if (event.data?.type === 'CATALYST_PLAYTEST_RESULT') setPlaytest(event.data.result);
    };
    window.addEventListener('message', handlePlaytest);
    return () => window.removeEventListener('message', handlePlaytest);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadFile = () => {
    const extMap: Record<string, string> = {
      html: 'html',
      javascript: 'js',
      js: 'js',
      typescript: 'ts',
      ts: 'ts',
      python: 'py',
      py: 'py',
      luau: 'luau',
      lua: 'lua',
      cpp: 'cpp',
      c: 'c',
      rust: 'rs',
      go: 'go',
      json: 'json',
      css: 'css'
    };
    const ext = extMap[normLang] || (isHtmlLike ? 'html' : 'txt');
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalyst_artifact_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunInTerminal = async () => {
    setViewMode('terminal');
    setIsRunningCode(true);
    try {
      const res = await fetch('http://127.0.0.1:8008/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: normLang, code })
      });
      const data = await res.json();
      setTerminalOutput({
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        exit_code: data.exit_code ?? 0
      });
    } catch (err: any) {
      setTerminalOutput({
        stdout: '',
        stderr: `Failed to connect to local execution sandbox: ${err?.message || 'Unknown error'}`,
        exit_code: 1
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  return (
    <div className={`ag-code-block ${expanded ? 'fullscreen' : ''}`}>
      {/* Code Block Header Bar */}
      <div className="ag-code-header">
        <div className="ag-code-header-left">
          <Terminal size={13} className="text-amber" />
          <span className="ag-code-lang">{normLang.toUpperCase()}</span>
          <span className="ag-code-lines">{lines.length} lines</span>
          {isStreaming && <span className="ag-code-streaming-pill">Streaming...</span>}
        </div>

        <div className="ag-code-header-right">
          <div className="ag-code-mode-tabs">
            <button
              type="button"
              className={`ag-mode-tab ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
              title="View Source Code"
            >
              <Code2 size={12} />
              <span>Code</span>
            </button>

            {isPreviewable && (
              <>
                <button
                  type="button"
                  className={`ag-mode-tab ${viewMode === 'preview' ? 'active' : ''}`}
                  onClick={() => { setPlaytest(null); setViewMode('preview'); }}
                  title="Run Interactive Live Preview"
                >
                  <Play size={12} />
                  <span>Auto-Run Preview</span>
                </button>
                <button
                  type="button"
                  className={`ag-mode-tab ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => setViewMode('split')}
                  title="Split Code + Live Preview"
                >
                  <Columns size={12} />
                  <span>Split</span>
                </button>
              </>
            )}

            {isTerminalRunnable && (
              <button
                type="button"
                className={`ag-mode-tab ${viewMode === 'terminal' ? 'active' : ''}`}
                onClick={handleRunInTerminal}
                title={`Execute ${normLang.toUpperCase()} in local sandbox`}
              >
                {isRunningCode ? <Loader2 size={12} className="spin" /> : <Play size={12} />}
                <span>Run {normLang.toUpperCase()}</span>
              </button>
            )}
          </div>

          {(viewMode === 'preview' || viewMode === 'split') && (
            <button
              type="button"
              className="ag-code-action-btn"
              onClick={() => { setPlaytest(null); setReloadKey((k) => k + 1); }}
              title="Restart / Reload Preview"
            >
              <RotateCcw size={12} />
            </button>
          )}

          {(viewMode === 'preview' || viewMode === 'split') && (
            <span className={`playtest-status ${playtest ? (playtest.ok ? 'passed' : 'failed') : 'pending'}`}>
              {playtest ? (playtest.ok ? 'Playtest passed' : 'Playtest found issues') : 'Playtesting...'}
            </span>
          )}

          <button
            type="button"
            className="ag-code-action-btn"
            onClick={handleDownloadFile}
            title="Download file"
          >
            <Download size={12} />
          </button>

          <button
            type="button"
            className="ag-code-action-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Exit Fullscreen' : 'Expand Code / Preview'}
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>

          <button
            type="button"
            className="ag-code-action-btn"
            onClick={handleCopy}
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body: Code, Live Preview, Split, or Terminal Output */}
      <div className={`ag-code-body mode-${viewMode === 'terminal' ? 'code' : viewMode}`}>
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className="ag-code-scroll">
            <table className="ag-code-table">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="ag-code-line">
                    <td className="ag-line-num">{idx + 1}</td>
                    <td className="ag-line-text">{line || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="ag-code-preview-pane">
            <iframe
              key={reloadKey}
              title={`Live Preview (${normLang})`}
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-modals allow-pointer-lock"
              className="ag-preview-iframe"
            />
            {playtest && !playtest.ok && (
              <div className="playtest-report">
                <strong>Runtime evidence</strong>
                {playtest.errors.length > 0
                  ? playtest.errors.map((error, index) => <span key={index}>{error}</span>)
                  : <span>Render checks did not pass.</span>}
                <small>{playtest.frames} frames · {playtest.inputEvents} input events · {playtest.elapsedMs} ms</small>
              </div>
            )}
          </div>
        )}

        {viewMode === 'terminal' && (
          <div className="ag-code-scroll" style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                Local Sandbox Execution ({normLang.toUpperCase()})
              </span>
              <button
                type="button"
                className="ag-code-action-btn"
                onClick={handleRunInTerminal}
                disabled={isRunningCode}
              >
                <RotateCcw size={11} />
                <span>Re-run</span>
              </button>
            </div>
            {isRunningCode ? (
              <div style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={14} className="spin" />
                <span>Executing script in D:\Catalyst\builds...</span>
              </div>
            ) : terminalOutput ? (
              <div>
                {terminalOutput.stdout && (
                  <pre style={{ margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                    {terminalOutput.stdout}
                  </pre>
                )}
                {terminalOutput.stderr && (
                  <pre style={{ margin: terminalOutput.stdout ? '10px 0 0' : 0, color: '#f87171', whiteSpace: 'pre-wrap' }}>
                    {terminalOutput.stderr}
                  </pre>
                )}
                {!terminalOutput.stdout && !terminalOutput.stderr && (
                  <div style={{ color: '#64748b' }}>Program finished with exit code {terminalOutput.exit_code} (no console output).</div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

interface Segment {
  type: 'text' | 'code';
  content: string;
  language?: string;
  unclosed?: boolean;
}

/**
 * Detects unfenced raw code when a model forgets triple backticks (```)
 * and automatically wraps it into a structured code segment with language detection.
 */
function detectRawCodeBlock(raw: string): Segment[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Check for raw HTML / SVG document
  const htmlMatch = raw.match(/(<!DOCTYPE\s+html|<html\b|<head\b|<body\b|<canvas\b|<svg\b|<style\b|<script\b)/i);
  if (htmlMatch && htmlMatch.index !== undefined) {
    const idx = htmlMatch.index;
    const segments: Segment[] = [];
    if (idx > 0 && raw.slice(0, idx).trim()) {
      segments.push({ type: 'text', content: raw.slice(0, idx) });
    }
    const codePart = raw.slice(idx);
    // Find where closing </html> or </script> or </svg> ends if there's trailing commentary
    const endHtmlMatch = codePart.match(/<\/html\s*>/i);
    if (endHtmlMatch && endHtmlMatch.index !== undefined) {
      const splitEnd = endHtmlMatch.index + endHtmlMatch[0].length;
      segments.push({
        type: 'code',
        language: 'html',
        content: codePart.slice(0, splitEnd),
        unclosed: false
      });
      if (codePart.slice(splitEnd).trim()) {
        segments.push({ type: 'text', content: codePart.slice(splitEnd) });
      }
    } else {
      segments.push({
        type: 'code',
        language: 'html',
        content: codePart,
        unclosed: true
      });
    }
    return segments;
  }

  // 2. Check for multi-line raw code in Python, JS/TS, C/C++, Luau, Rust, CSS
  const lines = trimmed.split('\n');
  if (lines.length >= 3) {
    let codeScore = 0;
    let detectedLang = 'javascript';

    for (const line of lines) {
      const l = line.trim();
      if (/^(import\s+|from\s+\w+\s+import|def\s+\w+\s*\(|class\s+\w+|if\s+__name__\s*==)/.test(l)) {
        codeScore += 2;
        detectedLang = 'python';
      } else if (/^(const\s+|let\s+|var\s+|function\s+\w+|window\.|document\.|console\.log|export\s+)/.test(l)) {
        codeScore += 2;
        detectedLang = 'javascript';
      } else if (/^(local\s+\w+\s*=|game:GetService|Instance\.new| workspace\.|script\.Parent)/.test(l)) {
        codeScore += 2;
        detectedLang = 'luau';
      } else if (/^(#include\s*<|int\s+main\s*\(|std::|using\s+namespace\s+std)/.test(l)) {
        codeScore += 2;
        detectedLang = 'cpp';
      } else if (/^(fn\s+main\s*\(|let\s+mut\s+|use\s+std::|pub\s+struct\s+)/.test(l)) {
        codeScore += 2;
        detectedLang = 'rust';
      } else if (/[{};]$/.test(l) || /^\s*(if|for|while|return)\b/.test(l)) {
        codeScore += 1;
      }
    }

    if (codeScore >= 3) {
      return [
        {
          type: 'code',
          language: detectedLang,
          content: raw,
          unclosed: false
        }
      ];
    }
  }

  return null;
}

function parseMarkdownSegments(raw: string): Segment[] {
  if (!raw.includes('```')) {
    const autoDetected = detectRawCodeBlock(raw);
    if (autoDetected) return autoDetected;
  }

  const segments: Segment[] = [];
  const fenceRegex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)(?:```|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = raw.slice(lastIndex, match.index);
      const autoChunk = detectRawCodeBlock(textChunk);
      if (autoChunk) {
        segments.push(...autoChunk);
      } else {
        segments.push({
          type: 'text',
          content: textChunk
        });
      }
    }
    const fullMatch = match[0];
    const unclosed = !fullMatch.endsWith('```');
    const body = match[2];
    let lang = (match[1] || '').trim().toLowerCase();
    if (!lang) {
      if (body.includes('<!DOCTYPE') || body.includes('<html') || body.includes('<canvas')) {
        lang = 'html';
      } else if (body.includes('def ') || body.includes('import ')) {
        lang = 'python';
      } else {
        lang = 'javascript';
      }
    }
    segments.push({
      type: 'code',
      language: lang,
      content: body,
      unclosed
    });
    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < raw.length) {
    const tailChunk = raw.slice(lastIndex);
    const autoTail = detectRawCodeBlock(tailChunk);
    if (autoTail) {
      segments.push(...autoTail);
    } else {
      segments.push({
        type: 'text',
        content: tailChunk
      });
    }
  }

  return segments;
}

function renderInlineMarkdown(text: string, onOpenLink?: (url: string) => void): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="ag-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    const linkParts = part.split(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/g);
    return linkParts.map((linkPart, linkIdx) => {
      const isUrl = /^(https?:\/\/|www\.)/i.test(linkPart);
      if (!isUrl) return <React.Fragment key={`${idx}-${linkIdx}`}>{linkPart}</React.Fragment>;
      const trailing = linkPart.match(/[.,;:!?)]*$/)?.[0] || '';
      const cleanUrl = trailing ? linkPart.slice(0, -trailing.length) : linkPart;
      const href = cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
      return (
        <React.Fragment key={`${idx}-${linkIdx}`}>
          <a
            className="ag-auto-link"
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => {
              if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && onOpenLink) {
                event.preventDefault();
                onOpenLink(href);
              }
            }}
            title="Open in Catalyst Browser · right-click for link options"
          >
            {cleanUrl}
          </a>
          {trailing}
        </React.Fragment>
      );
    });
  });
}

function renderFormattedTextBlock(block: string, blockKey: number, onOpenLink?: (url: string) => void): React.ReactNode {
  const lines = block.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list`} className="ag-md-list">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`${blockKey}-${i}`);
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList(`${blockKey}-${i}`);
      elements.push(
        <h3 key={`${blockKey}-${i}`} className="ag-md-h3">
          {renderInlineMarkdown(trimmed.slice(4), onOpenLink)}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(`${blockKey}-${i}`);
      elements.push(
        <h2 key={`${blockKey}-${i}`} className="ag-md-h2">
          {renderInlineMarkdown(trimmed.slice(3), onOpenLink)}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(`${blockKey}-${i}`);
      elements.push(
        <h1 key={`${blockKey}-${i}`} className="ag-md-h1">
          {renderInlineMarkdown(trimmed.slice(2), onOpenLink)}
        </h1>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(
        <li key={`${blockKey}-${i}`}>{renderInlineMarkdown(trimmed.slice(2), onOpenLink)}</li>
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s+/, '');
      listItems.push(<li key={`${blockKey}-${i}`}>{renderInlineMarkdown(content, onOpenLink)}</li>);
    } else {
      flushList(`${blockKey}-${i}`);
      elements.push(
        <p key={`${blockKey}-${i}`} className="ag-md-p">
          {renderInlineMarkdown(line, onOpenLink)}
        </p>
      );
    }
  });

  flushList(`${blockKey}-end`);
  return <div key={blockKey} className="ag-md-text-segment">{elements}</div>;
}

export const MarkdownCodeRenderer: React.FC<{
  content: string;
  isStreaming?: boolean;
  onOpenLink?: (url: string) => void;
}> = ({ content, isStreaming, onOpenLink }) => {
  const segments = useMemo(() => parseMarkdownSegments(content), [content]);

  return (
    <div className="ag-markdown-body">
      {segments.map((seg, idx) =>
        seg.type === 'code' ? (
          <InteractiveCodeBlock
            key={idx}
            language={seg.language || 'text'}
            code={seg.content}
            isStreaming={isStreaming && seg.unclosed}
          />
        ) : (
          renderFormattedTextBlock(seg.content, idx, onOpenLink)
        )
      )}
    </div>
  );
};
