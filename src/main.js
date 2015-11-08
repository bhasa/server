var express = require('express');
var app = express();

app.get('/', function(req, res){
  res.send('hello world');
});

app.listen(28101); // port bha_a
