// node field-next/tests/run.js — runs every *.test.js in its own process.
"use strict";
var fs = require("fs"), path = require("path"), cp = require("child_process");
var failed = 0;
fs.readdirSync(__dirname).filter(function (f) { return /\.test\.js$/.test(f); }).sort().forEach(function (f) {
  var r = cp.spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: "utf8" });
  process.stdout.write(r.stdout + (r.stderr || ""));
  var fails = (r.stdout.match(/^  FAIL /mg) || []).length;
  if (r.status !== 0 || fails) failed++;
});
console.log(failed ? "\nSOME TESTS FAILED" : "\nall test files passed");
process.exitCode = failed ? 1 : 0;
