function f(o) {
    var g;
    with(o) {
	g();
	h();
    }
}

function h() {}