export function getEventStatus(
  startTime: string,
  endTime: string,
): "past" | "ongoing" | "upcoming" {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now > end) {
    return "past";
  } else if (now >= start && now <= end) {
    return "ongoing";
  } else {
    return "upcoming";
  }
}

function correctTime(date: Date, correctionHours: number = -7): Date {
  // The GraphQL API returns incorrect times, so we have to use this workaround
  const correctionMs = correctionHours * 60 * 60 * 1000;
  return new Date(date.getTime() + correctionMs);
}

export function formatEventTime(
  startTime: string,
  timezone: string,
  localTimezone: string = "America/Los_Angeles",
): { date: string; time: string } {
  const start = correctTime(new Date(startTime));

  // Don't use timeZone parameter since we already corrected the time manually
  const date = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const time = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return { date, time };
}

export function formatEventDuration(
  startTime: string,
  endTime: string,
  timezone: string,
  localTimezone: string = "America/Los_Angeles",
): string {
  const start = correctTime(new Date(startTime));
  const end = correctTime(new Date(endTime));

  const startDate = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const endDate = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const startTime12 = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const endTime12 = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (startDate === endDate) {
    return `${startDate} • ${startTime12} - ${endTime12}`;
  } else {
    return `${startDate} ${startTime12} - ${endDate} ${endTime12}`;
  }
}

export function isToday(
  date: string,
  localTimezone: string = "America/Los_Angeles",
): boolean {
  const today = new Date();
  const eventDate = new Date(date);

  const todayStr = today.toLocaleDateString("en-US", {
    timeZone: localTimezone,
  });
  const eventStr = eventDate.toLocaleDateString("en-US", {
    timeZone: localTimezone,
  });

  return todayStr === eventStr;
}

export function isTomorrow(
  date: string,
  localTimezone: string = "America/Los_Angeles",
): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDate = new Date(date);

  const tomorrowStr = tomorrow.toLocaleDateString("en-US", {
    timeZone: localTimezone,
  });
  const eventStr = eventDate.toLocaleDateString("en-US", {
    timeZone: localTimezone,
  });

  return tomorrowStr === eventStr;
}

export function getRelativeDate(
  date: string,
  localTimezone: string = "America/Los_Angeles",
): string {
  if (isToday(date, localTimezone)) {
    return "Today";
  } else if (isTomorrow(date, localTimezone)) {
    return "Tomorrow";
  } else {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: localTimezone,
    });
  }
}
