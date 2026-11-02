import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../scripts/build-site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const lessonPages = {
  '01-bayesian-foundations.html': 'مبانی استدلال بیزی',
  '02-ml-map-estimation.html': 'تخمین ML و MAP',
  '03-conditional-bayes-networks.html': 'قانون بیز و شبکه‌های بیزی',
  '04-bayesian-decision-costs.html': 'تصمیم‌گیری بیزی',
  '05-hypothesis-testing-pvalue.html': 'آزمون فرض و p-value',
  '06-threshold-roc.html': 'آستانه و ROC',
  '07-gaussian-covariance.html': 'گاوسی و کوواریانس',
  '08-mahalanobis-distance.html': 'فاصلهٔ ماهالانوبیس',
  '09-generative-classifiers.html': 'طبقه‌بند مولد، LDA و QDA',
  '10-course-project-review.html': 'مینی‌پروژه و مرور',
};

async function tempDirectory() {
  return mkdtemp(path.join(os.tmpdir(), 'spr-site-'));
}

test('generates a flat dist with the authored index and all lesson pages', async (t) => {
  const outputDir = await tempDirectory();
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  await generate({ sourceDir: root, outputDir });

  const index = await readFile(path.join(outputDir, 'index.html'), 'utf8');
  for (const [file, title] of Object.entries(lessonPages)) {
    assert.match(index, new RegExp(`href="${file}"`));
    assert.ok(index.includes(title), file);
  }

  const files = await readdir(outputDir);
  assert.deepEqual(files.filter((file) => file.endsWith('.html')).sort(), ['index.html', ...Object.keys(lessonPages)].sort());
  assert.ok(files.includes('course.json'));
  assert.ok(!files.includes('README.md'));
  assert.ok(!files.includes('contents'));
  assert.doesNotMatch(index, /href="contents\//);
});

test('every lesson page links back to the فهرست', async () => {
  for (const file of Object.keys(lessonPages)) {
    const html = await readFile(path.join(root, 'contents', file), 'utf8');
    assert.match(html, /href="index\.html"/, file);
  }
});

test('rejects an invalid manifest', async (t) => {
  const sourceDir = await tempDirectory();
  const outputDir = await tempDirectory();
  t.after(() => Promise.all([rm(sourceDir, { recursive: true, force: true }), rm(outputDir, { recursive: true, force: true })]));
  await cp(path.join(root, 'contents'), path.join(sourceDir, 'contents'), { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(root, 'course.json'), 'utf8'));
  manifest.schemaVersion = '0.0.0';
  await cp(path.join(root, 'course.json'), path.join(sourceDir, 'course.json'));
  await writeFile(path.join(sourceDir, 'course.json'), JSON.stringify(manifest));

  await assert.rejects(generate({ sourceDir, outputDir }), /invalid manifest/);
});

test('rejects a lecture without a matching lesson page', async (t) => {
  const sourceDir = await tempDirectory();
  const outputDir = await tempDirectory();
  t.after(() => Promise.all([rm(sourceDir, { recursive: true, force: true }), rm(outputDir, { recursive: true, force: true })]));
  await cp(path.join(root, 'contents'), path.join(sourceDir, 'contents'), { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(root, 'course.json'), 'utf8'));
  manifest.lectures[0].id = 'renamed-lecture';
  await writeFile(path.join(sourceDir, 'course.json'), JSON.stringify(manifest));

  await assert.rejects(generate({ sourceDir, outputDir }), /lesson page missing for lecture renamed-lecture/);
});
