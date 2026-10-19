import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import {
  HOMEPAGE_JOBS_SHOWN,
  WORK_JOBS,
  homepageJobs,
  type WorkJob,
  WORK_PHOTOS,
  WORK_PHOTO_WIDTHS,
  workPhotoSrc,
  workPhotoSrcSet,
} from '../src/site/workPhotos.ts';

test('every work photo has both sizes on disk, small enough for a phone', () => {
  for (const p of WORK_PHOTOS) {
    for (const w of WORK_PHOTO_WIDTHS) {
      const file = `public/work/${p.slug}-${w}.webp`;
      assert.ok(existsSync(file), `${file} is missing`);
      const kb = statSync(file).size / 1024;
      assert.ok(kb < (w === 480 ? 120 : 300), `${file} is ${Math.round(kb)} KB`);
    }
  }
});

test('the photos carry no camera or location data', () => {
  for (const p of WORK_PHOTOS) {
    for (const w of WORK_PHOTO_WIDTHS) {
      const bytes = readFileSync(`public/work/${p.slug}-${w}.webp`);
      // WebP keeps metadata in EXIF and XMP chunks.
      for (const chunk of ['EXIF', 'XMP ']) {
        assert.equal(bytes.indexOf(chunk, 12, 'latin1'), -1, `${p.slug}-${w} has a ${chunk.trim()} chunk`);
      }
    }
  }
});

test('every photo is described for screen readers and captioned', () => {
  const slugs = new Set<string>();
  for (const p of WORK_PHOTOS) {
    assert.ok(!slugs.has(p.slug), `${p.slug} listed twice`);
    slugs.add(p.slug);
    assert.ok(p.alt.trim().length >= 30, `${p.slug} alt text is too short`);
    assert.ok(p.caption.trim().length > 0, `${p.slug} has no caption`);
  }
});

test('every job has a title, a summary and at least one photo', () => {
  const jobs = new Set<string>();
  for (const j of WORK_JOBS) {
    assert.ok(!jobs.has(j.slug), `${j.slug} listed twice`);
    jobs.add(j.slug);
    assert.ok(j.title.trim() && j.summary.trim(), `${j.slug} needs a title and a summary`);
    assert.ok(j.photos.length > 0, `${j.slug} has no photos`);
  }
  assert.equal(WORK_PHOTOS.length, WORK_JOBS.reduce((n, j) => n + j.photos.length, 0));
});

test('the homepage shows the newest jobs and keeps the pinned one, in list order', () => {
  const job = (slug: string, pinnedToHomepage = false): WorkJob => ({
    slug, title: slug, summary: slug, photos: [{ slug, alt: slug, caption: slug }], pinnedToHomepage,
  });
  const jobs = ['f', 'e', 'd', 'c', 'b'].map((s) => job(s)).concat(job('team', true));
  assert.deepEqual(homepageJobs(jobs, 5).map((j) => j.slug), ['f', 'e', 'd', 'c', 'team']);
  assert.deepEqual(homepageJobs(jobs.slice(0, 3), 5).map((j) => j.slug), ['f', 'e', 'd']);
  assert.deepEqual(homepageJobs([job('a', true), job('b')], 1).map((j) => j.slug), ['a']);

  const shown = homepageJobs();
  assert.ok(shown.length <= HOMEPAGE_JOBS_SHOWN);
  assert.ok(shown.some((j) => j.slug === 'engine-front-teardown'), 'the team photo stays on the homepage');
  assert.equal(shown[0].slug, WORK_JOBS[0].slug, 'the newest job leads');
});

test('photo paths follow the base path', () => {
  assert.equal(workPhotoSrc('timing-chains', 480), '/work/timing-chains-480.webp');
  assert.equal(workPhotoSrc('timing-chains', 960, '/preview'), '/preview/work/timing-chains-960.webp');
  assert.equal(
    workPhotoSrcSet('timing-chains'),
    '/work/timing-chains-480.webp 480w, /work/timing-chains-960.webp 960w'
  );
});
