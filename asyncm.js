(function(global) {
  var tick, clearTick;
  if (typeof setImmediate === 'function') {
    tick = setImmediate;
    clearTick = clearImmediate;
  } else {
    tick = function(f) { return setTimeout(f, 0); };
    clearTick = clearTimeout;
  }

  M.tick = function() {
    var args = arguments;
    return M.sleep(0).then(function() {
      this.cont.apply(null, args);
    });
  };

  M.ALREADY_FINISHED = 'already_finished';
  M.CANCELLED = 'cancelled';
  M.CANNOT_BE_CANCELLED = 'cannot_be_cancelled';

  M.pure = function() {
    var args = arguments;

    return M(function(callback) {
      callback.apply(null, args);
      return M.alreadyFinished();
    });
  };
  M.pureF = function(f) {
    return M(function(callback, options) {
      callback(null, f(options));
      return M.alreadyFinished();
    });
  };
  M.pureM = function(f) {
    return M(function(callback, options) {
      return f(options).run(callback, options);
    });
  };

  M.lazy = function(f) {
    var g = function(callback, options) {
      var m = f(options);

      g = function(callback, options) {
        return m.run(callback, options);
      };

      return g(callback, options);
    };

    return M(g);
  };
  M.lazyF = function(f) {
    return M.lazy(function(options) { return M.lazyM(f(options)); });
  };
  M.lazyM = function(m) {
    var result = null;
    var awaiters = [];

    var g = function(callback, options) {
      g = function(callback) {
        var awaiter = {
          cancelled: false,
          callback: callback
        };

        awaiters.push(awaiter);

        return {
          cancel: function() {
            awaiter.cancelled = true;
            return M.pure(null, M.CANCELLED);
          }
        };
      };

      m.run(function() {
        result = arguments;

        g = function(callback) {
          callback.apply(null, result);
          return M.alreadyFinished();
        };

        g(callback);
        awaiters.forEach(function(awaiter) {
          if (awaiter.cancelled) return;
          g(awaiter.callback);
        });
        awaiters = null;
      }, options);

      // TODO: can be cancelled, if nobody else don't want a result
      return M.cannotBeCancelled();
    };

    return M(function() { return g.apply(null, arguments); });
  };

  M.sleep = function(t) {
    var setSleep, clearSleep;
    if (t > 0) {
      setSleep = function(f) { return setTimeout(f, t); };
      clearSleep = clearTimeout;
    } else if (t === 0) {
      setSleep = tick;
      clearSleep = clearTick;
    } else {
      return M.pure('M.sleep timeout lesser than 0: ' + t);
    }

    return M(function (callback, options) {
      var runned = false, cancelled = false;

      var id = setSleep(function() {
        runned = true;

        callback(null, options);
      });

      return {
        cancel: function() { return M(function (callback) {
          if (runned) { callback(null, M.ALREADY_FINISHED); return; }
          if (cancelled) { callback(null, M.CANCELLED); return; }

          clearSleep(id);
          cancelled = true;
          callback(null, M.CANCELLED);

          return M.alreadyFinished(); // TODO: cancel of cancel is implementable
        }); }
      };
    });
  };

  M.timeout = function(f, t) {
    return M.sleep(t).bind(f);
  };

  M.parallel = function(ps, options) {
    if (ps.length === 0) return M.pure(null, []);

    return M(function(callback, mOptions) {
      options = options || {};
      var errorCatcher = options.errorCatcher,
          drop = options.drop,
          single = options.single,
          limit = Math.min(options.limit || ps.length, ps.length),
          f = options.f;

      if (typeof errorCatcher !== 'function') errorCatcher = function(){};

      var handleError = function(error) {
        callback(error);

        handleError = errorCatcher;
      };
      
      var left = ps.length;

      var i;
      if (!drop) {
        var results = [];
        for (i = 0; i < left; i++) results.push(null);
      }

      var runPos = 0,
          running = 0;

      for (i = 0; i < limit; i++) {
        runOne();
      }

      function runOne() {
        if (runPos >= ps.length) return;

        var index = runPos;
        var m = ps[runPos++];
        if (f) m = f(m, index);

        running++;
        m.run(function(error) {
          if (error) {
            handleError(error);
            return;
          }

          if (!drop) {
            results[index] = Array.prototype.slice.call(arguments, 1);
            if (single) results[index] = results[index][0];
          }

          left--;

          if (left === 0) {
            if (drop) callback(null);
            else callback(null, results);
          } else {
            running--;
            if (running < limit) {
              // FIXME
              setTimeout(runOne, 0);
            }
          }
        }, mOptions);
      }

      return M.cannotBeCancelled(); // TODO: can be
    });
  };
  
  M.alreadyFinished = function() {
    return {
      cancel: function() { return M.pure(null, M.ALREADY_FINISHED); }
    };
  };
  M.cannotBeCancelled = function() {
    return {
      cancel: function() { return M.pure(null, M.CANNOT_BE_CANCELLED); }
    };
  };

  function M(run) {
    if (!(this instanceof M)) return new M(run);

    var self = this;

    this.then = function(f) {
      return new M(function(callback, options) {
        var nextRunning = null,
            cancelled = false,
            cancelling = false,
            nextCancelled = false;

        var running = self.run(function() {
          if (!cancelling) {
            var args = arguments;

            nextRunning = (function() {
              var m, continued = null;
              try {
                m = f.apply({
                  cont: function() {
                    continued = arguments;
                  }
                }, args);
              } catch (e) {
                callback(e);
                return M.alreadyFinished();
              }

              if (continued !== null) {
                callback.apply(null, continued);
                return M.alreadyFinished();
              }

              if (!(m instanceof M)) {
                if (m === undefined) {
                  callback.bind(null, null).apply(null, args);
                  return M.alreadyFinished();
                } else {
                  callback(null, m);
                  return M.alreadyFinished();
                }
              }

              return m.run(callback, options);
            })();
          } else {
            nextCancelled = true;
          }
        }, options);

        var alreadyFinished = false,
            cannotBeCancelled = false;

        return {
          cancel: function() {
            if (cancelled) return M.pure(null, M.CANCELLED);
            if (alreadyFinished) return M.pure(null, M.ALREADY_FINISHED);
            if (cannotBeCancelled) return M.pure(null, M.CANNOT_BE_CANCELLED);

            cancelling = true;

            return running.cancel().bind(function(status) {
              if (status === M.CANCELLED) {
                cancelled = true;
                return M.pure(null, M.CANCELLED);
              } else if (status === M.ALREADY_FINISHED) {
                if (nextCancelled) {
                  cancelled = true;
                  return this.cont(null, M.CANCELLED);
                } else {
                  return nextRunning.cancel().bind(function(nextStatus) {
                    if (nextCancelled) {
                      cancelled = true;
                      return this.cont(null, M.CANCELLED);
                    }

                    switch (nextStatus) {
                    case M.CANCELLED:
                      cancelled = true;
                      return this.cont(null, M.CANCELLED);
                    case M.ALREADY_FINISHED:
                      alreadyFinished = true;
                      return this.cont(null, M.ALREADY_FINISHED);
                    case M.CANNOT_BE_CANCELLED:
                      cannotBeCancelled = true;
                      return this.cont(null, M.CANNOT_BE_CANCELLED);
                    default: throw new Error('Unknown status: ' + nextStatus);
                    }
                  });
                }
              } else if (status === M.CANNOT_BE_CANCELLED) {
                cannotBeCancelled = true;
                return this.cont(null, M.CANNOT_BE_CANCELLED);
              } else {
                throw new Error('Unknown status: ' + status);
              }
            });
          }
        };
      });
    };

    this.bind = function(f) {
      return self.then(function(error) {
        if (error) this.cont(error);
        else return f.apply(this, Array.prototype.slice.call(arguments, 1));
      });
    };

    this.bindError = function(f) {
      return self.then(function(error) {
        if (error) return f.call(this, error);
        else this.cont.apply(null, arguments);
      });
    };

    this.skip = function(m) {
      return self.bind(function() { return m; });
    };

    this.fmap = function(f) {
      return self.bind(function() {
        this.cont(null, f.apply(null, arguments));
      });
    };

    this.run = function(callback, options) {
      if (typeof callback !== 'function') callback = function(){};
      if (!options) options = {};

      return normalizeRunning(run(callback, options));
    };

    function normalizeRunning(running) {
      if (!running) running = {};
      if (!running.cancel) running.cancel = function() {
        return M(function(callback) {
          callback(null, M.CANNOT_BE_CANCELLED);
          return M.cannotBeCancelled();
        });
      };
      return running;
    }
  }

  if (typeof module !== 'undefined' && module.exports !== 'undefined') {
    module.exports = M;
  } else if (typeof angular !== undefined && typeof angular.module === 'function') {
    angular.module('asyncm', []).service('M', function() { return M; });
  } else {
    var oldM = window.M;
    global.M = M;
    global.M.noConflict = function() {
      if (global.M === M) global.M = oldM;
      return M;
    };
  }
})(this);
