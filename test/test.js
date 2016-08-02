var should = require("should");
var Go = require("../src/go.js");

describe('Basic Go next', function() {
    it('should perform successfully', function(done) {

        var go = Go();
        go
            .run(['$provide', function($provide) {
                $provide.value('myVal', 1);
            }])
            .run(['myVal', 'next', function(myVal, next) {
                if (myVal == 1) {
                    next();
                } else {
                    next("myVal isn't 1");
                }
            }])
            .then(['myVal', function(myVal) {
                myVal.should.equal(1);
            }], function() {
                should(true).be(false);
            })
            .finally(function() {
                done();
            })
            .start();
    });

    it('should not perform successfully', function(done) {
        var go = Go();
        go
            .run(['$provide', function($provide) {
                $provide.value('myVal', 2);
            }])
            .run(['myVal', 'next', function(myVal, next) {
                if (myVal == 1) {
                    next();
                } else {
                    next("myVal isn't 1");
                }
            }])
            .then(['myVal', function(myVal) {
                myVal.should.equal(1);
            }], ['$error', function($error) {
                $error.should.equal("myVal isn't 1");
            }])
            .finally(function() {
                done();
            })
            .start();
    });
});

describe('Go Modules', function() {
    it('Should load modules and use them', function(done) {
        this.timeout(3000);
        Go.Module('MyModule', [])
            .constant('test', function() {
                return {
                    i: 0,
                    add: function (n) {
                        this.i += n || 1;

                        return this.i;
                    },
                    get: function () {
                        return this.i;
                    }
                };
            });

        var theTime = new Date().getTime();

        Go.Module('OtherModule', ['MyModule'])
            .service('TesterFactory', ['test', function(test) {
                test.date = theTime;
                return test;
            }]);

        var go = Go(['OtherModule']);
        go
            .value('start', (new Date()).getTime())
            .add({$run : ['TesterFactory', 'next', function(TestFactory, next) {
                setTimeout(function() {
                    TestFactory().add().should.be.equal(1);
                    next();
                }, 1000);
            }],
                $delay: 1000
            })
            .run(['start', function(start) {
                var now = (new Date()).getTime();
                parseInt((now - start) / 1000).should.be.equal(2);
            }])
            .run(['TesterFactory', '$provide', function(test, $provide) {
                var t = test();
                t.add().should.be.equal(1);
                $provide.value('t', t);
                t.add();
            }])
            .then(['t', 'test', function(t, test) {
                t.get().should.be.equal(2);
                test.date.should.be.equal(theTime);
            }], function(e) {
                throw e;
            })
            .finally(function() {done();})
            .start();
    });
});