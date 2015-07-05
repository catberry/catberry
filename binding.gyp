{
    "targets": [
        {
            "target_name": "HTMLTokenizer",
            "sources": [ "src/HTMLTokenizer/HTMLTokenizer.cc" ],
            "cflags_cc": [ "-O3" ],
            "include_dirs" : [
                "<!(node -e \"require('nan')\")" 
            ] 
        }
    ]
    
}
