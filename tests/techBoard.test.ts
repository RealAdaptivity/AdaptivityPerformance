import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobStage, myActiveJobs, myDoneJobs, openJobs, townOf, whenLabel, type BoardJob } from '../src/services/techBoard.ts';

const job = (over: Partial<BoardJob> & { id: string }): BoardJob => ({
  status: 'UNASSIGNED',
  mechanicId: null,
  preferredDate: null,
  preferredTimeWindow: null,
  createdAt: '2026-09-01T00:00:00Z',
  ...over,
});

test('open jobs: ASAP first, then by day and window, then oldest request', () => {
  const list = openJobs([
    job({ id: 'thu-pm', preferredDate: '2026-10-01', preferredTimeWindow: 'Afternoon (12 PM - 4 PM)' }),
    job({ id: 'nodate', createdAt: '2026-08-01T00:00:00Z' }),
    job({ id: 'thu-am', preferredDate: '2026-10-01', preferredTimeWindow: 'Morning (8 AM - 12 PM)' }),
    job({ id: 'asap', preferredDate: '2026-10-03', preferredTimeWindow: 'Emergency ASAP' }),
    job({ id: 'taken', mechanicId: 'x', status: 'EN_ROUTE' }),
  ]);
  assert.deepEqual(list.map((j) => j.id), ['asap', 'thu-am', 'thu-pm', 'nodate']);
});

test('my active jobs put the one on site first and ignore other techs', () => {
  const list = myActiveJobs(
    [
      job({ id: 'route', mechanicId: 'me', status: 'EN_ROUTE', preferredDate: '2026-09-30' }),
      job({ id: 'site', mechanicId: 'me', status: 'ON_SITE', preferredDate: '2026-10-02' }),
      job({ id: 'theirs', mechanicId: 'you', status: 'ON_SITE' }),
      job({ id: 'done', mechanicId: 'me', status: 'COMPLETED' }),
    ],
    'me'
  );
  assert.deepEqual(list.map((j) => j.id), ['site', 'route']);
  assert.deepEqual(myActiveJobs([job({ id: 'a', mechanicId: 'me', status: 'EN_ROUTE' })], null), []);
});

test('done jobs are mine and newest first', () => {
  const list = myDoneJobs(
    [
      job({ id: 'old', mechanicId: 'me', status: 'COMPLETED', preferredDate: '2026-09-01' }),
      job({ id: 'new', mechanicId: 'me', status: 'COMPLETED', preferredDate: '2026-09-29' }),
      job({ id: 'other', mechanicId: 'you', status: 'COMPLETED', preferredDate: '2026-09-30' }),
    ],
    'me'
  );
  assert.deepEqual(list.map((j) => j.id), ['new', 'old']);
});

test('when labels read the way a tech says them', () => {
  const today = '2026-09-30';
  assert.equal(whenLabel('2026-09-30', 'Morning (8 AM - 12 PM)', today), 'Today · Morning');
  assert.equal(whenLabel('2026-10-01', 'Afternoon (12 PM - 4 PM)', today), 'Tomorrow · Afternoon');
  assert.equal(whenLabel('2026-10-02', 'Evening (4 PM - 7 PM)', today), 'Fri, Oct 2 · Evening');
  assert.equal(whenLabel('2026-09-28', null, today), 'Past due · Mon, Sep 28');
  assert.equal(whenLabel('2026-10-02', 'Emergency ASAP', today), 'ASAP');
  assert.equal(whenLabel(null, null, today), 'No time given');
  // Month rollover for "tomorrow".
  assert.equal(whenLabel('2026-11-01', null, '2026-10-31'), 'Tomorrow');
});

test('town from the booking address', () => {
  assert.equal(townOf('1234 Canyon Falls Dr, Northlake, TX 76226'), 'Northlake');
  assert.equal(townOf('garbage'), '');
});

test('stages', () => {
  assert.equal(jobStage('EN_ROUTE'), 1);
  assert.equal(jobStage('ON_SITE'), 2);
  assert.equal(jobStage('COMPLETED'), 3);
});
