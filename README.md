AsyncM
======
Cancellable promises
-----------------

**TODO:** Write a readme.

# Things
## M.parallel(ps, options)
Accepts array of promises, runs them in parallel, fails if one of promises is fails.

Options:

* **errorCatcher:Function** — function, that will called after first handled by callback error
* **drop:Boolean** — if true, results will be dropped
* **single:Boolean** — if true, instead of array of array of results will be returned array of first element of result
* **limit:uint** — maximum simultaneous tasks
* **f:Function(x, index) -> M** — called before running for transform data to a M
  For example, it is usable for lazy mapping of big list to async actions.

## M.wrap(f(callback, options, ...args))
Returns ```function(...args) -> M```.

Example:

```
var multiplyWithDelay = M.wrap(function(callback, options, n, delay) {
  if (typeof n === 'number') {
    setTimeout(function() {
      callback(null, n * 2);
    }, delay);
  } else {
    this.cont(n + ' is not a number');
  }
});

multiplyWithDelay(3, 500).run(function(error, x) {
  console.log(x);
});
multiplyWithDelay('str', 10000).run(function(error, x) {
  console.log(error);
});

// Resulting output:
// str is not a number
// 6
```
