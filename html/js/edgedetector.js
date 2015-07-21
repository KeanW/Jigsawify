function edgeDetector(){
  
  // Variables

  this.imgElement = undefined;
  this.rawCanvas = undefined;
  this.rawctx = undefined;
  this.outCanvas = undefined;
  this.width = undefined;
  this.height = undefined;
  this.pixelData = undefined;
  this.threshold = 30;
  
  this.init = function (img, canvas, outcanvas, width, height) {

    this.imgElement = img;

    // Set the canvases

    this.rawCanvas = canvas;    
    this.rawctx = canvas.getContext('2d');
    this.outCanvas = outcanvas;
    
    // Store the canvas size

    this.width = (!width ? img.width : width);
    this.height = (!height ? img.height : height);
    
    // Generate the base pixel data
    
    this.pixelData = this.generatePixelData(width, height);
  };
  
  this.resetSize = function (width, height) {

    if (!this.rawCanvas)
      return;
      
    if (width && !height) {
      height = width * (this.height / this.width);
    }
    else {
      if (!width) {
        width = this.width;
      }
      if (!height) {
        height = this.height;
      }
    }

    this.rawCanvas.width = width;
    this.rawCanvas.height = height;

    // Store the canvas size

    this.width = width;
    this.height = height;
  };

  this.generatePixelData = function (width, height) {

    if (!this.imgElement)
      return null;
      
    if (!width)
      width = this.width;
    
    if (!height)
      height = this.height;

    this.outCanvas.width = width;
    this.outCanvas.height = height;
    var ctx = this.outCanvas.getContext("2d");    
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.imgElement, 0, 0, width, height);
    var pixelData = ctx.getImageData(0, 0 , width, height);

    return pixelData;
  };
  
  this.findEdges = function() {

    this.gatherPoints(this.pixelData, this.plotPoint);
  };
  
  this.generatePoints = function(width, height, args) {
  	
    if (!this.pixelData)
      return [];
     
    var points = [];

    this.gatherPoints(
      this.pixelData,
      function(obj,x,y) {
        points.push({ x: x, y: y });
      }
    );
    args = args || {};    
    args.XRes = width;
    args.YRes = height;
    args.Pixels = points;
    return args;
    /*
    return ({
      xres: width,
      yres: height,
      pixels: points
    });
    */
  }

  this.gatherPoints = function(pixelData, func) {
    
    if (!pixelData)
      return;

    var x = 0;
    var y = 0;
    var index = undefined;

    var pixel = undefined;
    var left = undefined;
    var top = undefined;
    var right = undefined;
    var bottom = undefined;

    var row = pixelData.width * 4;
    var third = 0.333333;

    for (y = 0; y < pixelData.height; y++) {
      for(x = 0; x < pixelData.width; x++) {

        // Get this pixel's data

        index = (x + y * pixelData.width) * 4;
        pixel =
          (pixelData.data[index + 2]
          + pixelData.data[index + 1]
          + pixelData.data[index]) * third;

        // Get the values of the surrounding pixels
        // Color data is stored [r,g,b,a][r,g,b,a]
        // in sequence.

        left =
          (pixelData.data[index - 2]
          + pixelData.data[index - 3]
          + pixelData.data[index - 4]) * third;

        right =
          (pixelData.data[index + 6]
          + pixelData.data[index + 5]
          + pixelData.data[index + 4]) * third;

        top =
          (pixelData.data[index - row]
          + pixelData.data[index + 1 - row]
          + pixelData.data[index + 2 - row]) * third;

        bottom =
          (pixelData.data[index + row]
           + pixelData.data[index + 1 + row]
           + pixelData.data[index + 2 + row]) * third;

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
          func(this,x,y);
        }
      }
    }
  }
  
  this.plotPoint = function(obj,x,y){
    
    obj.rawctx.beginPath();
    obj.rawctx.arc(x, y, 0.5, 0, 2 * Math.PI, false);
    obj.rawctx.fillStyle = 'black';
    obj.rawctx.fill();
    obj.rawctx.beginPath();
  };

  this.process = function (elem, canvas, outcanvas) {
    
    this.init(elem, canvas, outcanvas);
    this.pixelData = this.generatePixelData();
    this.findEdges();
  }

  this.update = function(val) {

    this.threshold = val;
    this.rawctx.clearRect(0, 0, this.width, this.height);
    this.findEdges();
  }

  /*
  this.postData = function() {
    
    var width = 200,
        height = calcDim(200, false);
    var pixData = this.generatePixelData(width, height);
    var pts = this.generatePoints(pixData, width, height),
        ps = JSON.stringify(pts),
        url = 'data:text/json;charset=utf8,' + encodeURIComponent(ps);
    window.open(url, '_blank');
    window.focus();
  }
  */
}