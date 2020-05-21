# Jigsawify
_Creates one-of-a-kind jigsaw puzzles using Autodesk's Forge platform._

[![Node.js](https://img.shields.io/badge/Node.js-12.16.3-blue.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-6.14.4-blue.svg)](https://www.npmjs.com/)
![Platforms](https://img.shields.io/badge/platform-windows%20%7C%20osx%20%7C%20linux-lightgray.svg)
[![OAuth2](https://img.shields.io/badge/OAuth2-v1-green.svg)](https://forge.autodesk.com/)
[![Data-Management](https://img.shields.io/badge/Data%20Management-v1-green.svg)](http://developer.autodesk.com/)
[![Design-Automation](https://img.shields.io/badge/Design%20Automation-v3-green.svg)](http://developer.autodesk.com/)
[![netCore](https://img.shields.io/badge/netcore-3.1-green)](https://dotnet.microsoft.com/download/dotnet-core/current/runtime)
[![License](https://img.shields.io/:license-mit-blue.svg)](https://opensource.org/licenses/MIT)

# Origins
This project originated from some work done to explore the use of laser cutters to create custom jigsaw puzzles. It became clear that some custom code - run inside AutoCAD - would help create a circular puzzle that was needed for a specific project. This code ended up being generalized and used an example of how AutoCAD I/O - now part of the Design Automation API in Autodesk's Forge platform - could run this code and make it available to web-sites and other web-services.

# Setup

## Prerequisites

1. **Forge Account**: Learn how to create a Forge Account, activate subscription and create an app at [this tutorial](http://learnforge.autodesk.io/#/account/). 
2. **Visual Studio**: Either Community (Windows) or Code (Windows, MacOS) 
3. **JavaScript** basic knowledge with **jQuery**
4. **AutoCAD .NET** basic knowledge with AutoCAD API
5. **NET core 3.1** basic knowledge with .NET core 3.1

## Run locally

Clone this project or download it. It's recommended to install [GitHub desktop](https://desktop.github.com/). To clone it via command line, use the following (**Terminal** on MacOSX/Linux, **Git Shell** on Windows):

```bash
git clone https://github.com/MadhukarMoogala/Jigsawify.git
```
## Running Design Automation Client V3 and CrxApp

#### Step 1: Restoring and building crxapp

```bash
cd Jigsawify
cd management\crxapp
nuget install packages.config -OutputDirectory ..\packages
msbuild /t:Build /p:Configuration=Release;Platform=x64
```

![crxapp-restore-build](D:\Work\Forge\Jigsawify\gifs\crxapp-restore-build.gif)

#### Step2: Building design automation .NET core client application

This is step is necessary to test design automation application, this application creates an `activity`, uploads `app bundles` and runs a `workitem`, a .NET core console application to test and play.

```bash
cd management\clientv3
dotnet build
```

![client-build](D:\Work\Forge\Jigsawify\gifs\client-build.gif)

#### Step3: Running client application

```bash
cd management\clientv3
dotnet run
```

![](D:\Work\Forge\Jigsawify\gifs\dotnet-run.gif)

#### Step4: Running Jigsaw site application

Install [NodeJS](https://nodejs.org).

To run it, install the required packages, set the environment variables with your client ID & secret and finally start it. Via command line, navigate to the folder where this repository was cloned and use the following:

Mac OSX/Linux (Terminal) / Windows (use <b>Node.js command line</b> from Start menu)

```bash
set FORGE_CLIENT_ID=<YourClientId>
set FORGE_CLIENT_SECRET=<YourClientSecret>
npm install
npm start
```

Open the browser: [http://localhost:5000](http://localhost:3000).

**Important:** do not use **npm start** locally, this is intended for PRODUCTION only with HTTPS (SSL) secure cookies.

## Deployment

To deploy this application to Heroku, the **Callback URL** for Forge must use your `.herokuapp.com` address. After clicking on the button below, at the Heroku Create New App page, set your Client ID, Secret and Callback URL for Forge.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/adamenagy/da.manager-nodejs)

Watch [this video](https://www.youtube.com/watch?v=Oqa9O20Gj0c) on how deploy samples to Heroku.

## Supporting links

* [Puzzling over laser cutters](http://through-the-interface.typepad.com/through_the_interface/2015/04/puzzling-over-laser-cutters.html)
* [AutoCAD I/O and custom applications](http://through-the-interface.typepad.com/through_the_interface/2015/05/autocad-io-and-custom-applications.html)
* [Finishing up our laser-cut jigsaw project](http://through-the-interface.typepad.com/through_the_interface/2015/06/finishing-up-our-laser-cut-jigsaw-project.html)
* [Running custom .NET code in the cloud using AutoCAD I/O – Part 1](http://through-the-interface.typepad.com/through_the_interface/2015/06/running-custom-net-code-in-the-cloud-using-autocad-io-part-1.html)
* [Running custom .NET code in the cloud using AutoCAD I/O – Part 2](http://through-the-interface.typepad.com/through_the_interface/2015/06/running-custom-net-code-in-the-cloud-using-autocad-io-part-2.html)
* [Running custom .NET code in the cloud using AutoCAD I/O – Part 3](http://through-the-interface.typepad.com/through_the_interface/2015/06/running-custom-net-code-in-the-cloud-using-autocad-io-part-3.html)
* [Running custom .NET code in the cloud using AutoCAD I/O – Part 4](http://through-the-interface.typepad.com/through_the_interface/2015/06/running-custom-net-code-in-the-cloud-using-autocad-io-part-4.html)
* [Architecting my first AutoCAD I/O application](http://through-the-interface.typepad.com/through_the_interface/2015/07/architecting-my-first-autocad-io-application.html)
* [Jigsawify.com: Creating custom jigsaw puzzles using AutoCAD I/O](http://through-the-interface.typepad.com/through_the_interface/2015/07/jigsawifycom-creating-custom-jigsaw-puzzles-using-autocad-io.html)
* [Jigsawify.com goes mobile-friendly](http://through-the-interface.typepad.com/through_the_interface/2015/08/jigsawifycom-goes-mobile-friendly.html)

## Written by
Kean Walmsley <br />
## Maintained by
Madhukar Moogala <br /> @galakar
http://forge.autodesk.com<br />