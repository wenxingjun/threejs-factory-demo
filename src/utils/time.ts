export const formatClock = (date = new Date()): string =>
  new Intl.DateTimeFormat('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);

export const createId = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
