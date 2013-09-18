var fs = require('fs');
var esprima = require('esprima');
var normalizer = require(__dirname + '/lib/normalizer');
var astutil = require(__dirname + '/../common/lib/ast.js');

var last_fun_offset = -1;

function find_suspicious(nd) {
    if(!nd)
	return;

    if(nd.type === 'FunctionExpression' && nd.attr.pos) {
	last_fun_offset = nd.attr.pos.start_offset;
    } else if(nd.type === 'AssignmentExpression' &&
	      nd.right.type === 'MemberExpression' &&
	      nd.attr.pos.start_offset === last_fun_offset) {
	console.error("found suspicious position information (offset " +
		      nd.attr.pos.start_offset + ")");
	process.exit(-1);
    }
    
    astutil.forEachChild(nd, find_suspicious);
}

var ast = esprima.parse(fs.readFileSync(process.argv[2], 'utf-8'),
			{ loc: true, range: true });
var normalized = normalizer.normalize(ast);
//console.log(JSON.stringify(normalized));
find_suspicious(normalized);