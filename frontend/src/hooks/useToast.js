import { useState } from 'react';

export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null);
  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }
  return { toast, showToast };
}
