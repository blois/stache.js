suite('Parsing', function() {
  var assert = chai.assert;

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
    assert.equal(sectionRenderer.fragment.childNodes.length, 4);
    var li = sectionRenderer.fragment.childNodes[1];
    assert.equal(li.childNodes.length, 3);
    assert.equal(li.childNodes[1].textContent, '/');

    assert.equal(sectionRenderer.staticRenderers.length, 2);

    var aRenderer = sectionRenderer.staticRenderers[0];
    //assert.deepEqual(aRenderer.insertionPath.path, [1, 0]);

    var dotRenderer = sectionRenderer.staticRenderers[1];
    //assert.deepEqual(dotRenderer.insertionPath.path, [1, 1]);


    var result = template.render({
      a_string: 'aa',
      a_list: ['a']
    });
    var li = result.childNodes[1];
    assert.equal(li.textContent, 'aa/a');
  });

  test('nested list ex', function() {
    var fragment = stache.createFragment(
      '<div>{{#items}}{{#items}}{{.}}x{{/items}}y{{/items}}</div>');
    var template = stache.fromFragment(fragment);
    var root = template.root_;
    assert.equal(root.renderers.length, 1);
    var firstRenderer = root.renderers[0];
    assert.equal(firstRenderer.fragment.childNodes.length, 2);
  });
});
