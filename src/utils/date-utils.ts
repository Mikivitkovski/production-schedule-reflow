import { DateTime, Interval } from "luxon";
import type { MaintenanceWindow, Shift } from "../reflow/types.js";

export function dt(isoUtc: string): DateTime {
  const d = DateTime.fromISO(isoUtc, { zone: "utc" });
  if (!d.isValid) throw new Error(`Invalid ISO date: ${isoUtc}`);
  return d;
}

export function toIso(d: DateTime): string {
  return d.toUTC().toISO({ suppressMilliseconds: true })!;
}

export function maxDt(a: DateTime, b: DateTime): DateTime {
  return a.toMillis() >= b.toMillis() ? a : b;
}

export function minDt(a: DateTime, b: DateTime): DateTime {
  return a.toMillis() <= b.toMillis() ? a : b;
}

export function minutesBetween(a: DateTime, b: DateTime): number {
  return Math.round((b.toMillis() - a.toMillis()) / 60000);
}

function luxonToDayOfWeek0Sun(t: DateTime): number {
  return t.weekday === 7 ? 0 : t.weekday;
}

export function isWithinShift(t: DateTime, shifts: Shift[]): boolean {
  const dayOfWeek = luxonToDayOfWeek0Sun(t);
  const hour = t.hour + t.minute / 60;

  return shifts.some((s) => {
    if (s.dayOfWeek !== dayOfWeek) return false;
    return hour >= s.startHour && hour < s.endHour;
  });
}

export function getShiftForInstant(t: DateTime, shifts: Shift[]): Shift | null {
  const dayOfWeek = luxonToDayOfWeek0Sun(t);
  const hour = t.hour + t.minute / 60;

  const s = shifts.find(
    (sh) => sh.dayOfWeek === dayOfWeek && hour >= sh.startHour && hour < sh.endHour
  );
  return s ?? null;
}

export function getShiftStartOnDate(date: DateTime, shift: Shift): DateTime {
  return date
    .startOf("day")
    .set({ hour: shift.startHour, minute: 0, second: 0, millisecond: 0 });
}

export function getShiftEndOnDate(date: DateTime, shift: Shift): DateTime {
  return date
    .startOf("day")
    .set({ hour: shift.endHour, minute: 0, second: 0, millisecond: 0 });
}

export function sortedMaintenanceIntervals(windows: MaintenanceWindow[]): Interval[] {
  return windows
    .map((w) => Interval.fromDateTimes(dt(w.startDate), dt(w.endDate)))
    .filter((i) => i.isValid && i.start !== null && i.end !== null)
    .sort((a, b) => a.start!.toMillis() - b.start!.toMillis());
}

export function isInMaintenance(t: DateTime, maintenance: Interval[]): Interval | null {
  for (const m of maintenance) {
    if (m.contains(t)) return m;
  }
  return null;
}

export function nextShiftStart(after: DateTime, shifts: Shift[], maxLookaheadDays = 30): DateTime {
  for (let i = 0; i <= maxLookaheadDays; i++) {
    const day = after.plus({ days: i }).startOf("day");
    const dayOfWeek = luxonToDayOfWeek0Sun(day);

    const dayShifts = shifts
      .filter((s) => s.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startHour - b.startHour);

    for (const s of dayShifts) {
      const start = getShiftStartOnDate(day, s);
      if (start.toMillis() >= after.toMillis()) return start;
    }
  }
  throw new Error("No upcoming shift found (check work center shifts)");
}

export function nextWorkingInstant(
  t: DateTime,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[]
): DateTime {
  const maintenance = sortedMaintenanceIntervals(maintenanceWindows);
  let cur = t;

  for (let guard = 0; guard < 5000; guard++) {
    const m = isInMaintenance(cur, maintenance);
    if (m) {
      cur = m.end!;
      continue;
    }

    if (isWithinShift(cur, shifts)) return cur;

    cur = nextShiftStart(cur, shifts);
  }

  throw new Error("nextWorkingInstant: guard exceeded (bad shift/maintenance data?)");
}

export function addWorkingMinutes(
  start: DateTime,
  durationMinutes: number,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[]
): { end: DateTime; debugSegments: Array<{ from: string; to: string; kind: "work" | "pause" }> } {
  if (durationMinutes < 0) throw new Error("durationMinutes must be >= 0");

  const maintenance = sortedMaintenanceIntervals(maintenanceWindows);
  const segments: Array<{ from: string; to: string; kind: "work" | "pause" }> = [];

  let remaining = durationMinutes;
  let cur = nextWorkingInstant(start, shifts, maintenanceWindows);

  for (let guard = 0; guard < 20000; guard++) {
    if (remaining === 0) return { end: cur, debugSegments: segments };

    const mHere = isInMaintenance(cur, maintenance);
    if (mHere) {
      const from = cur;
      cur = mHere.end!;
      segments.push({ from: toIso(from), to: toIso(cur), kind: "pause" });
      cur = nextWorkingInstant(cur, shifts, maintenanceWindows);
      continue;
    }

    const shift = getShiftForInstant(cur, shifts);
    if (!shift) {
      const from = cur;
      cur = nextWorkingInstant(cur, shifts, maintenanceWindows);
      segments.push({ from: toIso(from), to: toIso(cur), kind: "pause" });
      continue;
    }

    const shiftEnd = getShiftEndOnDate(cur, shift);

    let nextMaintStart: DateTime | null = null;
    let nextMaintEnd: DateTime | null = null;

    for (const m of maintenance) {
      if (m.end!.toMillis() <= cur.toMillis()) continue;

      const ms = m.start!;
      if (ms.toMillis() >= shiftEnd.toMillis()) break;

      if (ms.toMillis() > cur.toMillis()) {
        nextMaintStart = ms;
        nextMaintEnd = m.end!;
        break;
      }
    }

    const naturalEnd = cur.plus({ minutes: remaining });
    let limit = minDt(naturalEnd, shiftEnd);
    if (nextMaintStart) limit = minDt(limit, nextMaintStart);

    const worked = Math.max(0, minutesBetween(cur, limit));
    if (worked > 0) {
      segments.push({ from: toIso(cur), to: toIso(limit), kind: "work" });
      remaining -= worked;
      cur = limit;
      if (remaining === 0) return { end: cur, debugSegments: segments };
    }

    if (nextMaintStart && cur.toMillis() === nextMaintStart.toMillis()) {
      const from = cur;
      cur = nextMaintEnd!;
      segments.push({ from: toIso(from), to: toIso(cur), kind: "pause" });
      cur = nextWorkingInstant(cur, shifts, maintenanceWindows);
      continue;
    }

    if (cur.toMillis() === shiftEnd.toMillis()) {
      const from = cur;
      cur = nextWorkingInstant(cur, shifts, maintenanceWindows);
      segments.push({ from: toIso(from), to: toIso(cur), kind: "pause" });
      continue;
    }

    if (worked === 0) {
      const from = cur;
      cur = nextWorkingInstant(cur.plus({ minutes: 1 }), shifts, maintenanceWindows);
      segments.push({ from: toIso(from), to: toIso(cur), kind: "pause" });
    }
  }

  throw new Error("addWorkingMinutes: guard exceeded (impossible schedule?)");
}
