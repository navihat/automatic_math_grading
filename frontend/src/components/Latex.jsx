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
  // Hỗ trợ 4 dạng delimiter:
  //   $$...$$   → display  (KaTeX/Markdown)
  //   $...$     → inline   (KaTeX/Markdown)
  //   \[...\]   → display  (LaTeX/MathJax)
  //   \(...\)   → inline   (LaTeX/MathJax)
  const re = /(\$\$[\s\S]*?\$\$|\$(?:[^$\n\\]|\\.)*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: 'text', content: text.slice(last, m.index) });
    }
    const raw = m[0];
    let block, content;
    if (raw.startsWith('$$')) {
      block = true; content = raw.slice(2, -2);
    } else if (raw.startsWith('\\[')) {
      block = true; content = raw.slice(2, -2);
    } else if (raw.startsWith('\\(')) {
      block = false; content = raw.slice(2, -2);
    } else {
      block = false; content = raw.slice(1, -1);
    }
    parts.push({ type: 'math', block, content });
    last = m.index + raw.length;
  }
  if (last < text.length) {
    parts.push({ type: 'text', content: text.slice(last) });
  }
  return parts.length ? parts : [{ type: 'text', content: text }];
}
