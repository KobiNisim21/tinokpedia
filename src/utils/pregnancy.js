/**
 * Pregnancy date math.
 *
 * Standard obstetric convention: a full-term pregnancy is 280 days (40 weeks)
 * counted from the first day of the last menstrual period (LMP).
 *   EDD (estimated due date) = LMP + 280 days
 *
 * All functions are pure and work on local calendar dates (time-of-day ignored).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const GESTATION_DAYS = 280

/** Strip time-of-day so date math is stable regardless of clock time. */
function atMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Parse a native <input type="date"> value ("yyyy-mm-dd") as a local date. */
export function parseInputDate(value) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Derive the EDD from the signup inputs.
 * @param {"last_period"|"due_date"} method
 * @param {Date} date - LMP date or the due date itself, depending on method
 * @returns {Date} the estimated due date
 */
export function eddFromInputs(method, date) {
  const base = atMidnight(date)
  if (method === "due_date") return base
  // last_period: EDD = LMP + 280 days
  return new Date(base.getTime() + GESTATION_DAYS * MS_PER_DAY)
}

/**
 * Compute the current pregnancy status from an EDD.
 * @param {Date} edd
 * @param {Date} [today=new Date()]
 * @returns {{week:number, day:number, daysToDue:number, trimester:1|2|3, progress:number}}
 */
export function pregnancyStatus(edd, today = new Date()) {
  const eddMid = atMidnight(edd)
  const todayMid = atMidnight(today)

  const daysToDue = Math.round((eddMid - todayMid) / MS_PER_DAY)
  const gestationDays = GESTATION_DAYS - daysToDue
  const clamped = Math.min(Math.max(gestationDays, 0), GESTATION_DAYS)

  const week = Math.floor(clamped / 7)
  const day = clamped % 7
  const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3
  const progress = clamped / GESTATION_DAYS

  return {
    week,
    day,
    daysToDue: Math.max(daysToDue, 0),
    trimester,
    progress,
  }
}
