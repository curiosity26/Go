# Go
A procedural automation workflow framework, not to be confused with Facebook's Go language.

Go makes it easy to create procedural jobs in JavaScript and run them in batch. By writing batch jobs that focus only on a particular task, and defining dependencies for the job to run, batch jobs can be reused and reconfigured easily in other batches.

Many aspects of Go have been designed to be familiar to the majority of JavaScript developers, especially Angular JS devs, because the DI of Go is modeled after it.

The main function of Go is a Constructor function, but the you don't have to use the `new` keyword to instatiate a new Go instance. Each Go instance is privately scoped for security, however, Go Modules are registered globally, so communication between Go instances can occur via a shared Module.

Go instances are also Promises. By using the functions `then(success, failure)` and `finally(cb)`, you can trigger callbacks to respond to the outcome of Go's workflow.

## Basic Usage

Using Go is very easy. You don't need to preconfigure anything to get started. The only thing you need to know is how to register 'work'.

Every piece of 'work' is an object with 2 properties, `$run` and `$delay`. `$run` is the [injectable function](#injectable-functions) that does the work and `$delay` is the number of milliseconds you would like to wait before the workflow is run after it is triggered. The `$delay` property is optional by `$run` is required.

*Example Work Object*

```JavaScript
{
    $run: ['next', function(next) {
        // Do Something Here
        // Now trigger the next work object
        next();
    }],
    $delay: 0
}
```

There are two methods to register work: `add()` and `run()`.

### add()

The `add()` function takes one parameters and it is the work object as described above.

### run()

The `run()` is a decorator function for `add()` that takes only an injectable function as a parameter. This function will create a new work object with a `$delay` of 0 and set the injectable function you've provided as the `$run` parameter.

### next([err])

`next` is an injectable variable offered in workflows that allows you to control when the next workflow is triggered or when the success and finally triggers are fired. `next()` does not block further execution of your workflow so next can be bound to DOM events, timers or placed in strategic areas of you code. If `next()` is passed a value, it will trigger an error and will stop Go, but will not stop the current workflow. You will have to execute `return next(err)` to stop Go and the workflow.

#### Asynchronous Work

Technically, all work in Go is **asynchronous**. If you inject `next()` into your work then Go will wait for you to call `next()` to proceed. If you *don't* inject it, then Go will call it for you directly after the work is invoked, effectively running two work operations simultaneously. Essentially, you could call an entire batch of work to run independent of one another.

The fact that all work in Go in asynchronous means that once `go.start()` is fired, it will not block the rest of your application script from running. Nothing should ever wait on Go that isn't supposed to.

### start()

Starts the workflow registered with the Go instance

### stop()

Stops workflow from triggering

### then([success], [failure])

Registers success and failure callbacks. These are [injectable functions](#injectable-functions). The `failure` callback is allowed an `$error` object which is the `Error` that was thrown.

Workflow that is triggered without injecting `next()`, aka 'asynchronous mode', cannot trigger the `failure` callback. Once all the work is triggered without any errors, the `success` callback will be triggered.

### finally(callback)

When all the work has been triggered, success or failure, `callback` is called. The callback can also be an [injectable function](#injectable-functions).

#### #FinallyNotFinally

In some cases, the *finally callback* can be fired before the work is complete. If any asynchronous operations are still running after all the work has been triggered or the last work operation is invoked *without* the `next()` injectable. 

For instance, if Go is given three operations and the second operation is called asynchronously (without `next()`) and this operation takes longer to run than the third operation, then `finally()` would be fired before all the work is done.

When the last piece of work is injected `next()` then finally will wait for `next()` to be called from within the work, otherwise, once the last piece of work is triggered, `success` and `finally` will be triggered, in that order, and the last piece of work could still be running.

*Example*

```JavaScript
var go = Go();

go.run(['next', function(next) {
        if (confirm("Should we continue?")) {
            next();
        } else {
            next("This will trigger an error, preventing future work calls and trigger a failure callback, if configured");
        }
    }])
    .value('test', function() { console.log("I'm testing you");})
    .add({
        $run: ['test', function(test) {
            // After a second, this function will run
            test(); // Look in your console
        }],
        $delay: 1000
    })
    .then(function() {
        console.log("Yay! It ran good");
    }, function($e) {
        console.log("It ran badded.", $e);
    })
    .finally(['$go', function($go) {
        // Finally would fire before the last workflow is complete.
        // So you should see these console messages before you see "I'm testing you"
        console.log("For better or for worse, I am called when all the work is done.");
        console.log("Also, $go is an injectable value equal the current instantiation of Go");
        console.log("And yes, callbacks are also injectable functions");
    }]);
    
// Go will not start until you run this
go.start();
```

## Dependency Injection

If you've ever used [Angular JS](https://www.angularjs.org/), then you won't have any problem with Go. There are some slight differences, as documented below, but for the most part, DI functions primarily the same way. The reason for this is to easily allow services to port into Go and to allow workflows created in Go to leverage the power of other libraries and frameworks.

The way dependency injection works is: objects can be injected into a function once they are declared to Go. Injectable variables can be declared via a `provider`, `factory`, `service`, `value` or `constant` (aka injectables) as described in [$provide](#provide).

### Auto-included Injectables

Like Angular, Go makes its DI components available for injection.

#### $injector

The `$injector` is the service in which all providers, services, factories, values, constants and decorators (injectables) are registered within a Go instance. The `$injector` has the following methods:

##### get(name, [caller])

This method gets the instance of the service. The `caller` parameter is optional and is the calling function for use for error tracing.

##### invoke(fn, [self], [locals])

`invoke()` is the function that creates the usable instance from an injectable function. `self` becomes `this` in the `fn` function. `locals` is a HashMap of variable names and values that override the `$injector`'s values for this invocation.

##### has(name)

A function to determine if the `$injector` has the `name` service.

##### instantiate(Type, [locals])

`Type` is an annotated constructor function. The `instantiate()` function creates a new instance of the `Type` constructor and returns it.

##### annotate(fn, [strictDi])

This method returns an array of the names which the `fn` function requires for injection.


#### $provide

The `$provide` service is what registers the providers, services, factories, values, constants and decorators (injectables) with the `$injector`.

##### provider(name, provider)

A `provider` is a constructor function which returns a `factory` object.

##### factory(name, factory)

A `factory` is an object that requires only one property, `$get`, whose value is an injectable function that is instantiated when an injectable function requests the factory by its name. The instantiated result is held in a cached object during runtime.

##### service(name, service)

A `service` is a the injectable function. The `service()` function, simply takes the `service` object and creates a `factory` object where the value of `$get` is the `service` parameter object.

##### value(name, value)

A `value` can be virtually anything. The `value()` function simply takes the `value` parameter and wraps it with a function which returns the `value` parameter and registers the new function within a `factory` in Go.

##### constant(name, constant)

The `constant()` function is just like `value()` except that once a `constant` is set, it can't be overridden, where a `value` can be changed.

##### decorator(name, decorator)

A `decorator` is an injectable function which intercepts the creation of a `service` as referenced by the `name` parameter (so `name` is the name of the service you want to decorate, not the name of the `decorator`). A `decorator` can be injected with any available objects as well as a special object, `$delegate`, which is the original service instance, which can be altered or referenced via this `decorator`. A `decorator` must return the new or decorated instance to replace the `name` service.

#### $extend(obj1, obj2, [obj3...n])

`$extend` is a utility function which deep copies properties from all items provided into the first argument item. If the first argument is `{}` then a new object is returned.

#### $go

The current Go instance is made available as an injectable using the name `$go`. A Go instance extends `$provide`'s methods.

#### Injectable Functions

Functions can be injected with objects in three different ways (in order of preference):

1. An array of the names of the objects to inject and the last item in the array is the function to inject into:
  
  ```JavaScript
  ['$injector', '$provide', function($injector, $provider) {
      // Do stuff here
  }]
  ```

2. The `$inject` property set with an array of names:
  
  ```JavaScript
  var myFunction = function($injector, $provide) {
      // Do something
  };

  myFunction.$inject = ['$injector', '$provide'];
  ```

3. Lastly, the `$injector` can infer the names from the function itself. **This will not work on minifed scripts**
  
  ```JavaScript
  var myFunction = function($injector, $provide) {
     // Do more cool stuff, but not if you're going to minify this. Tsk tsk
  }
  ```

### Modules

Like AngularJS, you can extend the functionality of Go by loading in Modules. The creation of these modules is also very similar to AngularJS, but not as expansive. For instance, there's no need for directives or controllers, the 'Work' is essentially the controller.

Modules are how to create reusable code that can be used on any Go instance. Modules can also provide a secure way for different Go instances to communicate with one-another.

A module object, returned by `Go.Module()`, extends the same methods as [`$provide`](#provide) with the addition of a `config(fn)` method, which takes an injectable function as a parameter. The only reliable injectables in `config(fn)` are `$injector`, `$provide` and `$extend`. If the module depends on another module, then any injectables made available by the dependency module would also be available.

A typical Module file would look like this:

*MyModule.js*
```JavaScript
Go.Module('MyModule', ['DependecyModule1', 'DependencyModule2'])
    .value('aValueUsableByAnyGoInstanceWhoRequiresThisModule', true)
    .constant('api_key', '0x93j3j2n1s8y3')
    .provider('$jQuery', function() {
        return {
            $get: jQuery.noConflict();
        }
    })
    .provider('$http', ['$extend', function() {
        var $self = this;
        this.headers = {};
        
        this.setHeaders = function (headers) {
            this.headers = $extend({}, headers);
        };
        
        return {
            $get: function() {
                return function(config) {
                    var xhr = new XMLHttpRequest(),
                        _success,
                        _failure;
                        
                    for (var n in $self.headers) {
                        xhr.setRequestHeader(n, $self.headers[n]);
                    }

                    xhr.open(config.method || 'GET', config.url, !!config.async && config.async, config.user, config.password);
                    
                    xhr.addEventListener('load', function(e) {
                        if (!!_success) {
                            _success(e.response, e.statusText, e.target);
                        }
                    });
                    
                    xhr.addEventListener('error', function(e) {
                        if (!!_failure) {
                            _failure(e.details, e.target);
                        }
                    });
                    
                    xhr.send(config.data);
                    
                    return {
                        then: function(success, failure) {
                            _success = success.bind(xhr);
                            _failure = failure.bind(xhr);
                        }
                    };
                }
            }
        };
    }]);
```

*app.js*
```JavaScript
var go = Go(['MyModule'])
    .run(['api_key', '$http', function(api_key, $http) {
        // Promise you'll never use an API key like this, please!
        $http({
                url: '/somewhere?key=' + api_key,
                method: 'POST',
                data: {'Things'}
            })
            .then(function(data) {
                console.log(data);
            });
    }]);
```
