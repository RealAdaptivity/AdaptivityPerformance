import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_COLUMNS,
  FINISHED_COLUMN_LIMIT,
  LIVE_COLUMN_IDS,
  bookingSortTime,
  groupBookingsForBoard,
  resolveActiveColumn,
  techBoardState,
  techBoardStates,
  type BoardBooking,
} from '../src/services/dispatchBoard.ts';

function job(over: Partial<BoardBooking> & { id: string; status: string }): BoardBooking {
  return { createdAtIso: '2026-09-20T12:00:00.000Z', ...over };
}

test('every live column maps to exactly one status, and all five statuses have a home', () => {
  const statuses = BOARD_COLUMNS.map((c) => c.status);
  assert.deepEqual(
    statuses.slice().sort(),
    ['CANCELED', 'COMPLETED', 'EN_ROUTE', 'ON_SITE', 'UNASSIGNED']
  );
  assert.equal(new Set(statuses).size, statuses.length, 'two columns claim the same status');
  // Canceled is deliberately not a live column.
  assert.ok(!LIVE_COLUMN_IDS.includes('canceled'));
  assert.equal(LIVE_COLUMN_IDS.length, 4);
});

test('a job lands in the column for its status', () => {
  const { groups } = groupBookingsForBoard([
    job({ id: 'a', status: 'UNASSIGNED' }),
    job({ id: 'b', status: 'EN_ROUTE' }),
    job({ id: 'c', status: 'ON_SITE' }),
    job({ id: 'd', status: 'COMPLETED' }),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.column.id, g.jobs.map((j) => j.id)]),
    [['needs_tech', ['a']], ['on_the_way', ['b']], ['on_site', ['c']], ['done', ['d']]]
  );
});

test('canceled jobs stay off the board unless asked for', () => {
  const bookings = [job({ id: 'x', status: 'CANCELED' }), job({ id: 'y', status: 'UNASSIGNED' })];

  const live = groupBookingsForBoard(bookings);
  assert.deepEqual(live.groups.flatMap((g) => g.jobs.map((j) => j.id)), ['y']);
  // Not dropped on the floor — the console can still account for it.
  assert.deepEqual(live.unplaced.map((j) => j.id), ['x']);

  const withCanceled = groupBookingsForBoard(bookings, {
    columns: [...LIVE_COLUMN_IDS, 'canceled'],
  });
  assert.deepEqual(
    withCanceled.groups.find((g) => g.column.id === 'canceled')?.jobs.map((j) => j.id),
    ['x']
  );
  assert.deepEqual(withCanceled.unplaced, []);
});

test('a status with no column is surfaced, never silently lost', () => {
  const { groups, unplaced } = groupBookingsForBoard([
    job({ id: 'weird', status: 'SOMETHING_NEW' }),
  ]);
  assert.deepEqual(groups.flatMap((g) => g.jobs), []);
  assert.deepEqual(unplaced.map((j) => j.id), ['weird']);
});

test('work to do is oldest first — the longest wait is the one to act on', () => {
  const { groups } = groupBookingsForBoard([
    job({ id: 'new', status: 'UNASSIGNED', createdAtIso: '2026-09-25T10:00:00.000Z' }),
    job({ id: 'old', status: 'UNASSIGNED', createdAtIso: '2026-09-21T10:00:00.000Z' }),
    job({ id: 'mid', status: 'UNASSIGNED', createdAtIso: '2026-09-23T10:00:00.000Z' }),
  ]);
  assert.deepEqual(groups[0].jobs.map((j) => j.id), ['old', 'mid', 'new']);
});

test('finished work is newest first', () => {
  const { groups } = groupBookingsForBoard([
    job({ id: 'old', status: 'COMPLETED', createdAtIso: '2026-09-21T10:00:00.000Z' }),
    job({ id: 'new', status: 'COMPLETED', createdAtIso: '2026-09-25T10:00:00.000Z' }),
  ]);
  const done = groups.find((g) => g.column.id === 'done')!;
  assert.deepEqual(done.jobs.map((j) => j.id), ['new', 'old']);
});

test('the done column caps, reports what it hid, and never caps live work', () => {
  const done = Array.from({ length: FINISHED_COLUMN_LIMIT + 7 }, (_, i) =>
    job({ id: `done-${i}`, status: 'COMPLETED', createdAtIso: `2026-09-${10 + (i % 18)}T10:00:00.000Z` })
  );
  const waiting = Array.from({ length: 40 }, (_, i) =>
    job({ id: `wait-${i}`, status: 'UNASSIGNED' })
  );

  const { groups } = groupBookingsForBoard([...done, ...waiting]);

  const doneGroup = groups.find((g) => g.column.id === 'done')!;
  assert.equal(doneGroup.jobs.length, FINISHED_COLUMN_LIMIT);
  assert.equal(doneGroup.total, FINISHED_COLUMN_LIMIT + 7);
  assert.equal(doneGroup.hidden, 7);

  // A job still needing a tech is never hidden behind a "+N more".
  const waitingGroup = groups.find((g) => g.column.id === 'needs_tech')!;
  assert.equal(waitingGroup.jobs.length, 40);
  assert.equal(waitingGroup.hidden, 0);
});

test('an unparseable date sorts as 0 instead of poisoning the comparator', () => {
  assert.equal(bookingSortTime({ id: 'a', status: 'X' }), 0);
  assert.equal(bookingSortTime({ id: 'a', status: 'X', dateCreated: 'next tuesday' }), 0);
  assert.equal(
    bookingSortTime({ id: 'a', status: 'X', createdAtIso: '2026-09-21T10:00:00.000Z' }),
    Date.parse('2026-09-21T10:00:00.000Z')
  );
  // The localised display string is the fallback, and it does parse.
  assert.ok(bookingSortTime({ id: 'a', status: 'X', dateCreated: '9/21/2026, 10:00:00 AM' }) > 0);

  // Sorting a column of undated jobs must not throw or reorder wildly.
  const { groups } = groupBookingsForBoard([
    { id: 'a', status: 'UNASSIGNED' },
    { id: 'b', status: 'UNASSIGNED' },
  ]);
  assert.deepEqual(groups[0].jobs.map((j) => j.id), ['a', 'b']);
});

const CLOCKED_IN = { id: 't1', name: 'Devon', onShiftSince: '2026-09-29T13:00:00.000Z' };
const CLOCKED_OUT = { id: 't2', name: 'Marcus', onShiftSince: null };

test('a tech with no live job is free when clocked in, off shift when not', () => {
  assert.equal(techBoardState(CLOCKED_IN, []).kind, 'free');
  assert.equal(techBoardState(CLOCKED_OUT, []).kind, 'off_shift');
});

test('a live job outranks the shift clock', () => {
  // Clocked out but standing on a driveway: the job is the truth.
  const state = techBoardState(CLOCKED_OUT, [
    job({ id: 'j1', status: 'ON_SITE', claimedBy: { id: 't2', name: 'Marcus' } }),
  ]);
  assert.equal(state.kind, 'on_job');
  assert.equal(state.activeJob?.id, 'j1');
});

test('on site beats en route when a tech somehow holds both', () => {
  const state = techBoardState(CLOCKED_IN, [
    job({ id: 'enroute', status: 'EN_ROUTE', claimedBy: { id: 't1', name: 'Devon' } }),
    job({ id: 'onsite', status: 'ON_SITE', claimedBy: { id: 't1', name: 'Devon' } }),
  ]);
  assert.equal(state.activeJob?.id, 'onsite');
  assert.equal(state.openJobs, 2);
});

test('finished and cancelled jobs do not keep a tech looking busy', () => {
  const state = techBoardState(CLOCKED_IN, [
    job({ id: 'a', status: 'COMPLETED', claimedBy: { id: 't1', name: 'Devon' } }),
    job({ id: 'b', status: 'CANCELED', claimedBy: { id: 't1', name: 'Devon' } }),
  ]);
  assert.equal(state.kind, 'free');
  assert.equal(state.openJobs, 0);
  assert.equal(state.activeJob, null);
});

test("another tech's jobs never count toward this one", () => {
  const state = techBoardState(CLOCKED_IN, [
    job({ id: 'theirs', status: 'ON_SITE', claimedBy: { id: 'someone-else', name: 'Chris' } }),
    job({ id: 'unclaimed', status: 'UNASSIGNED' }),
  ]);
  assert.equal(state.kind, 'free');
  assert.equal(state.openJobs, 0);
});

test('techBoardStates keeps the order it was given', () => {
  const states = techBoardStates([CLOCKED_IN, CLOCKED_OUT], []);
  assert.deepEqual(states.map((s) => s.tech.id), ['t1', 't2']);
  assert.deepEqual(states.map((s) => s.kind), ['free', 'off_shift']);
});

test('the phone falls back when its chosen column stops existing', () => {
  const withCanceled = groupBookingsForBoard([], {
    columns: [...LIVE_COLUMN_IDS, 'canceled'],
  }).groups;
  const liveOnly = groupBookingsForBoard([]).groups;

  // While canceled is on the board, it stays selected.
  assert.equal(resolveActiveColumn(withCanceled, 'canceled'), 'canceled');
  // Switch it off and the phone must not be left showing nothing.
  assert.equal(resolveActiveColumn(liveOnly, 'canceled'), 'needs_tech');
  // An unaffected selection is untouched.
  assert.equal(resolveActiveColumn(liveOnly, 'on_site'), 'on_site');
  // No columns at all still yields something usable.
  assert.equal(resolveActiveColumn([], 'on_site'), 'needs_tech');
});
