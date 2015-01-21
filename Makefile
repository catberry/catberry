
SRC = lib/*.js \
	browser/*.js

TESTS = test/lib/* \

all: lint test

lint:
	./node_modules/.bin/jshint ./ && ./node_modules/.bin/jscs ./

test:
ifeq ($(TRAVIS),true)
	@echo "Running tests for Travis..."
	$(MAKE) travis
else
	@echo "Running tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha \
		$(TESTS) \
		--bail
endif

test-cov:
ifeq ($(TRAVIS),true)
	@echo "Getting coverage for Travis..."
	@NODE_ENV=test node ./node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha \
		--harmony-generators \
		--report lcovonly \
		-- -u exports \
		$(TESTS) \
		--bail
else
	@echo "Getting coverage report..."
	@NODE_ENV=test node ./node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha \
		--harmony-generators \
		-- -u exports \
		$(TESTS) \
		--bail
endif

coveralls: test-cov
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

travis: coveralls
clean:
	rm -rf coverage

.PHONY: test