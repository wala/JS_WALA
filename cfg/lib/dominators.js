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
 * Dominator tree construction.
 */

if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('../../common/lib/ast'),
      sets = require('../../common/lib/sets');

  /** Builds a depth-first spanning tree starting from nd. If reverse is false,
   *  the tree follows succ edges, if it is true it follows pred edges.
   *  
   *  Every node is assigned a depth-first number in attribute dfnum (dfnum_rev
   *  if reverse is true), and its attribute dfparent (dfparent_rev) contains
   *  its parent in the tree.
   *  
   *  @param nd the root node of the spanning tree
   *  @param context a record containing with a property next containing the next
   *                 depth-first number to use, and an array vertices into which
   *                 all vertices in the spanning tree are entered
   *  @param reverse whether to traverse along succ or pred edges 
   */
  function buildDFTree(nd, reverse) {
    var dfnum = reverse ? 'dfnum_rev' : 'dfnum',
        dfparent = reverse ? 'dfparent_rev' : 'dfparent',
        next = reverse ? 'pred' : 'succ';
    var next_dfnum = 0;
    
    function rec(nd, parent, accu) {
      if(typeof ast.getAttribute(nd, dfnum) === 'number')
        return;
    
      ast.setAttribute(nd, dfnum, next_dfnum++);
      ast.setAttribute(nd, dfparent, parent);
      accu[accu.length] = nd;

      sets.forEach(ast.getAttribute(nd, next), function(next_nd) {
        if(next_nd)
          rec(next_nd, nd, accu);
      });
      return accu;
    }
    
    return rec(nd, null, []);
  }

  // build dominator tree using Lengauer-Tarjan algorithm
  // if parameter reverse is true, we follow along succ edges, thus constructing the post-dominator tree
  function buildDominatorTree(root, reverse) {
    var dfnum = reverse ? 'dfnum_rev' : 'dfnum',
        dfparent = reverse ? 'dfparent_rev' : 'dfparent',
        next = reverse ? 'succ' : 'pred';

    var vertices = buildDFTree(root, reverse);
    if (!ast.getAttribute(root, 'vertices'))
      ast.setAttribute(root, 'vertices', vertices);

    var ancestor = [], best = [], semi = [];

    function link(p, n) {
      /* simple version without path compression:
       *   ancestor[ast.getAttribute(n, dfnum)] = p; */
      var nn = ast.getAttribute(n, dfnum);
      ancestor[nn] = p;
      best[nn] = n;
    }

    function ancestorWithLowestSemi(v) {
      var vn = ast.getAttribute(v, dfnum);
      
      /* simple version without path compression:
       *   
       *   var u = v, un = vn;
       *   while(ancestor[vn]) {
       *     if(ast.getAttribute(semi[vn], dfnum) < ast.getAttribute(semi[un], dfnum)) {
       *       u = v;
       *       un = vn;
       *     }
       *     v = ancestor[vn];
       *     vn = ast.getAttribute(v, dfnum);
       *   }
       *   return u;
       */
      var a = ancestor[vn];
      if(!a)
        return null;

      var an = ast.getAttribute(a, dfnum);
      if (ancestor[an]) {
        var b = ancestorWithLowestSemi(a),
        bn = ast.getAttribute(b, dfnum);
        ancestor[vn] = ancestor[an];
        if (ast.getAttribute(semi[bn], dfnum) < ast.getAttribute(semi[ast.getAttribute(best[vn], dfnum)], dfnum)) 
          best[vn] = b;
      }
      return best[vn];
    }

    var bucket = [], idom = [], samedom = [];
    for (var i = vertices.length-1; i >= 1; --i) {
      var n = vertices[i];
      var p = ast.getAttribute(n, dfparent),
          pn = ast.getAttribute(p, dfnum);

      // calculate semi-dominator of n
      var s = p, s2;
      sets.forEach(ast.getAttribute(n, next), function(v) {
        if(!v)
          return;
        if (ast.getAttribute(v, dfnum) <= ast.getAttribute(n, dfnum))
          s2 = v;
        else {
          var a = ancestorWithLowestSemi(v);
          if(!a)
            return;
          s2 = semi[ast.getAttribute(a, dfnum)];
        }
        if (ast.getAttribute(s2, dfnum) < ast.getAttribute(s, dfnum))
          s = s2;
      });
      semi[i] = s;

      // defer computation of dominator of n until path from s to n has been linked
      var sn = ast.getAttribute(s, dfnum);
      bucket[sn] = sets.add(bucket[sn] || [], n);

      link(p, n);
      var p_bucket = bucket[pn] || [];
      for (var k = 0; k < p_bucket.length; ++k) {
        var v = p_bucket[k],
            vn = ast.getAttribute(v, dfnum);

        // calculate dominator of v if possible
        var y = ancestorWithLowestSemi(v);
        if (semi[ast.getAttribute(y, dfnum)] == semi[vn])
          idom[vn] = p;
        else
          // defer until dominator of y is known
          samedom[vn] = y;
      }
      bucket[pn] = [];
    }

    // perform deferred dominator calculations
    for (i = 1; i < vertices.length; ++i)
      if (samedom[i])
        idom[i] = idom[ast.getAttribute(samedom[i], dfnum)];

    // enter dominator information into CFG
    for (i = 1; i < vertices.length; ++i) {
      ast.setAttribute(vertices[i], reverse ? 'ipdom' : 'idom', idom[i]);

      // reverse edge 
      var doms = ast.getAttribute(idom[i], reverse ? 'ipdoms' : 'idoms');
      if(!doms)
        ast.setAttribute(idom[i], reverse ? 'ipdoms' : 'idoms', doms = []);
      sets.add(doms, vertices[i]);
    }
  }

  // build dominator trees for whole program
  function buildDominatorTrees(root, also_postdom) {
    switch(root.type) {
    case 'Program':
    case 'FunctionExpression':
      var fakeRoot = ast.getAttribute(root, "fakeRoot");
      buildDominatorTree(fakeRoot);
      if(also_postdom)
        buildDominatorTree(root, true);
              
      ast.setAttribute(root, 'vertices', ast.getAttribute(fakeRoot, 'vertices'));
    default:
      ast.forEachChild(root, function(nd) {
        if(nd)
          buildDominatorTrees(nd, also_postdom);
      });
    }
  }

  exports.buildDominatorTrees = buildDominatorTrees;
});