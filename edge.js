var fs = require('fs');

// Read and eval library
var filedata = fs.readFileSync('./html/js/edgedetector.js', 'utf8');
eval(filedata);

/* The edgedetector file defines a class 'EdgeDetector' which is all we want to export */

exports.EdgeDetector = EdgeDetector