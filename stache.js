(function (scope) {
  var parseDoc;
  var parseRange;

  function createFragment(html, opt_contextTagName) {
    if (!parseDoc) {
      parseDoc = document.implementation.createHTMLDocument('');
      if (window.Range.prototype.createContextualFragment) {
        parseRange = parseDoc.createRange();
      }
    }
    var parseContext;
    if (opt_contextTagName) {
      parseContext = parseDoc.createElement(opt_contextTagName);
      parseDoc.body.appendChild(parseContext);
    } else {
      parseContext = parseDoc.body;
    }

    if (window.Range.prototype.createContextualFragment) {
      parseRange.selectNodeContents(parseContext);
      var fragment = parseRange.createContextualFragment(html);

      if (parseContext != parseDoc.body) {
        parseDoc.body.removeChild(parseContext);
      }
      return fragment;
    } else {
      // IE9.
      parseContext.innerHTML = html;

      var fragment = document.createDocumentFragment();
      while (parseContext.firstChild) {
        fragment.appendChild(contextElement.firstChild);
      }
      if (parseContext != parseDoc.body) {
        parseDoc.body.removeChild(parseContext);
      }
      return fragment;
    }
  }

  function fromFragment(fragment) {
    return new Template(fragment);
  }

  Template = function(fragment) {
    this.root_ = new FragmentRenderer(fragment, null, null);

    var stack = [this.root_];
    this.processNode_(fragment, stack);
  };

  /**
   * @param {!Object} data
   * @param {Object=} opt_partials
   * @return {!DocumentFragment}
   */
  Template.prototype.render = function(data, opt_partials) {
    var context = {data: data, parent: null};

    /**
     * @type {Object<!FragmentRenderer>}
     */
    var partialRenderers;
    if (opt_partials) {
      partialRenderers = {};
      for (var key in opt_partials) {
        if (opt_partials[key] instanceof Template) {
          partialRenderers[key] = opt_partials[key].root_;
        }
      }
    }
    return this.root_.expand(context, partialRenderers);
  };

  /**
   * @param {!Node} node
   * @param {!Array<!FragmentRenderer>} stack
   */
  Template.prototype.processNode_ = function(node, stack) {
    var detaching = 0;
    var nodes = Array.prototype.slice.call(node.childNodes, 0);
    for (var nodeIdx = 0; nodeIdx < nodes.length; ++nodeIdx) {
      var child = nodes[nodeIdx];

      if (child.nodeType == Node.TEXT_NODE) {
        var tokens = parseMustacheDirectives(child.textContent);
        for (var tokenIdx = 0; tokenIdx < tokens.length; ++tokenIdx) {
          var proxy = document.createTextNode('');
          var token = tokens[tokenIdx];
          if (detaching) {
            stack[stack.length - 1].fragment.appendChild(proxy);
          } else {
            node.insertBefore(proxy, child);
          }
          if (token.type == Directive.TEXT) {
            proxy.textContent = token.value;
            continue;
          } else if (token.type == Directive.END_SECTION) {
            if (stack[stack.length - 1].binding != token.value) {
              throw new Error('Mismatched values');
            }
            stack.splice(stack.length - 1, 1);
            --detaching;
          } else {
            renderer = token.toRenderer(proxy);
            if (renderer) {
              stack[stack.length - 1].addRenderer(renderer);

              if (renderer instanceof FragmentRenderer) {
                stack.push(renderer);
                ++detaching;
              }
            }
          }
        }
        if (tokens.length) {
          // Remove it since we're handling it with tokens.
          child.remove();
          continue;
        }
      }

      if (detaching) {
        stack[stack.length - 1].fragment.appendChild(child);
      }

      if (child.nodeType == Node.ELEMENT_NODE) {
        this.processAttributes_(child, stack);
      }

      this.processNode_(child, stack);
    }
    if (detaching) {
      throw new Error('Mismatched sections and close tags');
    }
  }

  /**
   * @param {!Element} element
   * @param {!Array.<!FragmentRenderer> stack}
   */
  Template.prototype.processAttributes_ = function(element, stack) {
    var attributes = element.attributes;
    for (var i = 0; i < attributes.length; ++i) {
      var attr = attributes[i];
      var directives = parseMustacheDirectives(attr.textContent);
      if (directives.length) {
        var attr = new AttributeRenderer(element, attr.name, directives);
        stack[stack.length - 1].addRenderer(attr);
      }
    }
  };

  // Cribbed unceremoniously from:
  // https://github.com/toolkitchen/mdv/blob/stable/src/template_element.js
  function parseMustacheDirectives(s) {
    var result = [];
    var index = 0, lastIndex = 0;
    while (lastIndex < s.length) {
      index = s.indexOf('{{', lastIndex);
      if (index < 0) {
        // If it's just text, then add nothing.
        if (lastIndex > 0) {
          result.push(new Directive(Directive.TEXT, s.substring(lastIndex)));
        }
        break;
      } else {
        // There is a non-empty text run before the next path token.
        if (index > 0 && lastIndex < index) {
          result.push(new Directive(Directive.TEXT, s.substring(lastIndex, index)));
        }
        lastIndex = index + 2;
        if (s.indexOf('{', lastIndex) == lastIndex) {
          index = s.indexOf('}}}', lastIndex) + 1;
        } else {
          index = s.indexOf('}}', lastIndex);
        }

        if (index < 0) {
          var text = s.substring(lastIndex - 2);
          var lastDirective = result[result.length - 1];
          if (lastDirective && lastDirective.type == Directive.TEXT)
            lastDirective.value += text;
          else
            result.push(new Directive(Directive.TEXT, text));
          break;
        }

        var value = s.substring(lastIndex, index).trim();
        result.push(Directive.from(value));
        lastIndex = index + 2;
      }
    }
    return result;
  };

  /**
   * Represents the insertion point for nodes into the node tree.
   *
   * Insertion must always occur in reverse order so the insertion points
   * don't conflict.
   *
   * @param {Node} destination
   */
  NodePath = function(destination)  {
    this.path = [];

    var parent = destination.parentNode;
    while (parent) {
      this.path.splice(0, 0, Array.prototype.indexOf.call(parent.childNodes, destination));
      destination = destination.parentNode;
      parent = destination.parentNode;
    }
    if (!this.path.length) {
      this.path.push(0);
    }
  };

  /**
   * @param {Node} root
   * @param {Node} item
   */
  NodePath.prototype.insert = function(root, item) {
    var path = this.path;
    for (var i = 0; i < path.length - 1; ++i) {
      root = root.childNodes[path[i]];
    }
    root.insertBefore(item, root.childNodes[path[i]]);
  };

  /**
   * @param {string} binding
   * @param {*} data
   */
  function resolveBinding(binding, context) {
    if (binding == '.') {
      return context.data;
    }
    var value;
    while (context) {
      if (binding.indexOf('.') > 0) {
        value = context.data;

        var path = binding.split('.');
        var i = 0;
        while (value != undefined && i < path.length) {
          value = value[path[i++]];
        }
      } else {
        value = context.data[binding];
      }
      if (value != undefined) {
        break;
      }
      context = context.parent;
    }
    //var value = context.data[binding];
    if (typeof value == 'function') {
      return value.call(context.data);
    }

    return value;
  }

  function bindingFunction(binding) {
    if (binding == '.') {
      return function(context) {
        return context.data;
      };
    }
    if (binding.indexOf('.') > 0) {
      var path = binding.split('.');
      return function(context) {
        var value;
        while (context) {
          value = context.data;
          var i = 0;
          while (value != undefined && i < path.length) {
            value = value[path[i++]];
          }
          if (value != undefined) {
            break;
          }
          context = context.parent;
        }
        if (value instanceof Function) {
          return value.call(context.data);
        }

        return value;
      };
    }
    return function(context) {
      var value;
      while (context) {
        value = context.data[binding];
        if (value != undefined) {
          break;
        }
        context = context.parent;
      }
      //var value = context.data[binding];
      if (value instanceof Function) {
        return value.call(context.data);
      }

      return value;
    }
  }

  /**
   * @param {NodePath} insertionPath
   * @constructor
   */
  NodeRenderer = function(insertionPath) {
    this.insertionPath = insertionPath;
  };

  /**
   * @param {!Node} destination
   * @param {!Object} data
   * @param {!Object<!FragmentRenderer> partials}
   */
  NodeRenderer.prototype.render;


  /**
   * @param {string} binding
   * @param {!NodePath} insertionPath
   * @extends {NodeRenderer}
   * @constructor
   */
  BindingRenderer = function(binding, insertionPath) {
    NodeRenderer.call(this, insertionPath);

    this.binding = binding;
    if (binding) {
      this.bindingFn = bindingFunction(binding);
    }
  };
  BindingRenderer.prototype = Object.create(NodeRenderer.prototype);

  BindingRenderer.prototype.getValue = function(context) {
    return this.bindingFn(context);
  };

  /**
   * @extends {BindingRenderer}
   * @constructor
   */
  TextBindingRenderer = function(binding, placeholder) {
    BindingRenderer.call(this, binding, null);
    this.placeholder = placeholder;
  };
  TextBindingRenderer.prototype = Object.create(BindingRenderer.prototype);

  /**
   * @override
   */
  TextBindingRenderer.prototype.render = function(destination, context, partials) {
    var value = this.bindingFn(context);
    if (value == undefined) {
      value = '';
    }
    this.placeholder.textContent = value;
  };

  /**
   * @extends {BindingRenderer}
   * @constructor
   */
  UnescapeRenderer = function(binding, insertionPath) {
    BindingRenderer.call(this, binding, insertionPath);
  };
  UnescapeRenderer.prototype = Object.create(BindingRenderer.prototype);

  /**
   * @override
   */
  UnescapeRenderer.prototype.render = function(destination, context, partials) {
    var value = this.getValue(context);
    if (typeof value != 'string') {
      this.insertionPath.insert(destination, document.createTextNode(''));
      return;
    }
    var fragment = createFragment(value);
    this.insertionPath.insert(destination, fragment);
  };

  /**
   * @param {!DocumentFragment} fragment
   * @param {string?} binding
   * @param {NodePath} insertionPath
   * @extends {BindingRenderer}
   * @constructor
   */
  FragmentRenderer = function(fragment, binding, insertionPath) {
    BindingRenderer.call(this, binding, insertionPath);

    /** @type {!Array<!NodeRenderer>} */
    this.renderers = [];
    /** @type {!DocumentFragment} */
    this.fragment = fragment;
    /** @type {!Array<!NodeRenderer>} */
    this.staticRenderers = [];
  };
  FragmentRenderer.prototype = Object.create(BindingRenderer.prototype);

  FragmentRenderer.prototype.addRenderer = function(renderer) {
    if (renderer instanceof TextBindingRenderer || renderer instanceof AttributeRenderer) {
      this.staticRenderers.push(renderer);
    } else {
      this.renderers.push(renderer);
    }
  };

  FragmentRenderer.prototype.expand = function(context, partials) {
    for (var i = 0; i < this.staticRenderers.length; ++i) {
      this.staticRenderers[i].render(this.fragment, context, partials);
    }
    var root = this.fragment.cloneNode(true);

    for (var i = this.renderers.length - 1; i >= 0; --i) {
      this.renderers[i].render(root, context, partials);
    }
    return root;
  };

  /**
   * @param {string} binding
   * @param {!NodePath} insertionPath
   * @extends {FragmentRenderer}
   * @constructor
   */
  SectionRenderer = function(binding, insertionPath) {
    FragmentRenderer.call(this, document.createDocumentFragment(), binding, insertionPath);
  };
  SectionRenderer.prototype = Object.create(FragmentRenderer.prototype);

  /**
   * @override
   */
  SectionRenderer.prototype.render = function(destination, context, partials) {
    var value = this.getValue(context);
    if (!value) {
      return;
    }
    var scopedContext = {
      data: value,
      parent: context
    };
    if (value instanceof Array) {
      var path = this.insertionPath.path;
      var parent = destination;
      for (var i = 0; i < path.length - 1; ++i) {
        parent = parent.childNodes[path[i]];
      }
      var insertionBefore = parent.childNodes[path[i]];
      for (var index = 0; index < value.length; ++index) {
        scopedContext.data = value[index];
        var clone = this.expand(scopedContext, partials);
        parent.insertBefore(clone, insertionBefore);
      }
    } else if (value) {
      this.insertionPath.insert(destination, this.expand(scopedContext, partials));
    }
  };

  /**
   * @param {string} binging
   * @param {!NodePath} insertionPath
   * @extends {FragmentRenderer}
   * @constructor
   */
  ConditionalRenderer = function(binding, insertionPath) {
    FragmentRenderer.call(this, document.createDocumentFragment(), binding, insertionPath);
  };
  ConditionalRenderer.prototype = Object.create(FragmentRenderer.prototype);

  /**
   * @override
   */
  ConditionalRenderer.prototype.render = function(destination, context, partials) {
    var value = this.getValue(context);
    if (!value || (value instanceof Array && value.length == 0)) {
      var scopedContext = {
        data: value,
        parent: context
      };
      this.insertionPath.insert(destination, this.expand(scopedContext, partials));
    }
  };

  /**
   * @param {string} binging
   * @param {!NodePath} insertionPath
   * @extends {NodeRenderer}
   * @constructor
   */
  PartialRenderer = function(binding, insertionPath) {
    NodeRenderer.call(this, insertionPath);
    this.binding = binding;
  };
  PartialRenderer.prototype = Object.create(NodeRenderer.prototype);

  /**
   * @override
   */
  PartialRenderer.prototype.render = function(destination, context, partials) {
    if (!partials) {
      throw new Error('Partial command but no partials provided');
    }
    var partial = partials[this.binding];
    if (!partial) {
      this.insertionPath.insert(destination, document.createTextNode(''));
      return;
    }
    var fragment = partial.expand(context, partials);
    this.insertionPath.insert(destination, fragment);
  };

  /**
   * Renderer which fills in attributes on a node.
   * @param {!NodePath} insertionPath
   * @param {string} attributeName
   * @param {!Array<!Directive>} directives
   * @extends {NodeRenderer}
   * @constructor
   */
  AttributeRenderer = function(placeholder, attributeName, directives) {
    NodeRenderer.call(this, null);
    this.placeholder = placeholder;
    this.attributeName = attributeName;
    this.directives = directives;
  }
  AttributeRenderer.prototype = Object.create(NodeRenderer.prototype);

  /**
   * @override
   */
  AttributeRenderer.prototype.render = function(destination, context, partials) {
    var value = '';
    var stack = [context];

    for (var i = 0; i < this.directives.length; ++i) {
      var directive = this.directives[i];
      switch(directive.type) {
      case Directive.TEXT:
        value += directive.value;
        break;
      case Directive.BINDING:
        value += resolveBinding(directive.value, stack[stack.length - 1]);
      }
    }
    this.placeholder.setAttribute(this.attributeName, value);
  };

  Directive = function(type, value) {
    this.type = type;
    this.value = value;
  };

  Directive.TEXT = 'text';
  Directive.BINDING = 'binding';
  Directive.START_SECTION = 'section_start';
  Directive.START_INV_SECTION = 'start_inv_section';
  Directive.END_SECTION = 'section_end';
  Directive.COMMENT_SECTION = 'comment';
  Directive.PARTIAL_SECTION = 'partial';
  Directive.UNESCAPE_SECTION = 'unescape';

  Directive.from = function(text) {
    if (text[0] == '#') {
      return new Directive(Directive.START_SECTION, text.substring(1).trim());
    } else if (text[0] == '/') {
      return new Directive(Directive.END_SECTION, text.substring(1).trim());
    } else if (text[0] == '^') {
      return new Directive(Directive.START_INV_SECTION, text.substring(1).trim());
    } else if (text[0] == '!') {
      return new Directive(Directive.COMMENT_SECTION, text.substring(1).trim());
    } else if (text[0] == '>') {
      return new Directive(Directive.PARTIAL_SECTION, text.substring(1).trim());
    } else if (text[0] == '&') {
      return new Directive(Directive.UNESCAPE_SECTION, text.substring(1).trim());
    } else if (text[0] == '{' && text[text.length - 1] == '}') {
      return new Directive(Directive.UNESCAPE_SECTION, text.substring(1, text.length - 1).trim());
    }
    return new Directive(Directive.BINDING, text);
  };

  /**
   * @param {Node} node
   * @returns {NodeRenderer}
   */
  Directive.prototype.toRenderer = function(node) {
    switch(this.type) {
    case Directive.START_SECTION:
      var path = new NodePath(node);
      node.remove();
      return new SectionRenderer(this.value, path);
    case Directive.BINDING:
      return new TextBindingRenderer(this.value, node);
    case Directive.START_INV_SECTION:
      var path = new NodePath(node);
      node.remove();
      return new ConditionalRenderer(this.value, path);
    case Directive.PARTIAL_SECTION:
      var path = new NodePath(node);
      node.remove();
      return new PartialRenderer(this.value, path);
    case Directive.UNESCAPE_SECTION:
      var path = new NodePath(node);
      node.remove();
      return new UnescapeRenderer(this.value, path);
    }
    return null;
  };

  scope['stache'] = {
    'createFragment': createFragment,
    'fromFragment': fromFragment,
    'fromHTML': function(html) {
      return fromFragment(createFragment(html));
    }
  };
})(this);
