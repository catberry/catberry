#ifndef HTMLTOKENIZER_H
#define HTMLTOKENIZER_H

#include <nan.h>
#include <string>

#define COMPONENT_NAME_MIN_LENGTH 10

using namespace v8;

class HTMLTokenizer : public node::ObjectWrap {
public:
    static void Init(Handle<Object> exports, Handle<Object> module);

    Handle<Object> _next();
    void content();
    void component();
    void comment();
    void initial();
    bool checkIfComponent();

private:
    explicit HTMLTokenizer();
    ~HTMLTokenizer();
    
    static NAN_METHOD(New);
    static NAN_METHOD(setHTMLString);
    static NAN_METHOD(next);
    // static NAN_METHOD(initial);
    static Persistent<Function> constructor;

    std::string _source;

    int _currentIndex, _currentState;

};

#endif
