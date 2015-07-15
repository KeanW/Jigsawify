/////////////////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved 
// Written by Philippe Leefsma 2014 - ADN/Developer Technical Services
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted, 
// provided that the above copyright notice appears in all copies and 
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting 
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS. 
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC. 
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////////////////

//require('newrelic');
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
    console.log(file.originalname + ' is starting ...');
    done = false;
  },
  onFileUploadComplete: function (file) {
    console.log(file.fieldname + ' uploaded to  ' + file.path)
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

/////////////////////////////////////////////////////////////////////////////////
//  Rest API
//
/////////////////////////////////////////////////////////////////////////////////
app.get('/api/token', api.getToken);

app.get('/api/submit', api.submitData);

app.post('/api/upload', function (req, res) {
  if (done) {
    console.log(req.files);
    res.end("File uploaded.");
  }
});

/////////////////////////////////////////////////////////////////////////////////
//  
//
/////////////////////////////////////////////////////////////////////////////////
app.listen(process.env.PORT || 5000);

console.log('Listening on port 5000...');
