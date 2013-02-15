function f(o) {
    for(var p in o)
	if(p === 'SKIP')
	    continue;
    return p;
}
