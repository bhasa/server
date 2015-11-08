Bhasa server uses restful HTTP.

`?_method=XXX` query parameters are accepted, for browser clients.

## Articles

The core unit of Bhasa is the **"article"**. The name is meant to evoke the literate style of presentation.

An article is composed of **sections**. A section can be either "code" or "text". Affordance is given for different source languages: text is often markdown, but it may be plain. Code may be C, JavaScript, Klingon, whatever.

Articles are stored as JSON objects. Sections are not necessarily in any order, but if ordering is desired then the **"order"** key should be specified.

Not all articles have semantics (see Functions below for articles that do). Some articles may be entirely documentation, or a discussion page.

    {
        "uuid": "2kpGQEWDXkYb",
        "title": "",
        "order": ["foo", "baz", "bar"],
        
        "foo": { "kind": "md", "title": "Foo", "val": "**Bold text**" },
        "bar": { "kind": "txt", "title": "Bar", "val": "_This is not italic_" },
        "baz": { "kind": "js", "title": "Baz", "val": "function hello() { }" }
    }

## Hashes

Hashes are pointers into this heap of articles.

A **combined hash** is created by XORing "key-hashes" together. This is more easily seen with an example:

    intfH = HASH( record.interface )
    implH = HASH( record.impl )
    intfH+implH = HASH( record.interface ) XOR HASH( record.impl )

This has the property that the order of keys does not matter. `intfH+implH` is the same as `implH+intfH`. 

The hash function we use is to calculate `SHA512` and then truncate to the first half of the output.

## Functions

Bhasa is a repository of functions and their documentation. But it is not a static repository, code changes over time.

One important kind of article is the function **version**. A version is a snapshot of a function at a point in time.

Individual versions are immutable. Version history is append-only. The only way to modify a function is to publish a new version to the server.

    GET /item/?impl=<hash>                 // Get the article whose "impl" hashes to <hash>
    PUT /item/                             // Publish a new version

## Version JSON

The JSON representation of versions is to-be-decided. This is a draft.

    uuid                Long-term identifier for associating different versions of the same function.
    name                Name of the function
    docs                Documentation
    
    type                Type signature
    interface           Function parameters, etc
    typeparams          Type parameters foo<Bar>()
    impl                Implementation block
    externals           Package map of external symbols
    tests               Unit tests for this function
    benchmarks          Benchmarks for this function
    
    parent              Total hash of the parent version
    timestamp           Seconds since 1970, as a string for maximal precision.    
