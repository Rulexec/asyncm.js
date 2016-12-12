var assert = require('assert'),

    M = require('../asyncm');

describe('Promises/A+', function() {
  describe('.then', function() {
    it('should run async and resolve', function(done) {
      M.timeout(function() { return M.pure(null, 42); }, 0).then(function(value) {
        assert.equal(value, 42);
        done();
      });
    });

    it('should run async and reject', function(done) {
      M.timeout(function() { return M.pure(13); }, 0).then(null, function(error) {
        assert.equal(error, 13);
        done();
      });
    });
  });
});
