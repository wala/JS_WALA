/**
 * Simple command line interface to the normalizer: normalizes and pretty-prints
 * code in file given as first argument.
 */
var normalizer = require("../lib/normalizer"),
    esprima = require("esprima"),
    escodegen = require("escodegen"),
    fs = require("fs");

var src = fs.readFileSync(process.argv[2], 'utf-8');
var ast = esprima.parse(src);
var normalized = normalizer.normalize(ast);
console.log(escodegen.generate(normalized));
