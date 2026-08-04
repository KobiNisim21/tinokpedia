import test from 'node:test'
import assert from 'node:assert/strict'
import {
  eddFromInputs,
  parseDdMmYyyy,
  pregnancyStatus,
} from '../src/utils/pregnancy.js'

test('parseDdMmYyyy rejects impossible dates', () => {
  assert.equal(parseDdMmYyyy('31/02/2026'), null)
  assert.equal(parseDdMmYyyy('1/2/2026'), null)
})

test('eddFromInputs adds 280 days to the last period date', () => {
  const edd = eddFromInputs('last_period', new Date(2026, 0, 1))
  assert.deepEqual(
    [edd.getFullYear(), edd.getMonth(), edd.getDate()],
    [2026, 9, 8],
  )
})

test('pregnancyStatus returns a deterministic week and day', () => {
  const today = new Date(2026, 0, 1)
  const edd = new Date(2026, 4, 21)
  const status = pregnancyStatus(edd, today)
  assert.equal(status.week, 20)
  assert.equal(status.day, 0)
  assert.equal(status.trimester, 2)
  assert.equal(status.daysToDue, 140)
})
