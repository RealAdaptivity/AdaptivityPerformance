import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import {
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

test('photo paths follow the base path', () => {
  assert.equal(workPhotoSrc('timing-chains', 480), '/work/timing-chains-480.webp');
  assert.equal(workPhotoSrc('timing-chains', 960, '/preview'), '/preview/work/timing-chains-960.webp');
  assert.equal(
    workPhotoSrcSet('timing-chains'),
    '/work/timing-chains-480.webp 480w, /work/timing-chains-960.webp 960w'
  );
});
