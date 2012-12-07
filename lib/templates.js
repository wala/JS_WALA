/**
 * Simple template engine for building AST fragments.
 * 
 * The render function takes a template and a data provider function.
 * 
 * Templates are parsed as normal JavaScript programs, but any declaration
 * of or reference to a variable whose name starts with '$' is treated
 * specially.
 * 
 * For a variable reference '$x', the data provider function is invoked with
 * argument 'x' to provide the subtree t to splice in. If the returned subtree
 * is an expression, the variable reference itself is replaced with t. If
 * it is a statement, the variable reference must be part of an expression
 * statement '$x;', which is replaced with t in its entirety. If t is a list
 * of subtrees, that expression statement must furthermore be part of a list
 * of statements, into which all the statements in t are spliced.
 * 
 * For a declaration of a variable '$x', the data provider is similarly invoked
 * on 'x', yielding a subtree t. If that subtree is also a variable declaration,
 * the declaration of '$x' is replaced by it. It can also be a list of variable
 * declarations, which is spliced into the surrounding list of variable
 * declarations.
 * 
 * If splicing would result in an empty variable declaration statement 'var;',
 * the statement is deleted entirely (if it occurs within a list of statements),
 * or replaced by the empty statement.
 */

if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('./ast'),
      parser = require('./parser');
  
  function render(template_str, data_provider) {
    function process(nd) {
      if(!nd)
        return nd;
      
      if(nd instanceof ast.ExpressionStatement &&
          nd.expression instanceof ast.Var && nd.expression.name[0] === '$') {
        var data = data_provider(nd.expression.name.substring(1));
        if(data instanceof ast.Expression)
          nd.expression = data;
        else if(data instanceof ast.Statement)
          nd.parent.setChild(nd.childIndex, data);
        else if(data instanceof ast.List)
          return data;
        else
          {debugger; throw new TypeError("expected expression, statement or list, got " + (data && data.type));}
      } else if(nd instanceof ast.Var && nd.name[0] === '$') {
        var data = data_provider(nd.name.substring(1));
        if(data instanceof ast.Expression)
          nd.parent.setChild(nd.childIndex, data);
        else
          {debugger; throw new TypeError("expected expression, got " + (data && data.type));}
      } else if(nd instanceof ast.VariableDeclarator && nd.name[0] === '$') {
        var data = data_provider(nd.name.substring(1));
        if(data instanceof ast.VariableDeclarator)
          nd.parent.setChild(nd.childIndex, data);
        else if(data instanceof ast.List)
          return data;
        else
          {debugger; throw new TypeError("expected variable declarator or list, got " + (data && data.type));}
      } else if(nd instanceof ast.List) {
        var new_children = null;
        for(var i=0;i<nd.getNumChild();++i) {
          var new_child = process(nd.getChild(i));
          if(new_child instanceof ast.List) {
            if(!new_children) {
              new_children = [];
              for(var j=0;j<i;++j)
                new_children[j] = nd.getChild(j);
            }
            for(var k=0;k<new_child.getNumChild();++k)
              new_children[new_children.length] = new_child.getChild(k);
          } else if(new_children) {
              new_children[new_children.length] = nd.getChild(i);
          }
        }
        if(new_children)
          nd.parent.setChild(nd.childIndex, new ast.List(new_children));
      } else {
        for(var i=0;i<nd.getNumChild();++i)
          process(nd.getChild(i));
        if(nd instanceof ast.VariableDeclaration && nd.declarations.length === 0)
          if(nd.parent instanceof ast.List)
            return new ast.List();
          else
            nd.parent.setChild(nd.childIndex, new ast.EmptyStatement());
      }
    }

    // wrap into function and loop to allow "return", "break" and "continue"
    var template = parser.parse("(function(){while(true){" + template_str + "}});").scripts[0].body[0].expression.body.body[0].body;
    process(template);
    return template.body;
  }
  
  exports.render = render;
});