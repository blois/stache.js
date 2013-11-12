chai.assert.dom = function(actual, expected) {
  var assert = chai.assert;
  actual = actual.cloneNode(true);
  expected = expected.cloneNode(true);
  normalizeTextNodes(actual);
  normalizeTextNodes(expected);

  var actualHTML = nodeToHTML(actual);
  var expectedHTML = nodeToHTML(expected);

  function validateNodeTree(a, b, path) {
    path = path + a.nodeName;
    assert.equal(a.nodeType, b.nodeType, path + ' nodeTypes differ');
    assert.equal(a.nodeValue, b.nodeValue, path + ' nodeValues differ');
    if (a.nodeType == Node.TEXT_NODE) {
      assert.equal(a.textContent, b.textContent, path + ' texts differ');
    }
    assert.equal(a.childNodes.length, b.childNodes.length, path + ' nodes.lengths differ');

    if (a.nodeType == Node.ELEMENT_NODE) {
      assert.equal(a.tagName, a.tagName, path + ' tagNames differ');
      assert.equal(a.attributes.length, b.attributes.length,
          path + ' attributes.lengths differ');
      for (var i = 0; i < a.attributes.length; ++i) {
        var attr = a.attributes[i];
        assert.equal(a.getAttribute(attr.name), b.getAttribute(attr.name),
          path + ' attribute [' + attr.name + '] values differ');
      }
    }
    for (var i = 0; i < a.childNodes.length; ++i) {
      validateNodeTree(a.childNodes[i], b.childNodes[i], path + '[' + i + '].');
    }
  }
  validateNodeTree(actual, expected, '');
}

function normalizeTextNodes(node) {
  var currentText = null;
  for (var i = node.childNodes.length - 1; i >= 0; --i) {
    var child = node.childNodes[i];
    if (child.nodeType == Node.TEXT_NODE) {
      if (currentText == null) {
        currentText = child;
      } else {
        currentText.textContent = child.textContent + currentText.textContent;
        child.remove();
      }
    } else {
      if (currentText && !currentText.textContent) {
        currentText.remove();
      }
      currentText = null;
    }
    if (child.nodeType == Node.ELEMENT_NODE) {
      normalizeTextNodes(child);
    }
  }
  if (currentText && !currentText.textContent) {
    currentText.remove();
  }
}


function nodeToHTML(node) {
  var host = document.createElement('div');
  host.appendChild(node.cloneNode(true));
  return host.innerHTML;
}

function compare(html, expected, data) {
  var fragment = stache.createFragment(html);
  var template = stache.fromFragment(fragment);
  var resultingFragment = template.render(data);
  validateToHTML(resultingFragment, expected);
}

function validateToHTML(dom, html) {
  var expectedDOM = stache.createFragment(html);
  chai.assert.dom(dom, expectedDOM);
}
