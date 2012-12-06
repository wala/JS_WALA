var parser = require("../lib/parser"),
    normalizer = require("../lib/normalizer"),
    escodegen = require("escodegen"),
    fs = require("fs");

var src = fs.readFileSync(process.argv[2], 'utf-8');
var ast = parser.parse(src, process.argv[2]).scripts[0];
var normalized = normalizer.normalize(ast);
console.log(escodegen.generate(normalized));
