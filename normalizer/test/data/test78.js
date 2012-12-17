function f(o) {
    var x;
    with(o) {
	x = 23;
	y = 42;
    }
}