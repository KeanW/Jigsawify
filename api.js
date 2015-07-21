var BASE_URL = 'https://developer.api.autodesk.com';

var fs = require('fs');
var request = require('request');
var url = require('url');
var Canvas = require('canvas'),
    Image = Canvas.Image;
var AdmZip = require('adm-zip');
var edge = require('./edge');

fs.mkdir('downloads', function() {});

/*
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
*/

exports.submitData = function (req, res) {

  var args = url.parse(req.url, true).query;
  //console.log(args);

  var activityName = 'JigsawActivity';
  var userId = '36db5451-2ddc-4e3c-99de-37bd5a8810f8';
    
  // Reduce the arguments to get the basic call working
  
  var args2 = {
    Width: parseInt(args.width),
    Height: parseInt(args.height),
    Pieces: parseInt(args.pieces)   
  }
  
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
        var auth = authResponse.token_type + ' ' + authResponse.access_token;

        console.log('Authorized: ' + auth);
        
        var width = args2.Width, height = args2.Height;
        fs.readFile('./uploads/' + args.upload, function(err, blob){
          if (err) throw err;
          img = new Image(width, height);
          img.src = blob;
          var raw = new Canvas(width,height);
          var out = new Canvas(width,height);
          var ed = new edge.edgeDetector();
          ed.init(img, raw, out, width, height);
          ed.update(parseInt(args.threshold));
          var pts = ed.generatePoints(width, height, args2);
          var spts = JSON.stringify(pts);

          var data = {
            'odata.metadata': 'https://developer.api.autodesk.com/autocad.io/v1/$metadata#WorkItems/@Element',
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
                  Resource: 'data:application/json, ' + spts,
                  StorageProvider: 'Generic'
                }
              ],
              OutputArguments: [
                {
                  Name: 'Results',
                  StorageProvider: 'Generic',
                  HttpVerb: 'POST',
                  Resource: null,
                  ResourceKind: 'ZipPackage' //null
                }
              ]
            },
            UserId: '',
            Id: '',
            Version: 1,
            ActivityId: {
              Id: activityName, //'PlotToPDF'
              UserId: userId //'Shared'
            }
          };
          
          var postData = JSON.stringify(data);
          
          var headers = {
            Authorization: auth,
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
            Host: 'developer.api.autodesk.com'
          }
  
          console.log(
            'Creating work item (request length ' + postData.length +
            ', of which ' + spts.length + ' is pt data)'
          );

          request.post({
            url: BASE_URL + '/autocad.io/v1/WorkItems',
            headers: headers,
            body: postData
          },
          function (error, response, body) {

            if (error) throw error;

            console.log('Created work item.');
  
            // Extract the Id and UserId from the WorkItem
            
            var res = JSON.parse(body);
            
            if (!res.Id || !res.UserId) {
              console.log('Problem with request: ' + body);
              console.log('Dumping points: ' + spts);
              return;
            }
            
            var data2 = {
              UserId: res.UserId,
              Id: res.Id,
              Version: 1,
              ActivityId: {
                Id: activityName,
                UserId: userId
              }
            }
            var postData2 = JSON.stringify(data2);
 
            console.log('Checking work item status (request length ' + postData2.length + ')');
            
            // We're going to request the status for this WorkItem in a loop
            // We'll perform up to 10 checks, 2 seconds between each
            
            var checked = 0;
            var check = function () {
              setTimeout(
                function() {
                  var url = BASE_URL + "/autocad.io/v1/WorkItems(UserId='" + res.UserId + "',Id='" + res.Id + "')";
                  
                  request.get({
                    url: url,
                    headers: { Authorization: auth, Host: 'developer.api.autodesk.com' }
                  },
                  function (error2, response2, body2) {

                    if (error2) throw error2;

                    if (response2.statusCode == 200) {
                      var workItem = JSON.parse(body2);

                      console.log('Checked status: ' + workItem.Status);
      
                      switch (workItem.Status) {
                        case 'InProgress':
                          if (checked < 10) {
                            checked++;
                            check();
                          } else {
                            console.log('Reached check limit.');
                          }
                          break;
                        case 'FailedDownload':
                          console.log('Failed to download!');
                          break;
                        case 'Succeeded':
                          var remoteZip = workItem.Arguments.OutputArguments[0].Resource;
                          
                          if (!remoteZip) {
                            console.log('Could not download (' + workItem.Status + '): ' + JSON.stringify(workItem.StatusDetails));
                          } else {
                          
                            var localRoot = './downloads/' + res.Id; 
                            var localZip = localRoot + '.zip';
        
                            var r = request.get(remoteZip).pipe(fs.createWriteStream(localZip));
                            r.on('finish',
                              function() {
                                var zip = new AdmZip(localZip);
                                zip.extractEntryTo('jigsaw.png', localRoot, false, true);
                                zip.extractEntryTo('jigsaw.dwg', localRoot, false, true);
                                
                                console.log('Extracted ' + localRoot + '/jigsaw.png');
                                console.log('Extracted ' + localRoot + '/jigsaw.dwg');
                              }
                            );
                          }
                          break;
                        default:
                          console.log('Unknown status: ' + workItem.Status);
                      }
                    }                          
                  });
                },
                2000
              );
            }
            check();
        });
      });
    }
  });
  res.end();
}

