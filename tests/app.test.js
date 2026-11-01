import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  adjustFontScale,
  calculateBatteryProgress,
  calculateResults,
  createProgressBackup,
  createQuestionReportLink,
  createSimulationQuestionPool,
  formatTime,
  getAnswerForShortcut,
  normalizePreferences,
  shuffle,
  validateProgressBackup
} from "../app.js";

test("calculateResults counts correct, incorrect and unanswered questions", () => {
  const questions = [
    { correctAnswer: "a" },
    { correctAnswer: "b" },
    { correctAnswer: "d" },
    { correctAnswer: "c" }
  ];

  assert.deepEqual(calculateResults(questions, { 0: "A", 1: "d", 3: "c" }), {
    correct: 2,
    incorrect: 1,
    unanswered: 1,
    ungraded: 0,
    total: 4
  });
});

test("questions without an answer key are reported separately", () => {
  assert.deepEqual(calculateResults([
    { correctAnswer: "-" },
    { correctAnswer: "b" }
  ], { 0: "a" }), {
    correct: 0,
    incorrect: 0,
    unanswered: 1,
    ungraded: 1,
    total: 2
  });
});

test("shuffle returns every original item exactly once", () => {
  const original = [1, 2, 3, 4, 5];
  const shuffled = shuffle(original, () => 0);
  assert.deepEqual([...shuffled].sort(), original);
  assert.deepEqual(original, [1, 2, 3, 4, 5]);
});

test("formatTime uses minute and second padding", () => {
  assert.equal(formatTime(0), "00:00");
  assert.equal(formatTime(65), "01:05");
  assert.equal(formatTime(5400), "90:00");
});

test("reading preferences normalize themes and keep font scale in range", () => {
  assert.deepEqual(normalizePreferences({ theme: "sepia", fontScale: 1.2 }), {
    theme: "sepia",
    fontScale: 1.2
  });
  assert.deepEqual(normalizePreferences({ theme: "unknown", fontScale: 10 }), {
    theme: "light",
    fontScale: 1.4
  });
  assert.equal(adjustFontScale(1, -1), 0.9);
  assert.equal(adjustFontScale(1.4, 1), 1.4);
});

test("answer shortcuts map A-D and 1-4 without capturing other keys", () => {
  assert.deepEqual(["a", "B", "c", "D", "1", "2", "3", "4"].map(getAnswerForShortcut), [
    "a", "b", "c", "d", "a", "b", "c", "d"
  ]);
  assert.equal(getAnswerForShortcut("Escape"), null);
});

test("the app exposes persistent theme/font controls and limits shortcuts to tests", async () => {
  const app = await readFile(fileURLToPath(new URL("../app.js", import.meta.url)), "utf8");
  const styles = await readFile(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");

  assert.match(app, /testope\.web\.preferences\.v1/);
  assert.match(app, /data-action="cycle-theme"/);
  assert.match(app, /data-action="increase-font"/);
  assert.match(app, /state\.screen !== "quiz"/);
  assert.match(app, /event\.target\.closest\("input, textarea, select/);
  assert.match(styles, /html\[data-theme="dark"\]/);
  assert.match(styles, /html\[data-theme="sepia"\]/);
  assert.match(styles, /--reading-scale/);
});

test("progress backups round-trip and reject invalid battery answer overrides", () => {
  const progress = {
    results: [{ title: "Test", correct: 1, incorrect: 0, unanswered: 0, ungraded: 0, total: 1, date: 1, timeSeconds: 30 }],
    failed: [{
      batteryId: "test_Celador.json",
      batteryTitle: "Celador",
      sourceIndex: 2,
      question: "Pregunta fallada",
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      correctAnswer: "b"
    }],
    attempted: [{ batteryId: "test_Celador.json", sourceIndex: 0 }],
    answerOverrides: { "test_Celador.json:0": "b" }
  };
  const backup = createProgressBackup(progress, "2026-11-01T00:00:00.000Z");
  assert.deepEqual(validateProgressBackup(backup), progress);
  assert.throws(() => validateProgressBackup({
    ...backup,
    progress: { ...progress, answerOverrides: { "test_Celador.json:0": "z" } }
  }), /clave modificada no válida/);
});

test("custom simulation pools honor selected batteries, edited keys and unkeyed setting", () => {
  const batteries = [
    { id: "celador", title: "Celador", test: [{ correctAnswer: "a" }, { correctAnswer: "-" }] },
    { id: "tecnico", title: "Técnico", test: [{ correctAnswer: "b" }] }
  ];
  assert.deepEqual(
    createSimulationQuestionPool(batteries, ["celador"], false, { "celador:1": "c" })
      .map(question => [question.batteryId, question.sourceIndex, question.correctAnswer]),
    [["celador", 0, "a"], ["celador", 1, "c"]]
  );
  assert.equal(createSimulationQuestionPool(batteries, ["celador"], true).length, 2);
  assert.equal(createSimulationQuestionPool(batteries, ["tecnico"], false).length, 1);
});

test("battery progress counts unique attempted and failed questions", () => {
  const attempted = [
    { batteryId: "celador", sourceIndex: 1 },
    { batteryId: "celador", sourceIndex: 1 }
  ];
  const failed = [{ batteryId: "celador", sourceIndex: 1 }];
  assert.deepEqual(calculateBatteryProgress(10, "celador", attempted, failed), {
    attempted: 1,
    failed: 1,
    pending: 9
  });
});

test("question report mail contains the battery, question number and contact", () => {
  const link = createQuestionReportLink({
    question: "Pregunta de ejemplo",
    optionA: "Opción A",
    optionB: "Opción B",
    optionC: "Opción C",
    optionD: "Opción D",
    correctAnswer: "b"
  }, "Celador", 12);
  const decoded = decodeURIComponent(link);
  assert.match(link, /^mailto:estimprog@gmail\.com\?/);
  assert.match(decoded, /Celador, pregunta 12/);
  assert.match(decoded, /Pregunta de ejemplo/);
  assert.match(decoded, /Clave actual: b/);
});

test("the first-visit information dialog explains construction, privacy and storage", async () => {
  const html = await readFile(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  const app = await readFile(fileURLToPath(new URL("../app.js", import.meta.url)), "utf8");

  assert.match(html, /TestOPE está en construcción/);
  assert.match(html, /no utiliza cookies propias/i);
  assert.match(html, /almacenamiento local/i);
  assert.match(html, /ni está afiliada a Osakidetza/i);
  assert.match(app, /testope\.web\.info\.acknowledged\.v1/);
  assert.match(app, /Privacidad y cookies/);
});

test("all web battery files load as valid test banks", async () => {
  const assets = fileURLToPath(new URL("../data/", import.meta.url));
  const files = [
    "test_Auxiliar_Administrativo.json",
    "test_Celador.json",
    "test_Comun_Categoria_A_B_C1.json",
    "test_Comun_Categoria_C2_C3_D_E.json",
    "test_Oficial_Mantenimiento_Mecanico.json",
    "test_Oficial_Mantenimiento_Calefactor_Fontanero.json",
    "test_Operario_Servicios.json",
    "test_Tecnico_Superior_Admin_Gestion.json"
  ];

  for (const file of files) {
    const battery = JSON.parse(await readFile(join(assets, file), "utf8"));
    assert.ok(battery.title, `${file} should have a title`);
    assert.ok(battery.test.length > 0, `${file} should contain questions`);
    for (const [index, question] of battery.test.entries()) {
      assert.ok(question.question, `${file}: question ${index + 1} has no text`);
      for (const option of ["optionA", "optionB", "optionC", "optionD"]) {
        assert.equal(typeof question[option], "string", `${file}: question ${index + 1} has no ${option}`);
      }
      assert.ok(["a", "b", "c", "d", "-"].includes(question.correctAnswer.toLowerCase()), `${file}: question ${index + 1} has an invalid answer`);
    }
  }
});

test("the common C2-C3-D-E battery uses the chart answers for the corrected questions", async () => {
  const assets = fileURLToPath(new URL("../data/", import.meta.url));
  const battery = JSON.parse(await readFile(join(assets, "test_Comun_Categoria_C2_C3_D_E.json"), "utf8"));
  for (const [number, answer] of [[57, "c"], [260, "c"], [289, "b"]]) {
    const question = battery.test.find(item => item.question.startsWith(`${number}.`));
    assert.ok(question, `question ${number} should exist`);
    assert.equal(question.correctAnswer, answer);
  }
});

test("the mechanical maintenance battery has all 200 chart answers", async () => {
  const assets = fileURLToPath(new URL("../data/", import.meta.url));
  const battery = JSON.parse(await readFile(join(assets, "test_Oficial_Mantenimiento_Mecanico.json"), "utf8"));
  const chartRows = [
    "CACBBBBCDA", "CCBBCBBBCD", "ABBCBACBAB", "BBDACCBCCB",
    "BDB CBBBB CB", "BCBABBDBCA", "BBBDABCBBB", "BBDDDADBBB",
    "DBCAACBCDC", "DABBBCBABA", "BBDBBABABB", "BBCCCBBABB",
    "CBDCBDACBB", "BBDBACBBAB", "BCCCBDAABC", "BDBCABADBB",
    "CBCACCCADB", "DCDBAABABC", "DDBADCBBAC", "BDCADBDCAB"
  ].join("").replaceAll(" ", "").toLowerCase();

  assert.equal(battery.test.length, 200);
  assert.equal(chartRows.length, 200);
  battery.test.forEach((question, index) => {
    assert.equal(question.correctAnswer, chartRows[index], `question ${index + 1}`);
  });
});

test("the heating and plumbing battery keeps unavailable chart answers blank", async () => {
  const assets = fileURLToPath(new URL("../data/", import.meta.url));
  const battery = JSON.parse(await readFile(join(assets, "test_Oficial_Mantenimiento_Calefactor_Fontanero.json"), "utf8"));
  const chartRows = [
    "BCBABCCDBD", "ABBADBBCDB", "AADADBCDBB", "DACBABABCA", "AAABC-CABB",
    "----------", "ACCADBBBCB", "CCBBBBABAC", "BCCB------",
    ...Array(11).fill("----------")
  ].join("").toLowerCase();

  assert.equal(battery.title, "OFICIAL/A MANTENIMIENTO CALEFACTOR-FONTANERO/A");
  assert.equal(battery.test.length, 200);
  assert.equal(chartRows.length, 200);
  battery.test.forEach((question, index) => {
    assert.equal(question.correctAnswer, chartRows[index], `question ${index + 1}`);
  });
  assert.equal(chartRows.split("-").length - 1, 127);
});
