import { createPortal } from 'react-dom';

export default function Toast({ toast }) {
  if (!toast) return null;
  return createPortal(
    <div className={`toast toast-${toast.type}`}>{toast.message}</div>,
    document.body
  );
}
