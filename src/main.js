var PORT = 28101;
if (process.env.PORT)
  PORT = process.env.PORT;


// --- Utility ---
var crypto = require('crypto');

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
  console.log(xs);
  for (var i = 0; i < n; i++) {
    var octet = 0;
    for (var j = 0; j < xs.length; j++) {
      octet ^= xs[j][i];
    }
    res.push(octet);
  }
  console.log(res);
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
  uuid: Sequelize.UUID,
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

function getItem(req, res) {
  console.log(req);
  
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
    
    res.send(val);
  })
}


function putItem(req, res) {
  var obj = req.body;
  if (!validateJSON(obj)) {
    res.sendStatus(400);
    return;
  }
  
  var himpl = hashKey(obj, 'impl');
  var hinterface = hashKey(obj, 'interface');
  console.log(himpl);
  console.log(hinterface);
  var htotal = combineHashes([ himpl, hinterface ]);
  
  var jsonStr = JSON.stringify(obj);
  
  Version.create({
    uuid: cryptoUUID(),
    htotal: displayHash(htotal),
    created: Date.now() / 1000,
    json: jsonStr,
  });
  
  // Done!
  res.sendStatus(200);
}

app.all('api/item', function(req, res){
  var method = req.method;
  if (req.query._method != null)
    method = req.query._method;
  
  if (method === 'GET' || method === 'HEAD')
    getItem(req, res);    
  else if (method === 'PUT')
    putItem(req, res);
  else
    res.sendStatus(405);
});

// Website routing
app.get('[^\n]+', function(req, res) {
  // send along index.html
  
});

sequelize.sync().then(function() {
  app.listen(PORT); // port bha_a
})
