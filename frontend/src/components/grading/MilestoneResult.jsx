import { MixedLatex } from '../Latex';

export default function MilestoneResult({ result }) {
  if (!result) return null;

  const milestones = result.milestones || result.milestone_json || [];
  const achieved = milestones.filter(m => m.achieved).length;
  const feedback = result.feedback || result.feedback_text;
  const needsReview = result.needs_review;
  const teacherReviewed = !!result.teacher_feedback;
  const misconceptions = result.misconceptions || result.misconception_json || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Milestone summary */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ padding: '12px 20px', background: 'var(--accent-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', textAlign: 'center', minWidth: 110 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>
            {achieved}<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>/{milestones.length}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>milestone đạt</div>
        </div>
        {needsReview && (
          <span style={{ padding: '6px 12px', background: 'rgba(251,191,36,.15)', border: '1px solid #d97706', borderRadius: 'var(--radius)', fontSize: 12, color: '#d97706', fontWeight: 600 }}>
            Đang chờ giáo viên review
          </span>
        )}
      </div>

      {/* Milestone list */}
      {milestones.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>Chi tiết milestone</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {milestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 6, background: m.achieved ? 'rgba(16,185,129,.08)' : 'var(--bg-elevated)', border: `1px solid ${m.achieved ? 'rgba(16,185,129,.3)' : 'var(--border)'}` }}>
                <span style={{ fontSize: 16 }}>{m.achieved ? '✅' : '⬜'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name || m.id}</div>
                  {m.comment && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}><MixedLatex text={m.comment} /></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI feedback */}
      {feedback && (
        <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>Phản hồi AI</div>
          <MixedLatex text={feedback} />
        </div>
      )}

      {/* Misconceptions — chỉ hiện sau khi GV đã review */}
      {teacherReviewed && misconceptions.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>⚠️ Lỗi suy luận</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {misconceptions.map((m, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>
                  ❌ {m.name}
                </div>
                {m.detail && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <MixedLatex text={m.detail} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
