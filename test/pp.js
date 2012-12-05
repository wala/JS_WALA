/**
 * Parse the given file and pretty print it, comparing against the
 * pretty-printed version obtained by only using Esprima.
 */
var parser = require("../lib/parser"),
    esprima = require("esprima"),
    escodegen = require("escodegen"),
    fs = require("fs");

var src = fs.readFileSync(process.argv[2], 'utf-8');

var expected = escodegen.generate(esprima.parse(src, { loc: true, range: true }));
var actual = escodegen.generate(parser.parse(src, process.argv[2]).scripts[0]);

if(expected == actual) {
  console.log("yes");
} else {
  console.error("no");
  fs.writeFileSync('/tmp/expected', expected);
  fs.writeFileSync('/tmp/actual', actual);
}