export function getTaskScheduledDate(taskDate: Date | string, timeSlot?: string): Date | null {
  // If timeSlot is missing or "Anytime", we can't schedule minute-level alarms.
  if (!timeSlot || timeSlot === "Anytime") return null;

  // Parse timeSlot like "12:23 AM" or "08:30 PM"
  const match = timeSlot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (hours === 12 && ampm === 'AM') hours = 0;
  if (hours !== 12 && ampm === 'PM') hours += 12;

  // Extract year, month, and day in IST (Asia/Kolkata) from taskDate
  const dateObj = new Date(taskDate);
  const istDateString = dateObj.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istDateString);

  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');

  // Construct absolute ISO string with explicit IST (+05:30) offset
  return new Date(`${year}-${month}-${day}T${hh}:${mm}:00+05:30`);
}
