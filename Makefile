
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
	@NODE_ENV=test node --harmony-generators \
		node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha \
		-- -u exports \
		$(TESTS) \
		--bail

.PHONY: test