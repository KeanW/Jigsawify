function edgeDetector(){
  
  // Variables

  this.imgElement = undefined;
  this.rawCanvas = undefined;
  this.rawctx = undefined;
  this.ctxDimensions = {
    width: undefined,
    height:undefined
  };
  this.pixelData = undefined;
  this.threshold = 30;
  
  this.init = function (elem, id, after) {

    this.imgElement = elem;

    var width = this.imgElement.width;
    var height = this.imgElement.height;

    // Build the canvas
    
    if (after == null) {
      after = elem;
    }

    this.rawCanvas = $("#" + id)[0];
    if (this.rawCanvas == null) {
      
      $("<canvas id=\"" + id + "\" width=\"" + width +
        "\" height=\"" + height +
        "\"></canvas>").insertAfter(after);
  
      this.rawCanvas = $("#" + id)[0];
    }
    
    this.rawctx = this.rawCanvas.getContext('2d');

    // Store the canvas size

    this.ctxDimensions.width = width;
    this.ctxDimensions.height = height;
  };
  
  this.resetSize = function () {

    var width = this.imgElement.width;
    var height = this.imgElement.height;

    this.rawCanvas.width = width;
    this.rawCanvas.height = height;

    // Store the canvas size

    this.ctxDimensions.width = width;
    this.ctxDimensions.height = height;
  };

  this.findEdges = function () {
    //this.generatePixelData();
    this.coreLoop();
  };
  
  this.generatePixelData = function (canvas) {

    var created = false;
    if (canvas == null) {
      canvas = document.createElement('canvas');
      created = true;
    }

    var ctx = canvas.getContext('2d'),
        dataURL,
        width = this.imgElement.width,
        height = this.imgElement.height;
    canvas.width = width;
    canvas.height = height;

    if (created) {
      ctx.drawImage(this.imgElement, 0, 0, width, height);
    }

    this.pixelData = ctx.getImageData(0, 0 , width, height);

    if (created) {
      canvas = null;
    }
  };
  
  this.coreLoop = function(){
    var x = 0;
    var y = 0;

    var pixel = undefined;
    var left = undefined;
    var top = undefined;
    var right = undefined;
    var bottom = undefined;

    var row = this.ctxDimensions.width * 4;
    var third = 0.333333;

    for (y = 0; y < this.pixelData.height; y++) {
      for(x = 0; x < this.pixelData.width; x++) {

        // get this pixel's data

        index = (x + y * this.ctxDimensions.width) * 4;
        pixel =
          (this.pixelData.data[index + 2]
          + this.pixelData.data[index + 1]
          + this.pixelData.data[index]) * third;

        // Get the values of the surrounding pixels
        // Color data is stored [r,g,b,a][r,g,b,a]
        // in sequence.

        left =
          (this.pixelData.data[index - 2]
          + this.pixelData.data[index - 3]
          + this.pixelData.data[index - 4]) * third;

        right =
          (this.pixelData.data[index + 6]
          + this.pixelData.data[index + 5]
          + this.pixelData.data[index + 4]) * third;

        top =
          (this.pixelData.data[index - row]
          + this.pixelData.data[index + 1 - row]
          + this.pixelData.data[index + 2 - row]) * third;

        bottom =
          (this.pixelData.data[index + row]
           + this.pixelData.data[index + 1 + row]
           + this.pixelData.data[index + 2 + row]) * third;

        // Compare it all

        if (
          pixel > left + this.threshold ||
          pixel < left - this.threshold ||
          pixel > right + this.threshold ||
          pixel < right - this.threshold ||
          pixel > top + this.threshold ||
          pixel < top - this.threshold ||
          pixel > bottom + this.threshold ||
          pixel < bottom - this.threshold
        ) {
          this.plotPoint(x,y);
        }
      }
    }
  };
  
  this.plotPoint = function(x,y){

    this.rawctx.beginPath();
    this.rawctx.arc(x, y, 0.5, 0, 2 * Math.PI, false);
    this.rawctx.fillStyle = 'black';
    this.rawctx.fill();
    this.rawctx.beginPath();
  };

  this.process = function (elem, id) {
    if (elem == null) {
      elem = $('#image')[0];
    }
    if (id == null) {
      id = "rawData";
    }
    this.init(elem, id);
    this.generatePixelData();
    this.findEdges();
  }

  this.update = function(val) {
    this.threshold = val;
    this.rawctx.clearRect(
      0, 0, this.ctxDimensions.width, this.ctxDimensions.height
    );
    this.coreLoop();
  }
}

var edgeDetector = new edgeDetector();

function round2(n) {
  return Math.round(n * 100) / 100;
}

function setWidth(val) {
  var aspect =
    edgeDetector.imgElement.width /
    edgeDetector.imgElement.height;
  $('#width').val(round2(val));
  $('#height').val(round2(val / aspect));
}

function setHeight(val) {
  var aspect =
    edgeDetector.imgElement.width /
    edgeDetector.imgElement.height;
  $('#width').val(round2(val * aspect));
  $('#height').val(round2(val));
}

function setPieces(val) {
  $('#pieces').val(val);
}

$(document).ready(function(){
  
  // Run when the threshold changes

  //$('#threshold').change(function () {
  //  edgeDetector.update($(this).val());
  //});
  
  $('#width').change(function () { setWidth($(this).val()); } );
  $('#height').change(function () { setHeight($(this).val()); } );
});