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
 * Parse a day-first "dd/mm/yyyy" string into a local Date.
 * Returns null unless the string is complete and a real calendar date
 * (e.g. rejects 31/02/2026 or 00/00/0000).
 */
export function parseDdMmYyyy(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value?.trim() ?? "")
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day)
  // Reject overflow (e.g. Feb 31 rolling into March).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

/** Format an <input type="date"> value ("yyyy-mm-dd") as day-first "dd/mm/yyyy". */
export function isoToDdMmYyyy(value) {
  const parsed = parseInputDate(value)
  if (!parsed) return ""
  const dd = String(parsed.getDate()).padStart(2, "0")
  const mm = String(parsed.getMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}/${parsed.getFullYear()}`
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
