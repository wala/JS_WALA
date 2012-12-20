/*******************************************************************************
 * Copyright (c) 2012 IBM Corporation.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/**
 * Unit tests for the normalizer. The actual test data is in directory 'data/'.
 * For every test 'foo', 'data/foo.js' is the original file, while
 * 'data/normalized.foo.js' is the expected result of normalization.
 * 
 * The original file can optionally start with a '//' comment line containing
 * a JSON encoding of the option object to pass to the normalizer (see the
 * unify_ret*.js files for examples).
 */
var normalizer = require("../lib/normalizer"),
    esprima = require("esprima"),
    escodegen = require("escodegen"),
    fs = require("fs");

function runtest(test, input_file, expected_file) {
  var input_src = fs.readFileSync(input_file, 'utf-8');
  var input = esprima.parse(input_src),
      expected = esprima.parse(fs.readFileSync(expected_file, 'utf-8'));
  
  var options = null;
  if(input_src.substring(0, 2) === '//')
    options = JSON.parse(input_src.substring(2, input_src.indexOf('\n')));
  
  var normalized = normalizer.normalize(input, options);
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