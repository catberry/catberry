
SRC = lib/*.js \
	browser/*.js

TESTS = test/lib/* \
	test/browser/ \

all: lint test

lint:
	./node_modules/.bin/jshint ./ && ./node_modules/.bin/jscs ./

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--harmony-generators \
		$(TESTS) \
		--bail

test-cov:
	@NODE_ENV=test node node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha \
		--harmony-generators \
		-- -u exports \
		$(TESTS) \
		--bail

coveralls: test-cov
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

travis: lint coveralls

.PHONY: test