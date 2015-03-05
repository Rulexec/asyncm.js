var assert = require('assert'),

    M = require('../asyncm');

describe('utils', function() {
  it('M.once must allow to call function only once', function() {
    var c = 0;
    var f = M.once(function() {
      c++;
    });

    f();
    f();
    f();

    assert.equal(c, 1);
  });
});
