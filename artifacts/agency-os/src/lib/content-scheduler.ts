/**
 * Content Scheduler — Smart Zigzag Distribution Algorithm
 */

export type DeliverableType = "REEL" | "POST" | "CAROUSEL" | "BLOG";

export type ScheduleItem = {
  type: DeliverableType;
  scheduledDate: Date;
  editStartDate: Date;
  editEndDate: Date;
  sortOrder: number;
};

/**
 * Calculates the edit window, walking backwards and skipping Sundays.
 * Clamps the start date to the 1st of the month.
 */
export function calculateEditWindow(
  scheduledDate: Date,
  type: DeliverableType,
  year: number,
  month: number
): { editStartDate: Date; editEndDate: Date } {
  const editDuration = type === "REEL" ? 3 : 1;

  let daysAdded = 0;
  let testDate = new Date(scheduledDate);

  let editEndDate: Date | null = null;
  let editStartDate: Date | null = null;

  while (daysAdded < editDuration) {
    testDate.setDate(testDate.getDate() - 1);
    
    // 0 is Sunday
    if (testDate.getDay() !== 0) {
      if (daysAdded === 0) {
        editEndDate = new Date(testDate);
      }
      editStartDate = new Date(testDate);
      daysAdded++;
    }
  }

  // If editStartDate pushes before the 1st of the month, clamp it
  const firstOfMonth = new Date(year, month, 1);
  if (editStartDate && editStartDate < firstOfMonth) {
    editStartDate = new Date(firstOfMonth);
  }
  
  if (!editStartDate) editStartDate = new Date(scheduledDate);
  if (!editEndDate) editEndDate = new Date(scheduledDate);

  // If editEndDate is now before editStartDate (due to clamping), adjust it
  if (editEndDate < editStartDate) {
    editEndDate = new Date(editStartDate);
  }

  return { editStartDate, editEndDate };
}

/**
 * Get all eligible posting days in a month (Mon–Sat, skip Sundays)
 */
function getPostingDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    // Skip Sundays (0 = Sunday)
    if (date.getDay() !== 0) {
      days.push(date);
    }
  }
  return days;
}

/**
 * Build the zigzag content type sequence.
 */
function buildZigzagSequence(
  counts: { type: DeliverableType; count: number }[]
): DeliverableType[] {
  const videoTypes = ["REEL"] as const;

  const videoPool: DeliverableType[] = [];
  const graphicPool: DeliverableType[] = [];

  for (const { type, count } of counts) {
    for (let i = 0; i < count; i++) {
      if ((videoTypes as readonly string[]).includes(type)) {
        videoPool.push(type);
      } else {
        graphicPool.push(type);
      }
    }
  }

  const sequence: DeliverableType[] = [];
  let vi = 0;
  let gi = 0;
  let groupIsA = true; // true = (V, G, V), false = (G, V, G)

  while (vi < videoPool.length || gi < graphicPool.length) {
    if (groupIsA) {
      // Pattern A: video, graphic, video
      if (vi < videoPool.length) sequence.push(videoPool[vi++]!);
      if (gi < graphicPool.length) sequence.push(graphicPool[gi++]!);
      if (vi < videoPool.length) sequence.push(videoPool[vi++]!);
    } else {
      // Pattern B: graphic, video, graphic
      if (gi < graphicPool.length) sequence.push(graphicPool[gi++]!);
      if (vi < videoPool.length) sequence.push(videoPool[vi++]!);
      if (gi < graphicPool.length) sequence.push(graphicPool[gi++]!);
    }
    groupIsA = !groupIsA;
  }

  return sequence;
}

/**
 * Main scheduler: distributes deliverables across a specific month.
 */
export function scheduleMonth(
  monthStr: string, // "YYYY-MM"
  counts: { type: DeliverableType; count: number }[]
): ScheduleItem[] {
  const totalItems = counts.reduce((sum, c) => sum + c.count, 0);
  if (totalItems === 0) return [];

  const [yearStr, mStr] = monthStr.split("-");
  const year = parseInt(yearStr!, 10);
  const month = parseInt(mStr!, 10) - 1; // 0-indexed

  const postingDays = getPostingDays(year, month);
  if (postingDays.length === 0) return [];

  // Validation rule: Cap deliverables to eligible days
  if (totalItems > postingDays.length) {
    throw new Error(`Cannot schedule ${totalItems} deliverables into ${postingDays.length} eligible days.`);
  }

  // Distribute deliverables
  const sequence = buildZigzagSequence(counts);
  const results: ScheduleItem[] = [];

  if (sequence.length > 0) {
    const gap = Math.max(1, Math.floor(postingDays.length / sequence.length));

    for (let i = 0; i < sequence.length; i++) {
      const dayIndex = Math.min(i * gap, postingDays.length - 1);
      results.push({
        type: sequence[i]!,
        scheduledDate: postingDays[dayIndex]!,
        editStartDate: new Date(), // Placeholder
        editEndDate: new Date(),   // Placeholder
        sortOrder: i,
      });
    }

    // Ensure no duplicate dates for primary items
    const usedDates = new Set<string>();
    for (const item of results) {
      let dateKey = item.scheduledDate.toISOString().slice(0, 10);
      if (usedDates.has(dateKey)) {
        let dayIdx = postingDays.findIndex(
          (d) => d.toISOString().slice(0, 10) === dateKey
        );
        while (dayIdx < postingDays.length && usedDates.has(postingDays[dayIdx]!.toISOString().slice(0, 10))) {
          dayIdx++;
        }
        if (dayIdx < postingDays.length) {
          item.scheduledDate = postingDays[dayIdx]!;
          dateKey = item.scheduledDate.toISOString().slice(0, 10);
        }
      }
      usedDates.add(dateKey);
    }
    
    // Calculate edit windows
    for (const item of results) {
       const { editStartDate, editEndDate } = calculateEditWindow(item.scheduledDate, item.type, year, month);
       item.editStartDate = editStartDate;
       item.editEndDate = editEndDate;
    }
  }

  return results.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime() || a.sortOrder - b.sortOrder);
}
