var assert = require('assert'),

    M = require('../asyncm');

describe('M', function() {
  describe('this.cont', function() {
    it('should work in M constructor', function(done) {
      var multiplyWithDelay = M.wrap(function(callback, options, n) {
        if (typeof n === 'number') {
          setTimeout(function() {
            callback(null, n * 2);
          }, 0);
        } else {
          this.cont(n + ' is not a number');
        }
      });

      M.parallel([
        multiplyWithDelay(3),
        multiplyWithDelay('str').bindError(function(error) { this.cont(null, error); })
      ], {single: true}).run(function(error, results) {
        assert.ifError(error);
        assert.equal(results.length, 2);

        assert.equal(results[0], 6);
        assert.equal(results[1], 'str is not a number');

        setImmediate(done);
      });
    });
  });

  describe('.pure', function() {
    it('binds on non-error', function(done) {
      M.pure(null, 'answer', 42).bind(function(text, number) {
        return M.pure(null, 'The ' + text[0].toUpperCase() + text.slice(1) + ' is ' + number);
      }).run(function(error, s) {
        assert.ifError(error);
        assert.equal(s, 'The Answer is 42');
        setImmediate(done);
      });
    });

    it('then', function(done) {
      M.pure('scary', 13).then(function(scary, thirteen) {
        return M.pure(null, scary + ' ' + thirteen);
      }).run(function(error, s) {
        assert.ifError(error);
        assert.equal(s, 'scary 13');
        setImmediate(done);
      });
    });

    it('bindError not calls on non-error', function(done) {
      M.pure(null, 'no error').bindError(function() {
        expect('').toBe('Failed');
      }).run(function(error, s) {
        assert(!error, error);
        assert.equal(s, 'no error');
        setImmediate(done);
      });
    });

    it('bindError', function(done) {
      M.pure('some-error').bindError(function(error) {
        assert.equal(error, 'some-error');
        return M.pure('other-error');
      }).bind(function() {
        assert(false, 'Should not be runned');
      }).bindError(function(error) {
        assert.equal(error, 'other-error');
        return M.pure(null, 'no error');
      }).run(function(error, s) {
        assert.ifError(error);
        assert.equal(s, 'no error');
        setImmediate(done);
      });
    });

    it('bind passes data further, if function is not returned M instance', function(done) {
      M.pure(null, 1, 2, 3).bind(function(a, b, c) {
        return M.pure(null, a + b + c);
      }).bind(function(x) {
        assert.equal(x, 6);
      }).run(function(error, x) {
        assert.ifError(error);
        setImmediate(done);
      });
    });

    it('fmap should change value inside M', function(done) {
      M.pure(null, 1, 2, 3).fmap(function(a, b, c) {
        return a + b + c;
      }).run(function(error, x) {
        assert.ifError(error);
        assert.equal(x, 6);
        setImmediate(done);
      });
    });
    it('bind works like fmap, if function is returned not an M instance and not undefined', function(done) {
      M.pure(null, 1, 2, 3).bind(function(a, b, c) {
        return a + b + c;
      }).run(function(error, x) {
        assert.ifError(error);
        assert.equal(x, 6);
        setImmediate(done);
      });
    });
  });

  describe('.timeout accepts function, that returns async and timeout in ms', function() {
    var TIMEOUT = 30;

    it('runs function after this timeout and runs returned async', function(done) {
      var startTime = new Date().getTime();

      M.timeout(function() {
        return M.pure(null, new Date().getTime());
      }, 100).run(function(error, time) {
        assert.ifError(error);

        assert(time - startTime >= TIMEOUT);
        done();
      });
    });
  });

  describe('.parallel accepts array of asyncs', function() {
    it('forms async, that returns array of arrays of success results', function(done) {
      M.parallel([
        M.pure(null, 42),
        M.timeout(function() { return M.pure(null, 13); }, 5)
      ]).run(function(error, results) {
        assert.ifError(error);

        assert.deepEqual(results, [[42], [13]]);
        
        done();
      });
    });
  });
});
