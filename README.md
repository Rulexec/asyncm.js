AsyncM
======
Cancellable promises, that are not compatible with Promises/A+ spec.
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
