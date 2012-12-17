// { "unify_ret": true }
function tst(f) {
    var y = 42;
    try {
	return f(y);
    } finally {
	y = 23;
    }
}