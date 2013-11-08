/*!
 * Test framework for running mustache.js tests against the DOM.
 *
 * Test contents are from:
 * http://github.com/janl/mustache.js
 */


var testNames = [
  "ampersand_escape",
  "apostrophe",
  "array_of_strings",
  "backslashes",
  "bug_11_eating_whitespace",
  //"changing_delimiters", // no support for delimiters
  "check_falsy",
  "comments",
  //"complex", // Binding of the 'this' in the callback
  "context_lookup",
  //"delimiters",
  "disappearing_whitespace",
  "dot_notation",
  "double_render",
  "empty_list",
  "empty_sections",
  "empty_string",
  "empty_template",
  "error_not_found",
  "escaped",
  "falsy",
  "grandparent_context",
  //"higher_order_sections", // no support for custom renderers
  "included_tag",
  "inverted_section",
  "keys_with_questionmarks",
  "malicious_template",
  "multiline_comment",
  "nested_dot",
  //"nested_higher_order_sections", // no support for custom renderers
  "nested_iterating",
  "nesting",
  "nesting_same_name",
  "null_string",
  "null_view",
  "partial_array",
  "partial_array_of_partials_implicit",
  "partial_array_of_partials",
  "partial_empty",
  "partial_template",
  "partial_view",
  "partial_whitespace",
  "recursion_with_same_names",
  "reuse_of_enumerables",
  "section_as_context",
  "simple",
  "string_as_context",
  "two_in_a_row",
  "two_sections",
  "unescaped",
  "whitespace",
  "zero_view"
];

function getText(uri, done) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    done(xhr.responseText);
  };
  xhr.open('GET', uri, true);
  xhr.send();
};

function loadTest(name, done) {
  var data = {};
  var outstanding = 0;
  function requestComplete() {
    --outstanding;
    if (outstanding == 0) {
      done(data);
    }
  }
  ++outstanding;
  getText('_files/' + name + '.js', function(text) {
    data.js = eval(text);
    requestComplete();
  });
  ++outstanding;
  getText('_files/' + name + '.mustache', function(text) {
    data.mustache = text;
    requestComplete();
  });
  ++outstanding;
  getText('_files/' + name + '.txt', function(text) {
    data.text = text;
    requestComplete();
  });
  if (name.indexOf('partial_') == 0) {
    ++outstanding;
    getText('_files/' + name + '.partial', function(text) {
      data.partial = text;
      requestComplete();
    });
  }
}

suite('mustache.js', function() {
  var assert = chai.assert;

  function validateToHTML(dom, html) {
    var expectedDOM = stache.createFragment(html);
    assert.dom(dom, expectedDOM);
  }

  function runTest(data) {
    var fragment = stache.createFragment(data.mustache);
    var template = stache.fromFragment(fragment);
    var partials = {};
    if (data.partial != undefined) {
      partials['partial'] = stache.fromHTML(data.partial);
    }
    var resultingFragment = template.render(data.js, partials);
    validateToHTML(resultingFragment, data.text);
  }

  for (var i = 0; i < testNames.length; ++i) {
    var name = testNames[i];
    (function(name) {
      test(name, function(done) {
        loadTest(name, function(data) {
          runTest(data);
          done();
        });
      });
    })(name);
  }
});
