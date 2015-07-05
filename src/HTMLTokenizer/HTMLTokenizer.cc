#include <node.h>
#include <string>
#include <nan.h>
#include <stdio.h>
#include <iostream>

#include "HTMLTokenizer.h"

using namespace v8;

enum STATES {
	ILLEGAL = -1,
	INITIAL,
	CONTENT,
	COMPONENT,
	COMMENT,
	END
};

std::string v8_to_std_string(v8::Local<v8::Value> v8Val) {
    String::Utf8Value UtfValue(v8Val->ToString());
    std::string str = std::string(*UtfValue);
    
    return str;
}

Persistent<Function> HTMLTokenizer::constructor;

HTMLTokenizer::~HTMLTokenizer() {
}

HTMLTokenizer::HTMLTokenizer() {
}

void HTMLTokenizer::Init(Handle<Object> exports, Handle<Object> module) {
    NanScope();

    Local<FunctionTemplate> tpl = NanNew<FunctionTemplate>(New);
    tpl->SetClassName(NanNew("HTMLTokenizer"));
    tpl->InstanceTemplate()->SetInternalFieldCount(3);

    NODE_SET_PROTOTYPE_METHOD(tpl, "setHTMLString", setHTMLString);
    NODE_SET_PROTOTYPE_METHOD(tpl, "next", next);
    // NODE_SET_PROTOTYPE_METHOD(tpl, "content", content);
    // NODE_SET_PROTOTYPE_METHOD(tpl, "component", component);
    // NODE_SET_PROTOTYPE_METHOD(tpl, "comment", comment);
    // NODE_SET_PROTOTYPE_METHOD(tpl, "initial", initial);

    Handle<Object> States = NanNew<Object>();
    
    NODE_DEFINE_CONSTANT(States, ILLEGAL);
    NODE_DEFINE_CONSTANT(States, INITIAL);
    NODE_DEFINE_CONSTANT(States, CONTENT);
    NODE_DEFINE_CONSTANT(States, COMPONENT);
    NODE_DEFINE_CONSTANT(States, COMMENT);
    NODE_DEFINE_CONSTANT(States, END);

    tpl->Set(NanNew<String>("STATES"), NanNew<Object>(States));

    NanAssignPersistent(constructor, tpl->GetFunction());
    module->Set(NanNew<String>("exports"),tpl->GetFunction());

}

NAN_METHOD(HTMLTokenizer::New) {
    NanScope();

    if (args.IsConstructCall()) {

        HTMLTokenizer* obj = new HTMLTokenizer();
        obj->Wrap(args.This());
        NanReturnValue(args.This());
    }
}

NAN_METHOD(HTMLTokenizer::setHTMLString) {
    NanScope();
    HTMLTokenizer* obj = ObjectWrap::Unwrap<HTMLTokenizer>(args.Holder());

    obj->_source = "";
    obj->_source.append(v8_to_std_string(args[0]));
    
    obj->_currentIndex = 0;
    obj->_currentState = INITIAL;
}

NAN_METHOD(HTMLTokenizer::next) {
    NanScope();
    HTMLTokenizer* self = ObjectWrap::Unwrap<HTMLTokenizer>(args.Holder());
    Local<Object> ret = self->_next();
    NanReturnValue(ret);
}

Handle<Object> HTMLTokenizer::_next() {
    NanScope();
    
    int start = this->_currentIndex,
        state = this->_currentState;

    Handle<Object> ret = NanNew<Object>();

    switch(this->_currentState) {

    case CONTENT: this->content(); break;
    case COMPONENT: this->component(); break;
    case COMMENT: this->comment(); break;

    case END:
    case ILLEGAL:
        ret->Set(NanNew<String>("state"),NanNew<Number>(state));
        ret->Set(NanNew<String>("value"),NanNull());
        return ret;
    break;

    default:
        this->initial();
        return _next();
    }

    ret->Set(NanNew<String>("state"),NanNew<Number>(state));
    ret->Set(NanNew<String>("value"),
             NanNew<String>(this->_source.substr(start,
                                                 this->_currentIndex - start).c_str()));

    return ret;

}
void HTMLTokenizer::initial() {
    if (this->_currentIndex >= this->_source.length()) {
		this->_currentState = END;
		return;
    }

    // maybe comment or component
    if (this->_source[this->_currentIndex] == '<') {
		// comment
		if (this->_source[this->_currentIndex + 1] == '!') {
			if (this->_source[this->_currentIndex + 2] == '-' &&
				this->_source[this->_currentIndex + 3] == '-') {
				this->_currentState = COMMENT;
				return;
			}

			this->_currentState = CONTENT;
			return;
		}

		if (this->checkIfComponent()) {
			this->_currentState = COMPONENT;
			return;
		}
	}

    this->_currentState = CONTENT;

}

void HTMLTokenizer::component() {
    this->_currentIndex += 5;
    while (this->_currentIndex < this->_source.length()) {
        if (this->_source[this->_currentIndex] == '>') {
            this->_currentIndex++;
            this->_currentState = INITIAL;
            return;
        }
        this->_currentIndex++;
    }

    this->_currentState = ILLEGAL;

}

void HTMLTokenizer::content() {
    this->_currentIndex++;
	while (this->_currentIndex < this->_source.length()) {
		if (this->_source[this->_currentIndex] == '<') {
			this->_currentState = INITIAL;
			return;
		}
		this->_currentIndex++;
	}
	this->_currentState = END;
}



void HTMLTokenizer::comment() {
	this->_currentIndex += 4;

	while (this->_currentIndex < this->_source.length()) {
		if (this->_source[this->_currentIndex] == '-') {
			if (this->_currentIndex + 2 >= this->_source.length()) {
				this->_currentState = ILLEGAL;
				return;
			}

			if (this->_source[this->_currentIndex + 1] == '-' &&
				this->_source[this->_currentIndex + 2] == '>') {
				this->_currentIndex += 3;
				this->_currentState = INITIAL;
				return;
			}
		}
		this->_currentIndex++;
	}
	this->_currentState = ILLEGAL;


}

bool is_space_or_end(char c) {
    return
        c == ' ' ||
        c == '\f' ||
        c == '\n' ||
        c == '\r' ||
        c == '\t' ||
        c == '\v' ||
        c == '/' ||
        c == '>';
        
}
bool is_cat(std::string s) {
    return
        s[0] == '<' &&
        (s[1] == 'c' || s[1] == 'C') &&
        (s[2] == 'a' || s[2] == 'A') &&
        (s[3] == 't' || s[3] == 'T') &&
        s[4] == '-';
        
}

bool is_document(std::string s) {
    return
        s[0] == '<' &&
        (s[1] == 'd' || s[1] == 'D') &&
        (s[2] == 'o' || s[2] == 'O') &&
        (s[3] == 'c' || s[3] == 'C') &&
        (s[4] == 'u' || s[4] == 'U') &&
        (s[5] == 'm' || s[5] == 'M') &&
        (s[6] == 'e' || s[6] == 'E') &&
        (s[7] == 'n' || s[7] == 'N') &&
        (s[8] == 't' || s[8] == 'T') &&
        is_space_or_end(s[9]);
        
}

bool is_head(std::string s) {
    return
        s[0] == '<' &&
        (s[1] == 'h' || s[1] == 'H') &&
        (s[2] == 'e' || s[2] == 'E') &&
        (s[3] == 'a' || s[3] == 'A') &&
        (s[4] == 'd' || s[4] == 'D') &&
        is_space_or_end(s[5]);
        
}
bool is_body(std::string s) {
    return
        s[0] == '<' &&
        (s[1] == 'b' || s[1] == 'B') &&
        (s[2] == 'o' || s[2] == 'O') &&
        (s[3] == 'd' || s[3] == 'D') &&
        (s[4] == 'y' || s[4] == 'Y') &&
        is_space_or_end(s[5]);
        
}

bool HTMLTokenizer::checkIfComponent() {

    std::string s = this->_source.substr(this->_currentIndex,
                                         COMPONENT_NAME_MIN_LENGTH);
    return
        is_cat(s) ||
        is_document(s) ||
        is_head(s) ||
        is_body(s);
        
}

NODE_MODULE(addon, HTMLTokenizer::Init);
