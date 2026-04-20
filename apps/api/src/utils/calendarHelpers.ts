export const getEventStyles = (type: string, isPrivate: boolean) => {
  if (isPrivate) {
    return {
      color: '#6B7280', // Gray
      label: '🔒 Private',
      priority: 4
    };
  }

  const styles: Record<string, { color: string, label: string, priority: number }> = {
    COURT_DATE: { 
      color: '#EF4444', 
      label: '⚖️ Court Date', 
      priority: 1 
    },
    STATUTORY_DEADLINE: { 
      color: '#F59E0B', 
      label: '📅 Deadline', 
      priority: 1 
    },
    MEETING: { 
      color: '#3B82F6', 
      label: '🤝 Meeting', 
      priority: 2 
    },
    GENERAL: { 
      color: '#10B981', 
      label: '📝 Task', 
      priority: 3 
    }
  };

  return styles[type] || styles.GENERAL;
};