var normalizer = require("../lib/normalizer"),
    esprima = require("esprima"),
    escodegen = require("escodegen"),
    fs = require("fs");

function runtest(test, input_file, expected_file) {
  var input = esprima.parse(fs.readFileSync(input_file, 'utf-8')),
      expected = esprima.parse(fs.readFileSync(expected_file, 'utf-8'));
  var normalized = normalizer.normalize(input);
  var expected_str = escodegen.generate(expected),
      actual_str = escodegen.generate(normalized);
  if(expected_str !== actual_str) {
    console.log("Expected:\n" + expected_str);
    console.log("Actual:\n" + actual_str);
  }
  test.equal(expected_str, actual_str);
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