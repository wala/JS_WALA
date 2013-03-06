/*******************************************************************************
 * Copyright (c) 2013 Max Schaefer.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Max Schaefer - initial API and implementation
 *******************************************************************************/

/* Helper script to run the normalizer from Rhino. */

// pull base directory and file to normalize out of arguments array to avoid confusing
// requirejs below
var base = arguments[0];
var file = arguments[1];
arguments.length = 0;

// first load escodegen; doesn't seem to be available as a requirejs module...
window = this;
load(base + "escodegen.browser.js");
window = undefined;

// now load requirejs
var requirejsAsLib = true;
load(base + "r.js");

// set up paths for loading the other modules
requirejs.config({
	baseUrl: base,
	paths: {
		"normalizer": "normalizer/lib"
	}
});

// now load Esprima and normalizer
requirejs(['esprima', 'normalizer/normalizer'], function(esprima, normalizer) {
	var src = readFile(file);
	var ast = esprima.parse(src);
	var normalized = normalizer.normalize(ast);
	print(escodegen.generate(normalized));
});