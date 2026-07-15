import { useState, useCallback } from 'react';

const STORAGE_KEY = 'math_grading_notifications';
const MAX = 50;

export const NOTIF_TYPES = {
  SUBMISSION: 'submission',
  NEW_ASSIGNMENT: 'new_assignment',
  GRADING_DONE: 'grading_done',
  TEACHER_FEEDBACK: 'teacher_feedback',
};

export const NOTIF_ICONS = {
  submission: '📄',
  new_assignment: '📚',
  grading_done: '✅',
  teacher_feedback: '✍️',
};

export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function save(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState(load);

  const addNotification = useCallback((type, title, message) => {
    const notif = {
      id: Date.now(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => {
      const next = [notif, ...prev].slice(0, MAX);
      save(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, addNotification, markAllRead, clearAll, unreadCount };
}
