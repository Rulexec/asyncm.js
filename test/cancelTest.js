var assert = require('assert'),

    M = require('../asyncm2'),
    testUtil = require('./util'),
		util = require('util');

describe('M', function() {
	var resultTwo = M.result(2),
	    errorTwo = M.error(2);

	var incrementToResult = testUtil.incrementToResult,
	    incrementToError = testUtil.incrementToError;

	describe('simple cancel', function() {
		it('should result cancel argument', function(done) {
			var cancelHandlerExecuted = false;

			var running = M.sleep(1000).run(null, null, function(error, result) {
				cancelHandlerExecuted = true;

				assert(!error);
				assert.equal(result, 42);
			});

			running.cancel(42).run(function() {
				assert(cancelHandlerExecuted);

				done();
			});
		});
	});
	
	describe('chained cancel', function() {
		it('should not execute handler', function(done) {
			var handlerExecuted = false,
			    cancelHandlerExecuted = false;

			var running = M.sleep(1000).result(function() {
				firstHandlerExecuted = true;
				assert(false);
				return M.sleep(1000);
			}).run(null, null, function(error, result) {
				cancelHandlerExecuted = true;

				assert(!error);
				assert.equal(result, 42);
			});

			running.cancel(42).run(function() {
				assert(cancelHandlerExecuted);
				assert(!handlerExecuted);

				done();
			});
		});

		it('should not execute second handler', function(done) {
			var firstHandlerExecuted = false,
			    secondHandlerExecuted = false,
			    cancelHandlerExecuted = false;

			var running = M.sleep(100).result(function() {
				firstHandlerExecuted = true;
				return M.sleep(100);
			}).result(function() {
				secondHandlerExecuted = true;
				assert(false);
				return M.sleep(1000);
			}).run(null, null, function(error, result) {
				cancelHandlerExecuted = true;

				assert(!error);
				assert.equal(result, 42);
			});

			setTimeout(function() {
				running.cancel(42).run(function() {
					assert(cancelHandlerExecuted);
					assert(firstHandlerExecuted);
					assert(!secondHandlerExecuted);

					done();
				});
			}, 150);
		});

		it('should error, if already finished', function(done) {
			var firstHandlerExecuted = false,
			    secondHandlerExecuted = false,
			    cancelHandlerExecuted = false,
					resultHandlerExecuted = false;

			var running = M.sleep(5).result(function() {
				firstHandlerExecuted = true;
				return M.sleep(5);
			}).result(function() {
				secondHandlerExecuted = true;
				return M.sleep(5);
			}).run(function() {
				resultHandlerExecuted = true;
			}, null, function() {
				cancelHandlerExecuted = true;
				assert(false);
			});

			setTimeout(function() {
				running.cancel(42).run(null, function(error) {
					assert(error === M.CANCEL_RESULT.ALREADY_FINISHED);

					assert(firstHandlerExecuted);
					assert(secondHandlerExecuted);
					assert(!cancelHandlerExecuted);
					assert(resultHandlerExecuted);

					done();
				});
			}, 50);
		});
	});

	describe('cancel', function() {
		it('should be notified, when cancel happens', function(done) {
			var firstHandlerExecuted = false,
			    secondHandlerExecuted = false,
			    cancelHandlerExecuted = false,
					cancelNotified = false,
					secondCancelNotified = false;

			var running = M.sleep(100).result(function() {
				firstHandlerExecuted = true;
				return M.sleep(100);
			}).cancel(function(error, result) {
				cancelNotified = true;
				assert(!error);
				assert.equal(result, 42);
			}).result(function() {
				secondHandlerExecuted = true;
				assert(false);
				return M.sleep(1000);
			}).cancel(function() {
				secondCancelNotified = true;
				assert(false);
			}).run(null, null, function(error, result) {
				cancelHandlerExecuted = true;

				assert(!error);
				assert.equal(result, 42);
			});

			setTimeout(function() {
				running.cancel(42).run(function() {
					assert(cancelHandlerExecuted);
					assert(firstHandlerExecuted);
					assert(!secondHandlerExecuted);
					assert(cancelNotified);
					assert(!secondCancelNotified);

					done();
				});
			}, 150);
		});

		it('should not notify finished branch', function(done) {
			var firstHandlerExecuted = false,
			    secondHandlerExecuted = false,
			    cancelHandlerExecuted = false,
					firstCancelNotified = false,
					secondCancelNotified = false;

			var running = M.sleep(100).result(function() {
				firstHandlerExecuted = true;
				return M.sleep(100);
			}).cancel(function() {
				firstCancelNotified = true;
				assert(false);
			}).result(function() {
				secondHandlerExecuted = true;
				return M.sleep(1000);
			}).cancel(function(error, result) {
				secondCancelNotified = true;
				assert(!error);
				assert.equal(result, 42);
			}).run(null, null, function(error, result) {
				cancelHandlerExecuted = true;

				assert(!error);
				assert.equal(result, 42);
			});

			setTimeout(function() {
				running.cancel(42).run(function() {
					assert(cancelHandlerExecuted);
					assert(firstHandlerExecuted);
					assert(secondHandlerExecuted);
					assert(!firstCancelNotified);
					assert(secondCancelNotified);

					done();
				});
			}, 250);
		});
	});
});
