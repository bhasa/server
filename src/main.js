var PORT = 28101;
if (process.env.PORT)
  PORT = process.env.PORT;


// --- Utility ---
var crypto = require('crypto');
var fs = require('fs');

function cryptoUUID() {
  var N = 128;
  // http://www.wolframalpha.com/input/?i=solve+62%5En+%3D+2%5E128
  return crypto.randomBytes(N * 4).toString('base64').replace(/[+=\/]/g, '').slice(0, 22);
}
function hashKey(obj, key) {
  var val = obj[key];
  if (val == null)
    val = null;
  var str = JSON.stringify(val);

  var sha512 = crypto.createHash('sha512');
  // prepend key so that (key, value) != (different_key, value)
  sha512.update(key);
  sha512.update(str);
  return sha512.digest();
}
function combineHashes(xs) {
  var res = [];
  var n = xs[0].length;
  
  for (var i = 0; i < n; i++) {
    var octet = 0;
    for (var j = 0; j < xs.length; j++) {
      octet ^= xs[j][i];
    }
    res.push(octet);
  }
  
  return new Buffer(res);
}
function displayHash(buf) {
  return buf.slice(0, 32).toString('base64').replace('+', '-').replace('/', '_');
}


// --- Database ---
var DEBUG = (process.platform === 'darwin');
var Sequelize = require('sequelize');
var sequelize = null;
if (DEBUG) {
  sequelize = new Sequelize('sqlite', null, null, {
      dialect: 'sqlite',
      storage: 'testdata/test0.db',
    })
}
else {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
  });
}

var Version = sequelize.define('Version', {
  uuid: Sequelize.STRING,
  title: Sequelize.STRING,
  htotal: Sequelize.STRING,
  created: Sequelize.DOUBLE,
  json: Sequelize.TEXT,
}, { timestamps: false });



// --- Validation ---
function validateJSON(json) {
  if (!json)
    return false;
  // TODO
  return true;
}

// --- HTTP ---
var express = require('express');
var bodyParser = require('body-parser')
var app = express();
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

function getItem(req, res) {
  if (!req.query.hasOwnProperty('htotal')) {
    res.status(400).send('No htotal= query parameter specified');
    return;
  }
  
  Version.findOne({
    where: {
      'htotal': req.query['htotal'],
    },
    order: [
      ['id', 'DESC'],
    ],
  }).then(function(val) {
    if (val == null) {
      // Purposefully don't send JSON on error just in case a client is blindly
      // parsing it and storing the result.
      res.sendStatus(404);
      return;
    }
    
    res.type('json').send(val);
  })
}

function findGetItem(req, res) {
  if (!req.query.hasOwnProperty('title')) {
    res.status(400).send('No title= query parameter specified');
    return;
  }

  Version.findOne({
    where: {
      'title': req.query['title'],
    },
    order: [
      ['id', 'DESC'],
    ],
  }).then(function(val) {
    if (val == null) {
      res.sendStatus(404);
      return;
    }
    
    var json = JSON.parse(val.json);
    res.type('json').send({
      content: json,
    });
  })
}

function doSearch(req, res) {
  if (!req.query.hasOwnProperty('q')) {
    res.status(400).send('No q= query parameter specified');
    return;
  }
  
  Version.findAll({
    where: {
      'title': {
        '$like': '%' + req.query['q'] + '%',
      }
    },
    order: [
      ['id', 'DESC'],
    ],
  }).then(function(vals) {
    if (vals == null) {
      res.sendStatus(404);
      return;
    }
    
    var outputs = [];
    vals.forEach(function(val) {
      // Documentation of sequelize is godawful
      // I presume this is the correct way of doing things???
      val = val.dataValues;
      
      console.log(val);
      var json = JSON.parse(val.json);
      console.log(json);
      outputs.push(json);
    })
    res.type('json').send({
      results: outputs,
    });
  })
}

function stringIsBad(str) {
  return (str == null || (typeof str) != 'string' || str == '');
}
function putItem(req, res) {
  return putItemJSON(false, req, res);
}
function putItemJSON(newUUID, req, res) {
  var obj = req.body;
  console.log(obj);
  if (!validateJSON(obj)) {
    console.log("STRIKE ONE");
    res.sendStatus(400);
    return;
  }
  
  var uuid;
  if (newUUID) {
    uuid = cryptoUUID();
  }
  else {
    uuid = obj.uuid;
    if (stringIsBad(uuid)) {
      console.log("STRIKE TWO");
      res.sendStatus(400);
      return;
    }
    // TODO: ensure that uuid exists already
  }
  
  if (stringIsBad(uuid)) {
    console.log("STRIKE TWO AND A HALF");
    res.sendStatus(500);
    return;
  }
  obj.uuid = uuid;
  
  var title = obj.title;
  if (stringIsBad(title)) {
    console.log("STRIKE THREE");
    res.sendStatus(400);
    return;
  }
  
  console.log("READY");
  var himpl = hashKey(obj, 'impl');
  var hinterface = hashKey(obj, 'interface');
  var htotal = combineHashes([ himpl, hinterface ]);
  
  var jsonStr = JSON.stringify(obj);
  
  Version.create({
    uuid: uuid,
    htotal: displayHash(htotal),
    title: title,
    created: Date.now() / 1000,
    json: jsonStr,
  });
  
  // Done!
  res.sendStatus(200);
}

app.all('/api/create-from-template', function(req, res) {
  console.log(req);
  var method = req.method;
  if (req.query._method != null)
    method = req.query._method;

  if (method == 'POST')
    putItemJSON(true, req, res);
  else
    res.sendStatus(405);
})

app.all('/api/item', function(req, res){
  var method = req.method;
  if (req.query._method != null)
    method = req.query._method;
  
  if (method === 'GET' || method === 'HEAD')
    getItem(req, res);    
  else if (method === 'POST')
    putItem(req, res);
  else
    res.sendStatus(405);
});

app.all('/api/find-latest', function(req, res){
  var method = req.method;
  if (req.query._method != null)
    method = req.query._method;

  if (method === 'GET' || method === 'HEAD')
    findGetItem(req, res);
  else
    res.sendStatus(405);
});

app.all('/api/search', function(req, res){
  var method = req.method;
  if (req.query._method != null)
    method = req.query._method;

  if (method === 'GET' || method === 'HEAD')
    doSearch(req, res);
  else
    res.sendStatus(405);
});

if (DEBUG) {
  app.use(express.static('../website'));
}
else {
  app.use(express.static('website'));
}

// Website routing
var websiteHTML = fs.readFileSync('website/index.html');
app.get('/*', function(req, res) {
  if (DEBUG) websiteHTML = fs.readFileSync('website/index.html');
  res.type('html').send(websiteHTML);
});

sequelize.sync().then(function() {
  app.listen(PORT); // port bha_a
})
