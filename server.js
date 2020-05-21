var express = require("express");
var multer = require("multer");
var morgan = require("morgan");
var path = require("path");
var api = require("./api");

var app = express();

app.use(morgan("dev", { immediate: true }));

/* Configure the multer */

var done = false;

/*app.use(
  multer({
    dest: "./uploads/",
    rename: function (filename) {
      return filename + Date.now();
    },
    onFileUploadStart: function (file) {
      console.log(file.originalname + " is starting ...");
      done = false;
    },
    onFileUploadComplete: function (file) {
      console.log(file.fieldname + " uploaded to " + file.path);
      done = true;
    },
  }).single("media-drop-placeholder-file")
);*/
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});
var upload = multer({ storage: storage });

/////////////////////////////////////////////////////////////////////////////////
//  Webpages server
//
/////////////////////////////////////////////////////////////////////////////////
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.use("/", express.static(__dirname + "/html"));

app.use("/downloads", express.static(__dirname + "/downloads"));

app.use("/uploads", express.static(__dirname + "/uploads"));

app.use("/items", express.static(__dirname + "/items"));

/////////////////////////////////////////////////////////////////////////////////
//  Rest API
//
/////////////////////////////////////////////////////////////////////////////////
//app.get('/api/token', api.getToken);

app.get("/api/submit", api.submitData);

app.get("/api/check", api.checkData);

app.post("/api/upload", upload.single("imageFile"), (req, res, next) => {
  const file = req.file;
  if (!file) {
    const error = new Error("Please upload an image file");
    error.httpStatusCode = 400;
    return next(error);
  }

  res.send(file);
});

/////////////////////////////////////////////////////////////////////////////////
//
//
/////////////////////////////////////////////////////////////////////////////////
app.listen(process.env.PORT || 5000);

console.log("Listening on port 5000...");
