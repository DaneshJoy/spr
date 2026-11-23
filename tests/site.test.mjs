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

test('build fails when a lesson content fragment is missing', async (t) => {
  const sourceDir = await copySourceIntoTempDirectory(t);
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'spr-dist-'));
  t.after(() => rm(outputDir, { recursive: true, force: true }));

  const brokenLesson = lessons[0];
  await rm(path.join(sourceDir, brokenLesson.content));

  await assert.rejects(execFileAsync('python3', [path.join(sourceDir, 'build.py'), outputDir]), /missing content file/);
});
