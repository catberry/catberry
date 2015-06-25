all: configure build install

configure: 
	node-gyp configure
build:
	node-gyp build
install:
	cp ./build/Release/HTMLTokenizer.node ../lib/streams/
clean:
	rm -rf build/

.PHONY: build
