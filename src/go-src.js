var _modules = {};

// Go
var Go = function (requires) {
    var $self = this instanceof Go ? this : Object.create(Go.prototype),
        $work = [],
        $index = -1,
        _success = null,
        _failure = null,
        _finally = null,
        $injector = Go.Injector(),
        $provide = $injector.invoke(Go.Provider(), $self);

    $self.registerModules = function(requires) {
        if (requires instanceof Array) {
            for (var i = 0; i < requires.length; i++) {
                var n = requires[i];
                if (!_modules.hasOwnProperty(n)) {
                    throw new Error("Unabled to find module: " + n);
                }

                $injector.invoke(_modules[n]);
            }
        }
    };

    $self.stopped = false;

    $self.provider = function (name, provider) {
        $provide.provider(name, provider);

        return $self;
    };

    $self.factory = function(name, factory) {
        $provide.factory(name, factory);

        return self;
    };

    $self.service = function(name, service) {
        $provide.service(name, service);

        return $self;
    };

    $self.value = function(name, value) {
        $provide.value(name, value);

        return $self;
    };

    $self.constant = function(name, constant) {
        $provide.constant(name, constant);

        return $self;
    };

    $self.add = function(work) {
        if (!!work && !!work.$run) {
            $work.push(work);
        }

        return $self;
    };

    $self.run = function(fn) {
        if (!!fn && fn instanceof Function || fn instanceof Array) {
            $work.push({
                $run: fn,
                $delay: 0
            });
        }

        return $self;
    };

    $self.start = function () {
        $self.stopped = false;
        return $self.next();
    };

    $self.pause = function() {
        $self.stopped = true;
        return $self;
    }

    $self.stop = function () {
        $self.stopped = true;
        $index = -1;
        return $self;
    };

    $self.next = function() {
        if (arguments.length > 0) {
            throw new Error(arguments[0]);
        }

        if (!self.stopped) {
            ++$index;

            try {
                var work = $work[$index]; 
                if (!!work) {
                    var next = function(r, n) {
                        $injector.invoke(r, this, {next: n});
                        // If next is not asked for by the function, then it should be called to proceed
                        if ($injector.annotate(r).indexOf('next') === -1) {
                            n();
                        }
                    };

                    setTimeout(
                        next.bind($self, work.$run, $self.next), work.$delay || 0
                    );
                }
                else {
                    if (_success instanceof Function) {
                        $injector.invoke(success, $self);
                    }
                    if (_finally instanceof Function) {
                        _finally();
                    }
                }
            } catch($e) {
                if (_failure instanceof Function) {
                    $injector.invoke(failure, $self, {$error: $e});
                }
                if (_finally instanceof Function) {
                    $injector.invoke(cb, $self);
                }
            }
        }

        return $self;
    };

    $self.then = function (success, failure) {
        _success = success;
        _failure = failure;
        return $self;
    };

    $self.finally = function (cb) {
        _finally = cb;
        return $self;
    };

    $provide.service('$extend', Go.Extend);
    $provide.value('$go', $self);
    $self.registerModules(requires);

    return $self;
};

Go.Extend = function() {
    return {
        $get: function() {
            var args = Array.prototype.slice.call(arguments);
            if (args.length > 1) {
                var a2 = args.splice(-1).pop();
                var a1 = args.splice(-1).pop();
                for (var n in a2) {
                    if (a1.hasOwnProperty(n)) {
                        a1[n] = Go.extend(a1[n], a2[n]);
                    }
                    else {
                        a1[n] = a2[n];
                    }
                }

                if (args.length > 0) {
                    args.push(a1);
                    return Go.extend.apply(null, args);
                }

                return a1;
            }

            return args[0];
        }
    }
};

Go.Injector = function (locals) {
    var $self = this instanceof Go.Injector ? this : Object.create(Go.Injector.prototype),
        $cache = {};

    $self.$services = !!locals && typeof locals == 'object' && locals || {};
    $self.$decorators = {};

    if (!$self.$services.hasOwnProperty('$injector')) {
        $self.$services.$injector = {$get: function() { return $self; }};
    }

    $self.invoke = function(fn, self, locals) {
        var f = fn instanceof Array && fn[fn.length - 1] || fn;

        if (!(f instanceof Function)) {
            throw new Error("Could not find the function to inject into");
        }

        $inject = $self.annotate(fn);

        var args = [],
            $inject,
            i,
            n;

        if (!!$inject && $inject instanceof Array) {
            var $notFound = [];

            for (i = 0; i < $inject.length; i++) {
                n = $inject[i];
                if (typeof n === 'string') {
                    if (!!locals && !!locals[n]) {
                        args.push(locals[n]);
                        continue;
                    }
                    else if ($self.has(n)) {
                        args.push($self.get(n));
                        continue;
                    }
                    $notFound.push($inject[i]);
                }
            }

            if ($notFound.length > 0) {
                throw new Error("Unable to find required services: " + $notFound.join(", "));
            }
        }

        return f.apply(self, args);
    };

    $self.instantiate = function(Type, locals) {
        var instance = Object.create((Type instanceof Array ? Type[Type.length - 1] : Type).prototype || null),
            returnedValue = $self.invoke(Type, instance, locals);

        return (returnedValue !== null && typeof returnedValue == "object") || returnedValue instanceof Function ? returnedValue : instance;
    };

    $self.has = function (name) {
        return $self.$services.hasOwnProperty(name) || $self.$services.hasOwnProperty(name + 'Provider');
    };

    $self.get = function(name, caller) {
        if (!!$cache[name]) {
            return $cache[name];
        }

        if (!!$cache[name + 'Provider']) {
            return $cache[name] = $self.invoke($cache[name + 'Provider']);
        }

        if (!!$self.$services[name] || !!$self.$services[name + 'Provider']) {
            var provider = $self.$services[name + 'Provider'],
                service = !!provider 
                    ? $cache[name + 'Provider'] = $self.invoke(provider) 
                    : $self.$services[name],
                f = !!service.$get && service.$get || $self.instantiate(service).$get,
                $delegate = $self.invoke(f, !!caller && caller);

            if ($self.$decorators.hasOwnProperty(name)) {
                $decorator = $self.$decorators[name];
                return $cache[name] = $self.invoke($decorator, caller, {'$delegate': $delegate});
            }

            return $cache[name] = $delegate;
        }

        throw new Error("Unable to find variable or service with the name: " + name);
    };

    $self.annotate = function (fn, strictDi) {
        if (fn instanceof Array 
            && (!!fn[fn.length - 1] && fn[fn.length - 1] instanceof Function)) {
            var f = fn.slice(-1);
            f.$inject = fn.slice(0, fn.length - 1);

            return f.$inject;
        }
        else if (!!fn.$inject && fn.$inject instanceof Array) {
            return fn.$inject;
        }
        else if (fn instanceof Function && !strictDi) {
            var matches = fn.toString().match(/^function\s?\((.*?)\)/);
            if (!!matches[1]) {
                fn.$inject = matches[1].split(/,\s?/);
            }
        }

        return [];
    };

    return $self;
};

Go.Provider = function() {
    var $provide = function ($injector) {
        var $self = this instanceof $provide ? this : Object.create($provide.prototype);

        var add = function(name, obj) {
            $injector.$services[name] = obj;
        };

        var retVal = function (value) {
            return Function.prototype.bind.call(function() {
                return this;
            }, value);
        };

        $self.provider = function(name, provider) {
            if (provider instanceof Function 
                || (provider instanceof Array && provider[provider.length - 1] instanceof Function)) {
                add(name + 'Provider', {
                    $get: provider
                });
            }
            else if (!!provider.$get instanceof Function) {
                add(name + 'Provider', provider);
            }

            return $self;
        };

        $self.factory = function (name, factory) {
            add(name, factory);

            return $self;
        };

        $self.service = function (name, constructor) {
            add(name, {
                $get: constructor
            });

            return $self;
        };

        $self.value = function(name, value) {
            $self.service(name, retVal(value));
            return $self;
        };

        $self.constant = function(name, constant) {
            if (!$injector.$services.hasOwnProperty(name)) {
                $self.service(name, retVal(constant));
            }

            return $self;
        };

        $self.decorator = function(name, fn) {
            $injector.$decorators[name] = fn;
        };

        $self.value('$provide', $self);

        return $self;
    };

    $provide.$inject = ['$injector'];

    return $provide;
};

Go.Module = function (name, requires) {
    requires = requires || [];

    var $self = this instanceof Go.Module ? this : Object.create(Go.Module.prototype),
        _config,
        _providers = {},
        _services = {},
        _factories = {},
        _values     = {},
        _constants  = {};

    var $module = function($injector, $provide) {
        var $self = this instanceof $module ? $module : Object.create($module.prototype);
        var n;

        for (var i = 0; i < requires.length; i++) {
            n = requires[i];
            if (!_modules[n]) {
                throw new Error("Unable to find module " + n);
            }

            $injector.invoke(_modules[n]);
        }

        for (n in _providers) {
            $provide.provider(n, _providers[n]);
        }

        for (n in _services) {
            $provide.service(n, _services[n]);            
        }

        for (n in _factories) {
            $provide.factory(n, _factories[n]);
        }

        for (n in _values) {
            $provide.value(n, _values[n]);
        }

        for (n in _constants) {
            $provide.constant(n, _constants[n]);
        }

        if (!!_config) {
            $injector.invoke(_config);
        }

        return $self;

    };

    $module.$inject = ['$injector', '$provide'];

    $self.config = function(config) {
        _config = config;

        return $self;
    };

    $self.service = function(name, service) {
        _services[name] = service;

        return $self;
    };

    $self.provider = function(name, provider) {
        _providers[name] = provider;

        return $self;
    };

    $self.factory = function(name, factory) {
        _factories[name] = factory;

        return $self;
    };

    $self.value = function (name, value) {
        _values[name] = value;

        return $self;
    };

    $self.constant = function (name, constant) {
        if (!_constants[name]) {
            _constants[name] = constant;
        }

        return $self;
    };

    _modules[name] = $module;

    return $self;
};