
SRC = lib/*.js \
	browser/*.js

TESTS = test/lib/* \
	test/browser/* \

all: lint test

lint:
	./node_modules/.bin/eslint ./

fix-lint:
	./node_modules/.bin/eslint ./ --fix

test:
ifeq ($(TRAVIS),true)
	@echo "Running tests for Travis..."
	$(MAKE) travis
else
	@echo "Running tests..."
	@NODE_ENV=test ./node_modules/.bin/mocha \
		$(TESTS) \
		--bail \
		--timeout 10000
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
		--bail \
		--timeout 10000
else
	@echo "Getting coverage report..."
	@NODE_ENV=test node ./node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha \
		--harmony-generators \
		-- -u exports \
		$(TESTS) \
		--bail \
		--timeout 10000
endif

send-cov: test-cov
	cat ./coverage/lcov.info | ./node_modules/.bin/codecov

travis: send-cov
clean:
	rm -rf coverage

.PHONY: test
