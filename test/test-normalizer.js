var parser = require("../lib/parser"),
    normalizer = require("../lib/normalizer"),
    esprima = require("esprima"),
    escodegen = require("escodegen"),
    fs = require("fs");

function runtest(test, input_file, expected_file) {
  var input = parser.parse(fs.readFileSync(input_file, 'utf-8'), input_file).scripts[0],
      expected = esprima.parse(fs.readFileSync(expected_file, 'utf-8'), { loc: true, range: true });
  var normalized = normalizer.normalize(input);
  test.equal(escodegen.generate(expected), escodegen.generate(normalized));
  test.done();
}

var DATA_DIR = "data/";
fs.readdirSync(DATA_DIR).forEach(function(file) {
  if(/\.js$/.test(file) && !/^normalized\./.test(file))
    exports[file] = function(test) {
      runtest(test, DATA_DIR + file, DATA_DIR + "normalized." + file);
    };
});

var reporter = require('nodeunit').reporters['default'];
reporter.run({"test-normalise" : module.exports});