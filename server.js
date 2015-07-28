var express = require('express');
var multer = require('multer');
var morgan = require('morgan');
var path = require('path');
var api = require('./api');

var app = express();

app.use(morgan('dev', { immediate: true }));     

/* Configure the multer */

var done = false;

app.use(multer({
  dest: './uploads/',
  rename: function (fieldname, filename) {
    return filename + Date.now();
  },
  onFileUploadStart: function (file) {
    //console.log(file.originalname + ' is starting ...');
    done = false;
  },
  onFileUploadComplete: function (file) {
    //console.log(file.fieldname + ' uploaded to ' + file.path)
    done = true;
  }
}));

/////////////////////////////////////////////////////////////////////////////////
//  Webpages server
//
/////////////////////////////////////////////////////////////////////////////////
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.use('/', express.static(__dirname + '/html'));

app.use('/downloads', express.static(__dirname + '/downloads'));

/////////////////////////////////////////////////////////////////////////////////
//  Rest API
//
/////////////////////////////////////////////////////////////////////////////////
//app.get('/api/token', api.getToken);

app.get('/api/submit', api.submitData);

app.get('/api/check', api.checkData);

app.post('/api/upload', function (req, res) {
  if (done) {
    console.log('File uploaded to ' + req.files.msg.path);
    res.end(req.files.msg.name);
  }
});

/////////////////////////////////////////////////////////////////////////////////
//  
//
/////////////////////////////////////////////////////////////////////////////////
app.listen(process.env.PORT || 5000);

console.log('Listening on port 5000...');
