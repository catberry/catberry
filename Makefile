
SOURCES = ./lib/finders ./lib/helpers ./lib/base ./lib/builders ./lib/promises
TESTS = test/lib/finders test/lib/helpers test/lib/promises

all: lint test

lint:
	./node_modules/.bin/eslint $(SOURCES) $(TESTS)

lint-fix:
	./node_modules/.bin/eslint $(SOURCES) $(TESTS) --fix

test:
ifeq ($(TRAVIS),true)
	@echo "Running tests for Travis..."
	$(MAKE) travis-cov
else
	@echo "Running tests..."
	./node_modules/.bin/mocha $(TESTS)
endif

test-cov:
	@echo "Getting coverage report..."
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha $(TESTS)

travis-cov:
	@echo "Getting coverage for Travis..."
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha --report lcovonly -- $(TESTS) -R spec && ./node_modules/.bin/codecov

clean:
	rm -rf coverage

.PHONY: test
