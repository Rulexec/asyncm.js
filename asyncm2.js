(function(global) {

var CANCEL_RESULT = {
	ALREADY_FINISHED: {type: 'already_finished'},
	ALREADY_CANCELLED: {type: 'already_cancelled'}
};
M.CANCEL_RESULT = CANCEL_RESULT;

M.result = function() {
	var args = arguments;
	return new M(function(result, error) {
		result.apply(null, args);
	});
};
M.error = function() {
	var args = arguments;
	return new M(function(result, error) {
		error.apply(null, args);
	});
};

function MContext() {
	this.cont = function(){};
}

function doRun(run, onResult, onError, onCancel) {
	var isFinished = false,
	    isCancelled = false;

	// TODO: pass a context

	var mRunning = run(proxyFinishCancel(onResult), proxyFinishCancel(onError));

	function proxyFinishCancel(f) {
		return function() {
			if (isFinished) {
				console.error('AsyncM: second run', arguments);
				return;
			}

			isFinished = true;

			if (isCancelled) {
				console.warn('AsyncM: ignored by cancel', arguments);
				return;
			}

			f.apply(null, arguments);
		};
	}

	return {
		cancel: function() {
			if (isFinished) return M.error(CANCEL_RESULT.ALREADY_FINISHED);
			if (isCancelled) return M.error(CANCEL_RESULT.ALREADY_CANCELLED);

			var args = arguments;

			return new M(function(result, error) {
				isCancelled = true;

				if (mRunning && mRunning.cancel) {
					// TODO: pass a context
					return mRunning.cancel.apply(null, args).result(function() {
						onCancel.apply(null, [null].concat(Array.prototype.slice.call(arguments)));
						return M.result.apply(null, arguments);
					}).error(function() {
						onCancel.apply(null, arguments);
					}).run(result, error, function() {
						console.warn('AsyncM: cancel of cancel? You are serious?');
					});
				} else {
					onCancel.apply(null, [null].concat(Array.prototype.slice.call(args)));
					result.apply(null, args);
					
					return {
						cancel: function() { return M.error(CANCEL_RESULT.ALREADY_FINISHED); }
					};
				}
			});
		}
	};
}

function M(prevM, nextResult, nextError, nextCancel) {
	if (arguments.length === 1 && typeof prevM !== 'function') {
		throw new Error('AsyncM: not function passed');
	}
	// TODO: optimize to fill holes as possible

	this.result = function(f) {
		if (!f || typeof f !== 'function') throw new Error('AsyncM: not function passed');
		return new M(this, f, null, null);
	};
	this.error = function(f) {
		if (!f || typeof f !== 'function') throw new Error('AsyncM: not function passed');
		return new M(this, null, f, null);
	};
	this.cancel = function(f) {
		if (!f || typeof f !== 'function') throw new Error('AsyncM: not function passed');
		return new M(this, null, null, f);
	};

	this.run = function(onResult, onError, onCancel, lastOnCancel, finalOnCancel) {
		if (!onResult) onResult = function() { console.warn('AsyncM result', arguments); };
		if (!onError) onError = function() { console.warn('AsyncM error', arguments); };
		if (!onCancel) onCancel = function() { console.warn('AsyncM cancel', arguments); };

		if (nextResult || nextError || nextCancel) {
			// Watch for `nextCancel`, it must be triggered only once

			var isCancelled = false,
			    isFullyFinished = false,
			    nextRunning = null;

			var running = prevM.run(
				handleNextRun(nextResult, onResult),
				handleNextRun(nextError, onError),
				function() {
					var cancelHandler = nextCancel || lastOnCancel || onCancel;

					cancelHandler.apply(null, arguments);
					if (finalOnCancel) finalOnCancel.apply(null, arguments);
				},
				nextCancel || lastOnCancel || onCancel,
				finalOnCancel || onCancel
			);

			function handleNextRun(nextHandler, nextOnHandler) {
				return function() {
					if (nextRunning) {
						console.error('AsyncM: second-time run', arguments);
						return;
					}
					if (isCancelled) {
						console.warn('AsyncM: ignored by cancel', arguments);
						return;
					}

					if (nextHandler) {
						// TODO: pass a context
						var m = nextHandler.apply(null, arguments);

						if (!m || !m.run) {
							throw new Error('AsyncM: not M from binding: ' + m);
						}

						nextRunning = m.run(
							onResult,
							onError,
							function() {
								var cancelHandler = nextCancel || lastOnCancel || onCancel;

								cancelHandler.apply(null, arguments);
								if (finalOnCancel) finalOnCancel.apply(null, arguments);
							},
							nextCancel || lastOnCancel,
							finalOnCancel
						);
					} else {
						isFullyFinished = true;
						nextOnHandler.apply(null, arguments);
					}
				};
			}

			return {
				cancel: function() {
					var args = arguments;

					return (new M(function(result, error) {
						isCancelled = true;
						result();
					})).result(function() {
						return running.cancel.apply(null, args);
					}).error(function(error) {
						if (error !== CANCEL_RESULT.ALREADY_FINISHED) return M.error.apply(null, arguments);

						// TODO: pass a context
						if (!isFullyFinished) {
							return nextRunning.cancel.apply(null, args);
						} else {
							return M.error(CANCEL_RESULT.ALREADY_FINISHED);
						}
					});
				}
			};
		} else {
			return doRun(prevM, onResult, onError, onCancel);
		}
	};
}

var m = new M(function(callback) {
	var timeoutId = setTimeout(function() { callback(42); }, 500);

	return {
		cancel: function(n) {
			clearTimeout(timeoutId);
			console.log('cancel timeout');
			return new M(function(result, error) { result(n * 2); });
		}
	};
});

// Utils
M.sleep = function(t) {
	if (typeof t !== 'number' || t < 0) return M.error(new Error('Wrong M.sleep value: ' + t));

	return new M(function(result) {
		var timeoutId = setTimeout(function() {
			result();
		}, t);

		return {
			cancel: function() {
				var args = arguments;
				return new M(function(result) {
					clearTimeout(timeoutId);
					result.apply(null, args);
				});
			}
		};
	});
};

if (typeof module !== 'undefined' && module.exports !== 'undefined') {
  module.exports = M;
} else {
  var oldM = global.M;
  global.M = M;
  global.M.noConflict = function() {
    if (global.M === M) global.M = oldM;
    global.M.noConflict = function() { return M; };
    return M;
  };
}

})(this);
