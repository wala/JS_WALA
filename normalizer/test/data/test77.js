function f(o) {
    var x = 23;
    with(o) {
	return x;
    }
}