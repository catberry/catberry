'use strict';

const assert = require('assert');
const testCases = require('../../cases/lib/streams/ComponentReadable.json');
const ServerResponse = require('../../mocks/ServerResponse');
const ComponentReadable = require('../../../lib/streams/ComponentReadable');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/streams/ComponentReadable', function() {
	describe('#foundComponentHandler', function() {
		testCases.cases.forEach(function(testCase) {
			it(testCase.name, function(done) {
				const parser = new ComponentReadable(
					createContext(),
					testCase.inputStreamOptions
				);

				/* eslint no-underscore-dangle: 0 */
				parser._isFlushed = true;
				parser._foundComponentHandler = tagDetails => {
					const id = tagDetails.attributes.id || '';
					return Promise.resolve(
						`content-${tagDetails.name}${id}`
					);
				};
				parser.renderHTML(testCase.input);

				var concat = '';
				parser
					.on('data', function(chunk) {
						concat += chunk;
					})
					.on('end', function() {
						assert.strictEqual(concat, testCase.expected, 'Wrong HTML content');
						done();
					});
			});
		});
	});

	describe('#renderDocument', function() {
		it('renders nothing when there is no document', function(done) {
			const parser = new ComponentReadable(createContext());

			parser.renderDocument();

			var concat = '';
			parser
				.on('data', function(chunk) {
					concat += chunk;
				})
				.on('end', function() {
					assert.strictEqual(concat, '', 'Wrong HTML content');
					done();
				});
		});
	});

});

function createContext() {
	return {
		components: Object.create(null),
		routingContext: {
			middleware: {
				response: new ServerResponse(),
				next: () => undefined
			}
		}
	};
}
