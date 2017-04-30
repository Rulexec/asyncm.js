var assert = require('assert'),

    M = require('../asyncm2'),
    testUtil = require('./util');

describe('M', function() {
	var resultTwo = M.result(2),
	    errorTwo = M.error(2);

	var incrementToResult = testUtil.incrementToResult,
	    incrementToError = testUtil.incrementToError;

	describe('.result', function() {
		it('should result to it\'s argument', function(done) {
			resultTwo.run(function(result) {
				assert.equal(result, 2);
				done();
			});
		});
	});
	describe('.error', function() {
		it('should error to it\'s argument', function(done) {
			errorTwo.run(null, function(error) {
				assert.equal(error, 2);
				done();
			});
		});
	});

	describe('chain of results', function() {
		it('should result', function(done) {
			resultTwo.result(incrementToResult).result(incrementToResult
			).run(function(result) {
				assert.equal(result, 2 + 1 + 1);
				done();
			});
		});
	});
	describe('inversing chain', function() {
		it('should result', function(done) {
			resultTwo.result(incrementToResult
			).result(incrementToError
			).result(incrementToResult // ignored
			).error(incrementToResult
			).error(incrementToError // ignored
			).result(incrementToError
			).run(null, function(error) {
				assert.equal(error, 2 + 1 + 1 + 1 + 1);
				done();
			});
		});
	});
});
