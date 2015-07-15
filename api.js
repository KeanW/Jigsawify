
///////////////////////////////////////////////////////////////////
// Copyright (c) 2014 Autodesk, Inc. All rights reserved 
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
///////////////////////////////////////////////////////////////////

var BASE_URL = 'https://developer.api.autodesk.com';

var request = require('request');
var http = require('http');

///////////////////////////////////////////////////////////////////
//  
//
///////////////////////////////////////////////////////////////////
exports.getToken = function (req, res) {

  var params = {
    client_id: process.env.CONSUMER_KEY,
    client_secret: process.env.CONSUMER_SECRET,
    grant_type: 'client_credentials'
  }

  request.post(BASE_URL + '/authentication/v1/authenticate',
    { form: params },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {                
        var authResponse = JSON.parse(body);
        res.send(authResponse);
      }
    }
  );
};

exports.submitData = function (args, res) {

  var params = {
    client_id: process.env.CONSUMER_KEY,
    client_secret: process.env.CONSUMER_SECRET,
    grant_type: 'client_credentials'
  }

  request.post(BASE_URL + '/authentication/v1/authenticate',
    { form: params },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {                
        var authResponse = JSON.parse(body);

        var data = {
          //odata.metadata: 'https://developer.api.autodesk.com/autocad.io/v1/$metadata#WorkItems/@Element',
          Arguments: {
            InputArguments: [
              {
                Name: 'HostDwg',
                Resource: 'http://download.autodesk.com/us/support/files/autocad_2015_templates/acad.dwt',
                StorageProvider: 'Generic'
              },
              {
                Name: 'Params',
                ResourceKind: 'Embedded',
                Resource: 'data:application/json, ' + JSON.stringify(args),
                StorageProvider: 'Generic'
              },
            ],
            OutputArguments: [
              {
                Name: 'Results',
                StorageProvider: 'Generic',
                HttpVerb: 'POST',
                Resource: null,
                ResourceKind: 'ZipPackage'
              }
            ]
          },
          UserId: '',
          Id: '',
          Version: 1,
          ActivityId: {
            Id: 'JigsawActivity',
            UserId: ''
          }
        };
        
        var postData = JSON.stringify(data);
        
        res.send(postData);
        /*
        var options = {
            hostname: BASE_URL,
            path: '/autocad.io/v1/WorkItems',
            port: 80,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authResponse.token_type + ' ' + authResponse.access_token,
                'Host': 'autocad.io',
                'Content-Length': postData.length
            }
        };
        var req = http.request(options, function(res2) {
            var body = '';
            res.on('data', function (chunk) {
                body += chunk;
            });
            res.on('end', function () {
                res.send(body);
            });
        });
        req.on('error', function(e) {
            res.send('ERROR: ' + e.message);
        });
        req.write(postData);
        req.end();
        */
      }
    }
  );
};
