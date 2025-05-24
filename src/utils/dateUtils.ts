export function getEventStatus(startTime: string, endTime: string): 'past' | 'ongoing' | 'upcoming' {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now > end) {
    return 'past';
  } else if (now >= start && now <= end) {
    return 'ongoing';
  } else {
    return 'upcoming';
  }
}

export function formatEventTime(startTime: string, timezone: string): { date: string; time: string } {
  const start = new Date(startTime);
  
  const date = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  const time = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  return { date, time };
}

export function formatEventDuration(startTime: string, endTime: string, timezone: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const startDate = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  const endDate = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  const startTime12 = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  const endTime12 = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  if (startDate === endDate) {
    return `${startDate} • ${startTime12} - ${endTime12}`;
  } else {
    return `${startDate} ${startTime12} - ${endDate} ${endTime12}`;
  }
}

export function isToday(date: string): boolean {
  const today = new Date();
  const eventDate = new Date(date);
  
  return today.toDateString() === eventDate.toDateString();
}

export function isTomorrow(date: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDate = new Date(date);
  
  return tomorrow.toDateString() === eventDate.toDateString();
}

export function getRelativeDate(date: string): string {
  if (isToday(date)) {
    return 'Today';
  } else if (isTomorrow(date)) {
    return 'Tomorrow';
  } else {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}