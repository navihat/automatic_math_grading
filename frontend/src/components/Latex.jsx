import katex from 'katex';

/**
 * Render pure LaTeX. block=true → display mode (centered, larger).
 */
export function Latex({ children, block = false, style }) {
  if (!children) return null;
  try {
    const html = katex.renderToString(String(children), {
      displayMode: block,
      throwOnError: false,
      strict: false,
      output: 'html',
    });
    return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span style={style}>{children}</span>;
  }
}

/**
 * Render text that may contain LaTeX between $...$ (inline) or $$...$$ (block).
 * Plain text segments are preserved as-is.
 */
export function MixedLatex({ text, style }) {
  if (!text) return null;
  const parts = splitMath(text);
  return (
    <span style={style}>
      {parts.map((p, i) =>
        p.type === 'math'
          ? <Latex key={i} block={p.block}>{p.content}</Latex>
          : <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{p.content}</span>
      )}
    </span>
  );
}

function splitMath(text) {
  const parts = [];
  // Match $$...$$ first (display), then $...$  (inline)
  const re = /(\$\$[\s\S]*?\$\$|\$(?:[^$\n\\]|\\.)*?\$)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: 'text', content: text.slice(last, m.index) });
    }
    const block = m[0].startsWith('$$');
    parts.push({ type: 'math', block, content: m[0].slice(block ? 2 : 1, block ? -2 : -1) });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ type: 'text', content: text.slice(last) });
  }
  return parts.length ? parts : [{ type: 'text', content: text }];
}
