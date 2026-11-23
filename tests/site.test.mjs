import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Window } from 'happy-dom';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildScript = path.join(root, 'build.py');

const lessons = JSON.parse(await readFile(path.join(root, 'lessons.json'), 'utf8'));
const course = JSON.parse(await readFile(path.join(root, 'course.json'), 'utf8'));

function extractMathDelimiters(source) {
  const math = [];
  const isActiveDollar = (index) => {
    let backslashes = 0;
    while (source[index - backslashes - 1] === '\\') backslashes++;
    return backslashes % 2 === 0;
  };
  for (let index = 0; index < source.length;) {
    const opener = source.startsWith('\\(', index) ? '\\('
      : source.startsWith('\\[', index) ? '\\['
        : source[index] === '$' && isActiveDollar(index) ? (source.startsWith('$$', index) ? '$$' : '$')
          : null;
    if (!opener) {
      index++;
      continue;
    }
    const close = opener === '\\(' ? '\\)' : opener === '\\[' ? '\\]' : opener;
    let end = index + opener.length;
    while ((end = source.indexOf(close, end)) !== -1) {
      if (!opener.startsWith('$') || (
        isActiveDollar(end) &&
        (opener === '$$' || (source[end - 1] !== '$' && source[end + 1] !== '$'))
      )) break;
      end += close.length;
    }
    if (end === -1) {
      index += opener.length;
      continue;
    }
    math.push({ text: source.slice(index + opener.length, end), delimiter: opener });
    index = end + close.length;
  }
  return math;
}

async function buildIntoTempDirectory(t) {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'spr-dist-'));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  await execFileAsync('python3', [buildScript, outputDir]);
  return outputDir;
}

async function copySourceIntoTempDirectory(t) {
  const sourceDir = await mkdtemp(path.join(os.tmpdir(), 'spr-src-'));
  t.after(() => rm(sourceDir, { recursive: true, force: true }));
  for (const name of ['build.py', 'index.html', 'lessons.json', 'course.json', 'templates', 'lessons', 'assets']) {
    await cp(path.join(root, name), path.join(sourceDir, name), { recursive: true });
  }
  return sourceDir;
}

test('builds a flat dist with the فهرست, all lesson pages, assets, and manifests', async (t) => {
  const outputDir = await buildIntoTempDirectory(t);

  const files = await readdir(outputDir);
  const html = files.filter((file) => file.endsWith('.html')).sort();
  assert.deepEqual(html, ['index.html', ...lessons.map((lesson) => lesson.file)].sort());
  for (const name of ['course.json', 'lessons.json']) {
    assert.ok(files.includes(name), `missing ${name} in dist root`);
  }
  for (const relativePath of ['assets/css/style.css', 'assets/js/main.js', 'assets/js/index.js']) {
    await assert.ok(readFile(path.join(outputDir, ...relativePath.split('/')), 'utf8'), relativePath);
  }
  for (const lesson of lessons) {
    await assert.ok(readFile(path.join(outputDir, ...lesson.script.split('/')), 'utf8'), lesson.script);
  }
});

test('source templates and built assets use local Vazirmatn fonts', async (t) => {
  for (const source of ['index.html', 'templates/layout.html']) {
    const html = await readFile(path.join(root, source), 'utf8');
    assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
  }

  const outputDir = await buildIntoTempDirectory(t);
  const stylesheet = await readFile(path.join(outputDir, 'assets', 'css', 'style.css'), 'utf8');
  const fontUrls = [...stylesheet.matchAll(/url\(["']?\.\.\/fonts\/([^"')]+\.woff2)["']?\)/g)].map((match) => match[1]);
  assert.ok(fontUrls.length > 0, 'stylesheet has no local WOFF2 font URL');
  for (const font of fontUrls) {
    assert.ok((await stat(path.join(outputDir, 'assets', 'fonts', font))).isFile(), `missing ${font}`);
  }
});

test('generated lessons use only local MathJax resources', async (t) => {
  const outputDir = await buildIntoTempDirectory(t);
  const mathJaxScript = 'assets/mathjax/tex-mml-chtml.js';
  const fontDirectory = path.join(outputDir, 'assets', 'mathjax', 'output', 'chtml', 'fonts', 'woff-v2');

  const bundle = await readFile(path.join(outputDir, ...mathJaxScript.split('/')), 'utf8');
  assert.match(bundle, /Package\.resolvePath\("output\/chtml\/fonts\/woff-v2",!1\)/);
  assert.ok((await stat(path.join(outputDir, ...mathJaxScript.split('/')))).isFile(), `missing ${mathJaxScript}`);
  const fontUrls = [...bundle.matchAll(/\/MathJax_([A-Za-z0-9-]+\.woff)/g)].map((match) => `MathJax_${match[1]}`);
  assert.ok(fontUrls.length > 0, 'MathJax bundle has no configured font files');
  for (const font of new Set(fontUrls)) {
    assert.ok((await stat(path.join(fontDirectory, font))).isFile(), `missing ${font}`);
  }

  for (const lesson of lessons) {
    const page = await readFile(path.join(outputDir, lesson.file), 'utf8');
    assert.ok(page.includes(`src="${mathJaxScript}"`), `${lesson.file} misses local MathJax`);
    assert.doesNotMatch(page, /(?:https?:)?\/\//, `${lesson.file} includes a remote rendered-resource URL`);
  }
});

test('فهرست links to every lesson and every lesson page links back to the فهرست', async (t) => {
  const outputDir = await buildIntoTempDirectory(t);

  const index = await readFile(path.join(outputDir, 'index.html'), 'utf8');
  for (const lesson of lessons) {
    assert.ok(index.includes(`href="${lesson.file}"`), `فهرست does not link to ${lesson.file}`);
  }

  for (const [position, lesson] of lessons.entries()) {
    const page = await readFile(path.join(outputDir, lesson.file), 'utf8');
    assert.ok(page.includes(`<title>${lesson.title}</title>`), lesson.file);
    assert.ok(page.includes(`src="${lesson.script}"`), `${lesson.file} misses its script tag`);
    assert.ok(page.includes('href="index.html"'), `${lesson.file} misses the فهرست link`);
    const previous = lessons[position - 1];
    if (previous) assert.ok(page.includes(`href="${previous.file}"`), `${lesson.file} misses the previous link`);
    const following = lessons[position + 1];
    if (following) assert.ok(page.includes(`href="${following.file}"`), `${lesson.file} misses the next link`);
  }
});

test('lessons have bottom tab navigation above the lesson navigation', async (t) => {
  const outputDir = await buildIntoTempDirectory(t);
  const js = await readFile(path.join(outputDir, 'assets', 'js', 'main.js'), 'utf8');
  const css = await readFile(path.join(outputDir, 'assets', 'css', 'style.css'), 'utf8');

  assert.ok(js.includes("'بخش قبلی'") && js.includes("'بخش بعدی'"), 'main.js misses the بخش قبلی/بخش بعدی buttons');
  assert.ok(js.includes("nv.before(tn)"), 'tab navigation is not inserted above the lesson navigation');
  for (const needle of ['.tab-nav', '.tab-nav .btn:disabled', '.tabs{scroll-margin-top']) {
    assert.ok(css.includes(needle), `style.css misses ${needle}`);
  }
});

test('built lesson runs the bottom tab navigation in a DOM', async (t) => {
  const outputDir = await buildIntoTempDirectory(t);
  const { Window } = await import('happy-dom');
  const js = await readFile(path.join(outputDir, 'assets', 'js', 'main.js'), 'utf8');
  const load = async (file) => {
    const window = new Window({
      url: `http://localhost/${file}`,
      settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
    });
    window.document.write(await readFile(path.join(outputDir, file), 'utf8'));
    window.Element.prototype.scrollIntoView = () => {};
    window.eval(js);
    return window;
  };

  const window = await load(lessons[0].file);
  const doc = window.document;
  const nav = doc.querySelector('.tab-nav');
  const [prev, next] = nav.querySelectorAll('button');
  const selected = () => [...doc.querySelectorAll('.tab')].findIndex((x) => x.getAttribute('aria-selected') === 'true');
  const tabCount = doc.querySelectorAll('.tab').length;

  assert.ok(nav.nextElementSibling === doc.querySelector('.lesson-nav'), 'tab nav must sit directly above the lesson nav');
  assert.deepEqual([prev.textContent, next.textContent], ['بخش قبلی', 'بخش بعدی']);
  assert.equal(selected(), 0);
  assert.equal(prev.disabled, true, 'prev must be disabled on the first tab');
  assert.equal(next.disabled, false);

  next.click();
  assert.equal(selected(), 1);
  assert.equal(doc.querySelector('.panel.active').id, 'p2');
  assert.equal(prev.disabled, false);

  for (let i = 1; i < tabCount - 1; i++) next.click();
  assert.equal(selected(), tabCount - 1);
  assert.equal(next.disabled, true, 'next must be disabled on the last tab');

  prev.click();
  assert.equal(selected(), tabCount - 2);
  assert.equal(next.disabled, false);

  const indexWindow = await load('index.html');
  assert.equal(indexWindow.document.querySelector('.tab-nav'), null, 'index must not get a tab nav');
});

test('offline package has a flat static-site layout', async (t) => {
  const outputDir = await buildIntoTempDirectory(t);
  const archiveDir = await mkdtemp(path.join(os.tmpdir(), 'spr-zip-'));
  t.after(() => rm(archiveDir, { recursive: true, force: true }));
  const archive = path.join(archiveDir, 'course.zip');
  await execFileAsync('python3', [path.join(root, 'scripts', 'create-zip.py'), outputDir, archive]);
  const { stdout } = await execFileAsync('python3', ['-c', 'import sys, zipfile; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))', archive]);
  const entries = stdout.trim().split('\n');

  for (const file of ['index.html', ...lessons.map((lesson) => lesson.file), 'assets/css/style.css', 'assets/fonts/Vazirmatn-Regular.woff2', 'assets/mathjax/tex-mml-chtml.js', 'assets/mathjax/output/chtml/fonts/woff-v2/MathJax_Main-Regular.woff']) {
    assert.ok(entries.includes(file), `missing ${file}`);
  }
  assert.ok(entries.every((entry) => !entry.startsWith('dist/')), 'ZIP entries must not have a dist/ prefix');
  for (const lesson of lessons) {
    const page = await execFileAsync('python3', ['-c', 'import sys, zipfile; print(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]).decode())', archive, lesson.file]);
    assert.doesNotMatch(page.stdout, /(?:https?:)?\/\//, `${lesson.file} includes a remote rendered-resource URL`);
  }
});

test('every course.json lecture has a matching lesson page', () => {
  const slugs = lessons.map((lesson) => path.parse(lesson.file).name);
  for (const lecture of course.lectures) {
    const slug = slugs.find((candidate) => candidate.endsWith(lecture.id));
    assert.ok(slug, `no lesson page matches lecture ${lecture.id}`);
  }
});

test('MathJax dollar delimiters ignore escaped dollars and allow even-backslash dollars', () => {
  const source = String.raw`\$متن فارسی $a+1$ and \\$b+1$ and $$c+2$$`;
  const math = extractMathDelimiters(source).map(({ text }) => text);

  assert.deepEqual(math, ['a+1', 'b+1', 'c+2']);
});

test('authored lessons contain no Persian letters inside MathJax delimiters', async () => {
  const lessonFiles = (await readdir(path.join(root, 'lessons')))
    .filter((file) => file.endsWith('.html'));
  const persianLetters = /[\u0621-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]/;

  for (const file of lessonFiles) {
    const html = await readFile(path.join(root, 'lessons', file), 'utf8');
    const window = new Window();
    window.document.body.innerHTML = html;
    for (const formula of window.document.querySelectorAll('.formula')) {
      assert.doesNotMatch(formula.textContent, persianLetters, `${file} contains Persian prose in .formula`);
    }
    window.happyDOM.abort();
    for (const { text, delimiter } of extractMathDelimiters(html)) {
      assert.doesNotMatch(text, persianLetters, `${file} contains Persian text in math: ${delimiter}${text}${delimiter}`);
    }
  }
});

test('requested interactive plot legends and readouts use the intended directions and layout', async () => {
  const source = async (relativePath) => readFile(path.join(root, relativePath), 'utf8');
  const stylesheet = await source('assets/css/style.css');
  assert.match(stylesheet, /@media\(max-width:720px\).*?\.grid,\.grid3\{grid-template-columns:1fr\}/);
  const lesson3 = new Window();
  lesson3.document.body.innerHTML = await source('lessons/03-conditional-bayes-networks.html');
  const lesson3Cards = lesson3.document.querySelector('#b-post').parentElement.parentElement;
  assert.equal(lesson3Cards.classList.contains('grid3'), true, 'lesson 3 readouts should share one row');

  for (const [file, chartId, maxHeight] of [
    ['lessons/02-ml-map-estimation.html', 'l2chart', 360],
    ['lessons/05-hypothesis-testing-pvalue.html', 'l5-lab', 360],
    ['lessons/07-gaussian-covariance.html', 'l7-lab', 340],
    ['lessons/08-mahalanobis-distance.html', 'l8-lab', 360],
  ]) {
    const doc = new Window();
    doc.document.body.innerHTML = await source(file);
    const svg = doc.document.getElementById(chartId);
    assert.ok(Number(svg.getAttribute('viewBox').split(' ')[3]) <= maxHeight, `${file} chart should be shorter`);
    if (chartId === 'l7-lab') {
      assert.ok(svg.previousElementSibling?.classList.contains('grid3') === false);
      assert.equal(svg.nextElementSibling?.classList.contains('grid3'), true, 'lesson 7 readouts should be below plot');
    }
    if (chartId === 'l8-lab') {
      assert.equal(svg.previousElementSibling?.classList.contains('grid3'), false);
      assert.equal(svg.nextElementSibling?.classList.contains('grid3'), true, 'lesson 8 readouts should be below plot');
    }
    doc.happyDOM.abort();
  }
  lesson3.happyDOM.abort();

  for (const [file, fragments] of [
    ['assets/js/lessons/02-ml-map-estimation.js', ['درست‌نمایی', 'پسین']],
    ['assets/js/lessons/06-threshold-roc.js', ['مثبت‌ها (بیمار)', 'منفی‌ها (سالم)']],
    ['assets/js/lessons/08-mahalanobis-distance.js', ['نقاط داده', 'بیضی‌های ۱σ/۲σ/۳σ', 'نقطهٔ کوئری']],
    ['assets/js/lessons/09-generative-classifiers.js', ['کلاس الف', 'کلاس ب']],
  ]) {
    const js = await source(file);
    for (const legend of fragments) {
      const index = js.indexOf(legend);
      assert.notEqual(index, -1, `${file} legend ${legend} should exist`);
      const textTag = js.lastIndexOf('<text', index);
      assert.ok(js.slice(textTag, index).includes('direction="ltr"'), `${file} legend ${legend} should be LTR`);
    }
  }
});

test('lesson 7 scatter points and ellipses stay inside the plot at slider extremes', async () => {
  const window = new Window();
  window.document.body.innerHTML = await readFile(path.join(root, 'lessons/07-gaussian-covariance.html'), 'utf8');
  window.eval(await readFile(path.join(root, 'assets/js/lessons/07-gaussian-covariance.js'), 'utf8'));
  const svg = window.document.getElementById('l7-lab');
  const [width, height] = svg.getAttribute('viewBox').split(' ').slice(2).map(Number);

  for (const sx of ['0.5', '2']) {
    for (const sy of ['0.5', '2']) {
      for (const rho of ['-0.95', '0.95']) {
        for (const [id, value] of [['l7-sx', sx], ['l7-sy', sy], ['l7-rho', rho]]) {
          const control = window.document.getElementById(id);
          control.value = value;
          control.dispatchEvent(new window.Event('input'));
        }
        for (const point of svg.querySelectorAll('circle')) {
          const x = Number(point.getAttribute('cx')), y = Number(point.getAttribute('cy')), r = Number(point.getAttribute('r'));
          assert.ok(x - r >= 0 && x + r <= width && y - r >= 0 && y + r <= height, `scatter point clipped at sx=${sx}, sy=${sy}, rho=${rho}`);
        }
        for (const ellipse of svg.querySelectorAll('ellipse')) {
          const rx = Number(ellipse.getAttribute('rx')), ry = Number(ellipse.getAttribute('ry'));
          const [angle] = ellipse.getAttribute('transform').match(/rotate\(([-\d.]+)/).slice(1).map(Number);
          const radians = angle * Math.PI / 180;
          const halfWidth = Math.hypot(rx * Math.cos(radians), ry * Math.sin(radians));
          const halfHeight = Math.hypot(rx * Math.sin(radians), ry * Math.cos(radians));
          const cx = Number(ellipse.getAttribute('cx')), cy = Number(ellipse.getAttribute('cy'));
          assert.ok(cx - halfWidth >= 0 && cx + halfWidth <= width && cy - halfHeight >= 0 && cy + halfHeight <= height, `ellipse clipped at sx=${sx}, sy=${sy}, rho=${rho}`);
        }
      }
    }
  }
  window.happyDOM.abort();
});

test('lesson 7 legend is RTL and lesson 6 ROC plot is shorter with square axes', async () => {
  const window = new Window();
  window.document.body.innerHTML = await readFile(path.join(root, 'lessons/07-gaussian-covariance.html'), 'utf8');
  window.eval(await readFile(path.join(root, 'assets/js/lessons/07-gaussian-covariance.js'), 'utf8'));
  const legendTexts = ['نمونه‌ها', 'بیضی ۱σ', 'بیضی ۲σ'];
  for (const [index, label] of legendTexts.entries()) {
    const text = [...window.document.querySelectorAll('#l7-lab text')].find((item) => item.textContent === label);
    assert.ok(text, `missing lesson 7 legend ${label}`);
    assert.equal(text.getAttribute('direction'), 'rtl');
    assert.equal(text.getAttribute('text-anchor'), 'end');
    const textX = Number(text.getAttribute('x'));
    const symbols = window.document.querySelectorAll('#l7-lab circle, #l7-lab line');
    const symbol = index === 0
      ? [...symbols].find((item) => item.tagName === 'circle' && item.getAttribute('cy') === '27')
      : [...symbols].find((item) => item.tagName === 'line' && item.getAttribute('y1') === String(48 + (index - 1) * 18));
    assert.ok(symbol, `missing symbol for lesson 7 legend ${label}`);
    const symbolLeft = symbol.tagName === 'circle'
      ? Number(symbol.getAttribute('cx')) - Number(symbol.getAttribute('r'))
      : Math.min(Number(symbol.getAttribute('x1')), Number(symbol.getAttribute('x2')));
    assert.ok(symbolLeft > textX, `${label} symbol should be right of its RTL label`);
    assert.ok(symbolLeft >= 474, `${label} symbol should stay inside the legend box`);
    assert.ok(symbol.tagName === 'circle'
      ? Number(symbol.getAttribute('cx')) + Number(symbol.getAttribute('r')) <= 630
      : Math.max(Number(symbol.getAttribute('x1')), Number(symbol.getAttribute('x2'))) <= 630,
    `${label} symbol should stay inside the legend box`);
  }
  window.happyDOM.abort();

  const rocWindow = new Window();
  rocWindow.document.body.innerHTML = await readFile(path.join(root, 'lessons/06-threshold-roc.html'), 'utf8');
  rocWindow.eval(await readFile(path.join(root, 'assets/js/lessons/06-threshold-roc.js'), 'utf8'));
  const roc = rocWindow.document.getElementById('l6-roc');
  assert.deepEqual(roc.getAttribute('viewBox').split(' ').map(Number), [0, 0, 420, 336]);
  const [horizontal, vertical] = roc.querySelectorAll('line');
  const plotWidth = Number(horizontal.getAttribute('x2')) - Number(horizontal.getAttribute('x1'));
  const plotHeight = Number(vertical.getAttribute('y2')) - Number(vertical.getAttribute('y1'));
  assert.deepEqual(
    [horizontal.getAttribute('x1'), horizontal.getAttribute('x2'), horizontal.getAttribute('y1'), horizontal.getAttribute('y2')],
    ['72', '348', '292', '292'],
  );
  assert.deepEqual(
    [vertical.getAttribute('x1'), vertical.getAttribute('x2'), vertical.getAttribute('y1'), vertical.getAttribute('y2')],
    ['72', '72', '16', '292'],
  );
  assert.equal(plotWidth, 276);
  assert.equal(plotHeight, 276);
  rocWindow.happyDOM.abort();
});

test('build fails when a lesson content fragment is missing', async (t) => {
  const sourceDir = await copySourceIntoTempDirectory(t);
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'spr-dist-'));
  t.after(() => rm(outputDir, { recursive: true, force: true }));

  const brokenLesson = lessons[0];
  await rm(path.join(sourceDir, brokenLesson.content));

  await assert.rejects(execFileAsync('python3', [path.join(sourceDir, 'build.py'), outputDir]), /missing content file/);
});
