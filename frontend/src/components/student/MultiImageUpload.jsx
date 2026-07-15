export default function MultiImageUpload({ previews, uploading, onFilesChange, onRemove, onDragStart, onDrop }) {
  return (
    <div>
      {previews.length < 5 && (
        <label style={{ display: 'block', cursor: uploading ? 'not-allowed' : 'pointer' }}>
          <input type="file" accept="image/*" multiple onChange={onFilesChange} disabled={uploading} style={{ display: 'none' }} />
          <div className="file-upload" style={{ pointerEvents: uploading ? 'none' : 'auto' }}>
            <div className="file-upload-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-teal)' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <div className="file-upload-text">
              Nhấp để chọn ảnh bài làm <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({previews.length}/5 ảnh)</span>
            </div>
          </div>
        </label>
      )}
      {previews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 10 }}>
          {previews.map((p, idx) => (
            <div
              key={p.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(e, idx)}
              style={{ position: 'relative', border: '2px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'grab', background: 'var(--bg-base)' }}
            >
              <div style={{ position: 'absolute', top: 4, left: 4, background: 'var(--accent-light)', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '1px 5px', zIndex: 1 }}>
                {idx + 1}
              </div>
              <button
                onClick={() => onRemove(p.id)}
                disabled={uploading}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, lineHeight: 1 }}
              >
                ✕
              </button>
              <img src={p.url} alt={`Trang ${idx + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '3px 0', background: 'var(--bg-elevated)' }}>
                Kéo để sắp xếp
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
