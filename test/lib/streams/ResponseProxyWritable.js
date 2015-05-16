/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var assert = require('assert'),
	events = require('events'),
	stream = require('stream'),
	ServerResponse = require('../../mocks/ServerResponse'),
	ServiceLocator = require('catberry-locator'),
	CookieWrapper = require('../../../lib/CookieWrapper'),
	ContextFactory = require('../../../lib/ContextFactory'),
	ModuleApiProvider = require('../../../lib/providers/ModuleApiProvider'),
	ContentReadable = require('../../../lib/streams/ContentReadable'),
	ResponseProxyWritable =
		require('../../../lib/streams/ResponseProxyWritable');

// TODO redirect, not found, cookie

describe('lib/streams/ResponseProxyWritable', function () {
	describe('#write', function () {
		it('should properly write all chunks of 1 byte size', function (done) {
			var content = '1234567890',
				options = {
					highWaterMark: 1
				},
				renderingContext = createRenderingContext(),
				contentStream = new ContentReadable(content, options),
				responseStream = new ResponseProxyWritable(
					renderingContext, options
				);

			renderingContext.isAnyComponentRendered = true;

			contentStream
				.pipe(responseStream)
				.on('finish', function () {
					var response = renderingContext
						.routingContext.middleware.response;
					assert.strictEqual(renderingContext.isCanceled, false);
					assert.strictEqual(response.result, content);
					assert.strictEqual(response.status, 200);
					assert.strictEqual(response.isEnded, true);
					assert.strictEqual(
						Object.keys(response.setHeaders).length, 2
					);
					assert.strictEqual(
						typeof(response.setHeaders['Content-Type']), 'string'
					);
					assert.strictEqual(
						typeof(response.setHeaders['X-Powered-By']), 'string'
					);
					done();
				});
		});

		it('should properly write all chunks of 1 byte size', function (done) {
			var content = '1234567890',
				renderingContext = createRenderingContext(),
				contentStream = new ContentReadable(content),
				responseStream = new ResponseProxyWritable(renderingContext);

			renderingContext.isAnyComponentRendered = false;

			contentStream
				.pipe(responseStream)
				.on('finish', function () {
					var response = renderingContext
						.routingContext.middleware.response;
					assert.strictEqual(renderingContext.isCanceled, false);
					assert.strictEqual(response.result, content);
					assert.strictEqual(response.status, 200);
					assert.strictEqual(response.isEnded, true);
					assert.strictEqual(
						Object.keys(response.setHeaders).length, 2
					);
					assert.strictEqual(
						typeof(response.setHeaders['Content-Type']), 'string'
					);
					assert.strictEqual(
						typeof(response.setHeaders['X-Powered-By']), 'string'
					);
					done();
				});
		});

		it('should properly delay chunks when is\'s needed', function (done) {
			var content = '1234567890',
				options = {
					highWaterMark: 1
				},
				countTransform = new stream.Transform(options),
				renderingContext = createRenderingContext(),
				contentStream = new ContentReadable(content, options),
				responseStream = new ResponseProxyWritable(
					renderingContext, options
				);

			countTransform._transform = function (chunk, encoding, callback) {
				if (chunk.toString() === '5') {
					renderingContext.isAnyComponentRendered = true;
				}
				callback(null, chunk);
			};

			var isFirstPartConsumed = false,
				response = renderingContext.routingContext.middleware.response;

			contentStream
				.pipe(countTransform)
				.pipe(responseStream)
				.on('finish', function () {
					assert.equal(response.result, content);
					done();
				});

			response.write = function (chunk) {
				assert.strictEqual(
					renderingContext.isAnyComponentRendered, true
				);
				if (!isFirstPartConsumed) {
					assert.strictEqual(chunk.toString(), '1234');
					isFirstPartConsumed = true;
				}
				response.result += chunk;
			};
		});
	});
});

function createRenderingContext() {
	var locator = new ServiceLocator(),
		eventBus = new events.EventEmitter();

	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('serviceLocator', locator);
	locator.register('cookieWrapper', CookieWrapper);
	locator.register('moduleApiProvider', ModuleApiProvider);

	var contextFactory = locator.resolveInstance(ContextFactory);

	var routingContext = contextFactory.create({
		middleware: {
			response: new ServerResponse(),
			next: function () {
				renderingContext.isNextCalled = true;
			}
		}
	});

	var renderingContext = {
		isNextCalled: false,
		isDocumentRendered: false,
		isHeadRendered: false,
		isAnyComponentRendered: false,
		isCanceled: false,
		renderedIds: {},
		routingContext: routingContext,
		eventBus: eventBus
	};

	return renderingContext;
}