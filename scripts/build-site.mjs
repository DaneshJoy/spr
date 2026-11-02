import Ajv from 'ajv';
import { cp, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// فهرستِ نوشته‌شده (contents/index.html) خودِ صفحهٔ خانهٔ سایت است؛ صفحهٔ خانه تولید نمی‌شود.
const lessonPages = {
  'bayesian-foundations': '01-bayesian-foundations.html',
  'ml-map-estimation': '02-ml-map-estimation.html',
  'conditional-bayes-networks': '03-conditional-bayes-networks.html',
  'bayesian-decision-costs': '04-bayesian-decision-costs.html',
  'hypothesis-testing-pvalue': '05-hypothesis-testing-pvalue.html',
  'threshold-roc': '06-threshold-roc.html',
  'gaussian-covariance': '07-gaussian-covariance.html',
  'mahalanobis-distance': '08-mahalanobis-distance.html',
  'generative-classifiers': '09-generative-classifiers.html',
  'course-project-review': '10-course-project-review.html',
};

async function validateManifest(manifest) {
  const schema = JSON.parse(await readFile(path.join(root, 'schemas/course-manifest.schema.json'), 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  ajv.addFormat('bcp47', /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i);
  ajv.addFormat('iso-date', (value) => /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value) && !Number.isNaN(Date.parse(value)));
  const validate = ajv.compile(schema);
  if (!validate(manifest)) throw new Error(`invalid manifest: ${ajv.errorsText(validate.errors)}`);
}

export async function generate({ sourceDir = root, outputDir = path.join(root, 'dist') } = {}) {
  const manifest = JSON.parse(await readFile(path.join(sourceDir, 'course.json'), 'utf8'));
  await validateManifest(manifest);
  const lectureIds = new Set(manifest.lectures.map((lecture) => lecture.id));
  for (const lecture of manifest.lectures) if (!Object.hasOwn(lessonPages, lecture.id)) throw new Error(`lesson page missing for lecture ${lecture.id}`);
  for (const id of Object.keys(lessonPages)) if (!lectureIds.has(id)) throw new Error(`lesson page ${id} has no matching lecture`);
  const pages = Object.values(lessonPages);
  await Promise.all(pages.map(async (file) => readFile(path.join(sourceDir, 'contents', file))));
  // همهٔ صفحه‌ها هم‌سطح در dist/ کپی می‌شوند تا پیوند نسبی میان درس‌ها و فهرست (href="NN-….html" و href="index.html") دست‌نخورده بماند.
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const htmlFiles = (await readdir(path.join(sourceDir, 'contents'))).filter((file) => file.endsWith('.html'));
  await Promise.all([
    ...htmlFiles.map((file) => cp(path.join(sourceDir, 'contents', file), path.join(outputDir, file))),
    cp(path.join(sourceDir, 'course.json'), path.join(outputDir, 'course.json')),
  ]);
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const validateOnly = process.argv.includes('--validate');
  const outputDir = validateOnly ? await mkdtemp(path.join(tmpdir(), 'spr-site-')) : path.join(root, 'dist');
  try {
    await generate({ outputDir });
    console.log(`site generated: ${validateOnly ? 'validation passed' : outputDir}`);
  } finally {
    if (validateOnly) await rm(outputDir, { recursive: true, force: true });
  }
}
