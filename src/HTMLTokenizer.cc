#include <node.h>
#include <string>

using namespace v8;

enum STATES {
	ILLEGAL = -1,
	INITIAL = 0,
	CONTENT = 1,
	COMPONENT = 2,
	COMMENT = 3,
	END = 4
};

std::string source;

void setHTMLString(const FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);

	if (args.Length() == 1 && args[0]->IsString()) {
    	v8::String::Utf8Value str(args[0]->ToString());
    	std::string foo = std::string(*str);   
    }

    Local<Number> num = Number::New(isolate, 100500);
    args.GetReturnValue().Set(num);
}

void next(const FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);
	args.GetReturnValue().Set(String::NewFromUtf8(isolate, "world"));
}

void init(Handle<Object> exports) {
	NODE_SET_METHOD(exports, "setHTMLString", setHTMLString);
	NODE_SET_METHOD(exports, "next", next);
}

NODE_MODULE(addon, init)