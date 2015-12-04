# Go
A procedural automation workflow framework, not to be confused with Facebook's Go language.

Go makes it easy to create procedural jobs in javascript and run them in batch. By writing batch jobs that focus only on a particular task, and defining dependencies for the job to run, batch jobs can be reused and inconfigured easily in other batches.

Many aspects of Go have been designed to be familiar to the majority of JavaScript developers, especially AngularJS devs because the DI of Go is modeled after it.

The main function of Go is a Constructor function, but the you don't have to use the `new` keyword to instatiate a new Go instance. Each Go instance is privately scoped for security, however, Go Modules are registered globally, so communication between Go instances can occur via a shared Module.

Go instances are also Promises. By using the functions `then(success, failure)` and `finally(cb)`, you can trigger callbacks to respond to the outcome of Go's workflow.

## Basic Usage

Using Go is very easy. You don't need to preconfigure anything to get started:

```JavaScript
var go = Go();

go.run(['next', function(next) {
    // next is a function offered in workflows 
    // that allows you to control when the next workflow is triggered
    // or when the success and finally triggers are fired
    // next does not block further execution of your workflow
    // so next can be bound to DOM events, timers or placed in strategic areas of you code.
    // If next is passed a value, it will trigger an error and will stop Go
    
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
    });
    
// Go will not start until you run this
go.start();
```

## Dependecy Injection

If you've ever used [AngularJS](https://www.angularjs.org/), then you won't have any problem with Go. There are some slight differences, as documented below, but for the most part, DI functions primarily the same way. The reason for this is to easily allow services to port into Go and to allow worflows created in Go to leverage the power of other libraries and frameworks.

### Modules

Like AngularJS, you can extend the functionality of Go by loading in Modules. The creation of these modules is also very similar to AngularJS, but not as expansive. For instance, there's no need for directives or controllers, the 'Work' is essentially the controller.

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
