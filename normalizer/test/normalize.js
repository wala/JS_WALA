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
 * Simple command line interface to the normalizer: normalizes and pretty-prints
 * code in file given as first argument.
 */
var normalizer = require("../lib/normalizer"),
    esprima = require("esprima"),
    escodegen = require("escodegen"),
    fs = require("fs");

var src = fs.readFileSync(process.argv[2], 'utf-8');
var ast = esprima.parse(src);
var normalized = normalizer.normalize(ast, { pp: escodegen.generate });
console.log(escodegen.generate(normalized, { comment: true }));
