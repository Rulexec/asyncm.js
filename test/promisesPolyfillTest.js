var assert = require('assert'),

    M = require('../asyncm'),
    PromisePolyfill = M._PromisePolyfill;

describe('PromisePolyfill', function() {
  describe('resolve', function() {
    it('should pass value to then', function(done) {
      (new PromisePolyfill(function(resolve, reject) {
        setTimeout(resolve.bind(null, 42), 0);
      })).then(function(value) {
        assert.equal(value, 42);
        done();
      });
    });
  });
});
