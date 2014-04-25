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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var assert = require('assert'),
	zlib = require('zlib'),
	querystring = require('querystring'),
	http = require('http'),
	UHR = require('../../lib/server/UHR');

describe('UHR', function () {
	describe('#request', function () {
		it('should return error if parameters is not an object',
			function (done) {
				var uhr = new UHR();
				uhr.request('http://localhost:80/page',
					function (error, status, data) {
						assert.strictEqual(error instanceof Error, true);
						assert.strictEqual(status, undefined);
						assert.strictEqual(data, undefined);
						done();
					});
			});

		it('should return error if method is not specified', function (done) {
			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:80/page'
			}, function (error, status, data) {
				assert.strictEqual(error instanceof Error, true);
				assert.strictEqual(status, undefined);
				assert.strictEqual(data, undefined);
				done();
			});
		});

		it('should return error if wrong method is specified', function (done) {
			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:80/page',
				method: 'wrong'
			}, function (error, status, data) {
				assert.strictEqual(error instanceof Error, true);
				assert.strictEqual(status, undefined);
				assert.strictEqual(data, undefined);
				done();
			});
		});

		it('should return error if URL is not specified', function (done) {
			var uhr = new UHR();
			uhr.request({
				method: 'GET'
			}, function (error, status, data) {
				assert.strictEqual(error instanceof Error, true);
				assert.strictEqual(status, undefined);
				assert.strictEqual(data, undefined);
				done();
			});
		});

		it('should return error if wrong timeout is specified',
			function (done) {
				var uhr = new UHR();
				uhr.request({
					url: 'http://localhost:80/page',
					method: 'GET',
					timeout: 'wrong'
				}, function (error, status, data) {
					assert.strictEqual(error instanceof Error, true);
					assert.strictEqual(status, undefined);
					assert.strictEqual(data, undefined);
					done();
				});
			});

		it('should end request if timeout', function (done) {
			var server = createServer(8081, function (request, response) {
				setTimeout(function () {
					response.end();
					server.close();
				}, 2000);
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8081/page',
				method: 'GET',
				timeout: 1000
			}, function (error, status, data) {
				assert.strictEqual(error instanceof Error, true);
				assert.strictEqual(status, undefined);
				assert.strictEqual(data, undefined);
				done();
			});
		});

		it('should send HTTP request with specified URL', function (done) {
			var server = createServer(8082, function (request, response) {
				assert.strictEqual(request.url, '/page');
				response.end();
				server.close();
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8082/page',
				method: 'GET'
			}, function (error, status) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				done();
			});
		});

		it('should send correct headers', function (done) {
			var server = createServer(8093, function (request, response) {
				assert.strictEqual(request.headers.host, 'localhost:8093');
				assert.strictEqual(typeof(request.headers.accept), 'string');
				assert.strictEqual(typeof(request.headers.pragma), 'string');
				assert.strictEqual(typeof(request.headers['accept-charset']),
					'string');
				assert.strictEqual(typeof(request.headers['cache-control']),
					'string');
				assert.strictEqual(typeof(request.headers['user-agent']),
					'string');
				response.end();
				server.close(function () {
					done();
				});
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8093/page',
				method: 'GET'
			}, function (error, status) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
			});
		});

		it('should parse URL encoded response', function (done) {
			var obj = {
				test: 'hello world',
				test2: 100500,
				boolean: true
			};
			var server = createServer(8083, function (request, response) {
				response.setHeader('Content-Type',
					'application/x-www-form-urlencoded');
				response.end(querystring.stringify(obj));
				server.close();
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8083/page',
				method: 'GET'
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data.test, obj.test);
				assert.strictEqual(Number(data.test2), obj.test2);
				assert.strictEqual(Boolean(data.boolean), obj.boolean);
				done();
			});
		});

		it('should parse JSON response', function (done) {
			var obj = {
				test: 'hello world',
				test2: 100500,
				boolean: true
			};
			var server = createServer(8084, function (request, response) {
				response.setHeader('Content-Type',
					'application/json');
				response.end(JSON.stringify(obj));
				server.close();
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8084/page',
				method: 'GET'
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.deepEqual(data, obj);
				done();
			});
		});

		it('should return plain text response', function (done) {
			createServer(8085, function (request, response) {
				response.setHeader('Content-Type',
					'text/plain');
				response.end('test');
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8085/page',
				method: 'GET'
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data, 'test');
				done();
			});
		});

		it('should decode gzip response', function (done) {
			var server = createServer(8086, function (request, response) {
				response.setHeader('Content-Type',
					'text/plain');
				response.setHeader('Content-Encoding',
					'gzip');
				var gzip = zlib.createGzip();
				gzip.pipe(response);
				gzip.end('test gzip');
				server.close();
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8086/page',
				method: 'GET'
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data, 'test gzip');
				done();
			});
		});

		it('should decode deflate response', function (done) {
			var server = createServer(8087, function (request, response) {
				response.setHeader('Content-Type',
					'text/plain');
				response.setHeader('Content-Encoding',
					'deflate');
				var deflate = zlib.createDeflate();
				deflate.pipe(response);
				deflate.end('test inflate');
				server.close();
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8087/page',
				method: 'GET'
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data, 'test inflate');
				done();
			});
		});

		it('should send data as query string after query', function (done) {
			var query = {
				param: 'test3',
				param2: 'test4'
			};
			var server = createServer(8098, function (request, response) {
				assert.strictEqual(request.url,
						'/page?some=value&' + querystring.stringify(query));

				var data = '';
				request.setEncoding('utf8');
				request.on('data', function (chunk) {
					data += chunk;
				});
				request.on('end', function () {
					assert.strictEqual(data.length, 0);
					response.end();
					server.close(function () {
						done();
					});
				});
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8098/page?some=value',
				method: 'GET',
				data: query
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data, '');
			});
		});

		it('should send query string after path', function (done) {
			var query = {
				param: 'test',
				param2: 'test2'
			};
			var server = createServer(8088, function (request, response) {
				assert.strictEqual(request.url,
						'/page?' + querystring.stringify(query));

				var data = '';
				request.setEncoding('utf8');
				request.on('data', function (chunk) {
					data += chunk;
				});
				request.on('end', function () {
					assert.strictEqual(data.length, 0);
					response.end();
					server.close(function () {
						done();
					});
				});
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8088/page',
				method: 'DELETE',
				data: query
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data, '');
			});
		});

		it('should send empty entity', function (done) {
			var server = createServer(8089, function (request, response) {
				assert.strictEqual(request.url, '/page');
				assert.strictEqual(request.headers['content-type'],
					'application/x-www-form-urlencoded; charset=UTF-8');

				var data = '';
				request.setEncoding('utf8');
				request.on('data', function (chunk) {
					data += chunk;
				});
				request.on('end', function () {
					assert.strictEqual(data.length, 0);
					response.end();
					server.close(function () {
						done();
					});
				});

			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8089/page',
				method: 'POST'
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data, '');
			});
		});

		it('should send entity as URL encoded', function (done) {
			var entity = {
				field: 'test',
				field2: true,
				field3: 100500
			};
			var server = createServer(8090, function (request, response) {
				assert.strictEqual(request.url, '/page');
				assert.strictEqual(request.headers['content-type'],
					'application/x-www-form-urlencoded; charset=UTF-8');

				var data = '';
				request.setEncoding('utf8');
				request.on('data', function (chunk) {
					data += chunk;
				});
				request.on('end', function () {
					var receivedEntity = querystring.parse(data);

					assert.strictEqual(receivedEntity.field, entity.field);
					assert.strictEqual(Boolean(receivedEntity.field2),
						entity.field2);
					assert.strictEqual(Number(receivedEntity.field3),
						entity.field3);
					response.end();
					server.close(function () {
						done();
					});
				});
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8090/page',
				method: 'PUT',
				data: entity
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data, '');
			});
		});

		it('should send entity as JSON', function (done) {
			var entity = {
				field: 'test2',
				field2: false,
				field3: 42
			};
			var server = createServer(8091, function (request, response) {
				assert.strictEqual(request.url, '/page');
				assert.strictEqual(request.headers['content-type'],
					'application/json');

				var data = '';
				request.setEncoding('utf8');
				request.on('data', function (chunk) {
					data += chunk;
				});
				request.on('end', function () {
					var receivedEntity = JSON.parse(data);
					assert.deepEqual(receivedEntity, entity);
					response.end();
					server.close(function () {
						done();
					});
				});
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8091/page',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				data: entity
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data, '');
			});
		});

		it('should send entity as plain text', function (done) {
			var entity = 'test entity text';
			var server = createServer(8092, function (request, response) {
				assert.strictEqual(request.url, '/page');
				assert.strictEqual(request.headers['content-type'],
					'text/plain; charset=UTF-8');

				var data = '';
				request.setEncoding('utf8');
				request.on('data', function (chunk) {
					data += chunk;
				});
				request.on('end', function () {
					assert.deepEqual(data, entity);
					response.end();
					server.close(function () {
						done();
					});
				});
			});

			var uhr = new UHR();
			uhr.request({
				url: 'http://localhost:8092/page',
				method: 'POST',
				data: entity
			}, function (error, status, data) {
				assert.strictEqual(error, null);
				assert.strictEqual(status.code, 200);
				assert.strictEqual(data, '');
			});
		});
	});
});

function createServer(port, callback) {
	var server = http.createServer(callback);
	server.listen(port);
	return server;
}