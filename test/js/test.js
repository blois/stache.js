suite('safe-dom', function() {
  var assert = chai.assert;

  function compare(html, expected, data) {
    var fragment = stache.createFragment(html);
    var template = stache.fromFragment(fragment);
    var resultingFragment = template.render(data);
    validateToHTML(resultingFragment, expected);
  };

  function nodeToHTML(node) {
    var host = document.createElement('div');
    host.appendChild(node.cloneNode(true));
    return host.innerHTML;
  }

  function validateToHTML(dom, html) {
    var resultingHTML = nodeToHTML(dom);
    // Should really parse DOM and compare
    assert.equal(resultingHTML, html);
  }

  test('parsing', function() {
    var fragment = stache.createFragment('<div>somecontent</div>');

    assert.equal(fragment.childNodes.length, 1);
    var div = fragment.childNodes[0];
    assert.equal(div.tagName, 'DIV');
    assert.equal(div.textContent, 'somecontent');

    var template = stache.fromFragment(fragment);
    fragment = template.render({});

    assert.equal(fragment.childNodes.length, 1);
    var div = fragment.childNodes[0];
    assert.equal(div.tagName, 'DIV');
    assert.equal(div.textContent, 'somecontent');
  });

  test('list parsing', function() {
    var fragment = stache.createFragment([
      '{{#a_list}}',
      '  <li>{{a_string}}/{{.}}</li>',
      '{{/a_list}}'].join('\n'));
    var template = stache.fromFragment(fragment);

    var root = template.root_;
    assert.equal(root.renderers.length, 1);
    var sectionRenderer = root.renderers[0];
    assert.equal(sectionRenderer.fragment.childNodes.length, 3);
    var li = sectionRenderer.fragment.childNodes[1];
    assert.equal(li.childNodes.length, 1);
    assert.equal(li.childNodes[0].textContent, '/');

    assert.equal(sectionRenderer.renderers.length, 2);

    var aRenderer = sectionRenderer.renderers[0];
    assert.deepEqual(aRenderer.insertionPath.path, [1, 0]);

    var dotRenderer = sectionRenderer.renderers[1];
    assert.deepEqual(dotRenderer.insertionPath.path, [1, 1]);


    var result = template.render({
      a_string: 'aa',
      a_list: ['a']
    });
    var li = result.childNodes[1];
    assert.equal(li.textContent, 'aa/a');
  });


  test('no bindings', function() {
    compare(
        '<div>somecontent</div>',
        '<div>somecontent</div>',
        {});
  });

  test('text binding', function() {
    compare(
        '<div>{{content}}</div>',
        '<div>result</div>',
        {content: 'result'});
  });

  test('bindings interspersed', function() {
    compare(
        '<div>{{content}}<span></span>{{content}}</div>',
        '<div>result<span></span>result</div>',
        {content: 'result'});
  });
  test('list simple', function() {
    compare(
        '<div>{{#items}}<span></span>{{/items}}</div>',
        '<div><span></span><span></span></div>',
        {items: [1, 0]});
  });
  test('list items', function() {
    compare(
        '<div>{{#items}}<span>{{.}}</span>{{/items}}</div>',
        '<div><span>1</span><span>2</span></div>',
        {items: [1, 2]});
  });

  test('offset list', function() {
    compare(
        '<div><ul></ul>{{#items}}<span>{{.}}</span>{{/items}}</div>',
        '<div><ul></ul><span>1</span></div>',
        {items: [1]});
  });

  test('null list', function() {
    compare(
        '<div>{{#items}}<span>{{.}}</span>{{/items}}</div>',
        '<div></div>',
        {items: null});
  });

  test('nested list ex', function() {
    var fragment = stache.createFragment(
      '<div>{{#items}}{{#items}}{{.}}x{{/items}}y{{/items}}</div>');
    var template = stache.fromFragment(fragment);
    var root = template.root_;
    assert.equal(root.renderers.length, 1);
    var firstRenderer = root.renderers[0];
    assert.equal(firstRenderer.fragment.childNodes.length, 1);

  })

  test('nested list', function() {
    compare(
        '<div>{{#items}}{{#items}}{{.}}x{{/items}}y{{/items}}</div>',
        '<div>1x2xy3x4xy</div>',
        {'items': [
          {'items': [1, 2]},
          {'items': [3, 4]},
        ]});
  });

  test('conditional', function() {
    compare(
        '<div>{{^content}}foo{{/content}}</div>',
        '<div>foo</div>',
        {});

    compare(
        '<div>{{^content}}foo{{/content}}</div>',
        '<div></div>',
        {content: {}});
  });

  test('text interspersed', function() {
    compare('<div>{{content}}text{{content2}}</div>',
        '<div>1text2</div>',
        {content: 1, content2: 2});
  });

  test('empty attributes', function() {
    compare(
        '<div class="foo"></div>',
        '<div class="foo"></div>',
        {});
  });

  test('attr binding', function() {
    compare(
        '<div class="{{content}}"></div>',
        '<div class="klass"></div>',
        {content: 'klass'});
  });

  test('partials', function() {
    var partial = stache.fromHTML('<span>{{content}}</span>');
    var template = stache.fromHTML('<div>{{>partial}}</div>');

    var result = template.render({content: 'foo'}, {partial: partial});
    validateToHTML(result, '<div><span>foo</span></div>');
  });

  test('sections', function() {
    compare(
        '<span>{{#foo}}bar{{/foo}}</span>',
        '<span>bar</span>',
        {foo: true});

    compare(
        '<span>{{#foo}}bar{{/foo}}</span>',
        '<span></span>',
        {foo: false});

    compare(
        '<span>{{#foo}}bar{{/foo}}</span>',
        '<span></span>',
        {foo: null});

    compare(
        '<span>{{#foo}}bar{{/foo}}</span>',
        '<span></span>',
        {});

    compare(
        '<span>{{#foo}}{{.}}{{/foo}}</span>',
        '<span>true</span>',
        {foo: true});
  });

  test('comments', function() {
    compare(
      '<span>{{!ignored}}</span>',
      '<span></span>',
      {ignored: true});
  });
});
