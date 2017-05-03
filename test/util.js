var assert = require('assert'),

    M = require('../asyncm');

var sleep = exports.sleep = function(t) {
	return new M(function(result) {
		setTimeout(function() {
			result();
		}, t);
	});
};

exports.incrementToResult = incrementToSome(M.result);
exports.incrementToError = incrementToSome(M.error);

function incrementToSome(f) {
	return function(n) {
		assert(typeof n === 'number', n + ' must be a number');

		// To test different combinations of sync-async handlers
		if (Math.random() < 0.5) {
			return sleep(1).result(function() {
				return f(n + 1);
			});
		} else {
			return f(n + 1);
		}
	};
}
