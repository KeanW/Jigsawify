using Autodesk.Forge;
using Autodesk.Forge.Core;
using Autodesk.Forge.DesignAutomation;
using Autodesk.Forge.DesignAutomation.Model;
using Autodesk.Forge.Model;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Activity = Autodesk.Forge.DesignAutomation.Model.Activity;

namespace ClientV3
{
    public class Pixel
    {
        public int X { get; set; }
        public int Y { get; set; }
    }

    public class Parameters
    {
        public double Width { get; set; }
        public double Height { get; set; }
        public int Pieces { get; set; }
        public int XRes { get; set; }
        public int YRes { get; set; }
        public Pixel[] Pixels { get; set; }
    }
    class App
    {
        
        static readonly string PackageName = "Adsk_JigsawPackage_v3";
        static readonly string ActivityName = "Adsk_JigsawActivity_v3";
        //e.g. Owner = MyTestApp (it must be *globally* unique)
        static readonly string Owner = "JigSawV3"; 
        //need to set, singed resource, like OSS, S3.
        static string UploadUrl = ""; 
        static readonly string Label = "prod";
        static readonly string TargetEngine = "Autodesk.AutoCAD+23_1";
        private static dynamic InternalToken { get; set; }

        public DesignAutomationClient api;
        public ForgeConfiguration config;
        public App(DesignAutomationClient api, IOptions<ForgeConfiguration> config)
        {
            this.api = api;
            this.config = config.Value;
        }

        public async Task<dynamic> GetInternalAsync()
        {
            if (InternalToken == null || InternalToken.ExpiresAt < DateTime.UtcNow)
            {
                InternalToken = await Get2LeggedTokenAsync(new Scope[] { Scope.BucketCreate, Scope.BucketRead, Scope.BucketDelete, Scope.DataRead, Scope.DataWrite, Scope.DataCreate, Scope.CodeAll });
                InternalToken.ExpiresAt = DateTime.UtcNow.AddSeconds(InternalToken.expires_in);
            }

            return InternalToken;
        }
        /// <summary>
        /// Get the access token from Autodesk
        /// </summary>
        public async Task<dynamic> Get2LeggedTokenAsync(Scope[] scopes)
        {
            TwoLeggedApi oauth = new TwoLeggedApi();
            string grantType = "client_credentials";
            dynamic bearer = await oauth.AuthenticateAsync(config.ClientId,
              config.ClientSecret,
              grantType,
              scopes);
            return bearer;
        }
        public async Task RunAsync()
        {
            if (string.IsNullOrEmpty(Owner))
            {
                Console.WriteLine("Please provide non-empty Owner.");
                return;
            }

            if (string.IsNullOrEmpty(UploadUrl))
            {
                Console.WriteLine("Creating Bucket and OSS Object");


                dynamic oauth = await GetInternalAsync();

                // 1. ensure bucket existis
                string bucketKey = Owner.ToLower();
                BucketsApi buckets = new BucketsApi();
                buckets.Configuration.AccessToken = oauth.access_token;
                dynamic bucketsRes = null;
                try
                {
                    PostBucketsPayload bucketPayload = new PostBucketsPayload(bucketKey, null, PostBucketsPayload.PolicyKeyEnum.Transient);
                    bucketsRes = await buckets.CreateBucketAsync(bucketPayload, "US");
                }
                catch {
                    Console.WriteLine($"\tBucket {bucketKey} exists");
                }; // in case bucket already exists
                string outputFileNameOSS = "output.zip";
                ObjectsApi objects = new ObjectsApi();
                objects.Configuration.AccessToken = oauth.access_token;
                try
                {
                    PostBucketsSigned bucketsSigned = new PostBucketsSigned(60);
                    dynamic signedResp = await objects.CreateSignedResourceAsync(bucketKey, outputFileNameOSS, bucketsSigned, "readwrite");
                    UploadUrl = signedResp.signedUrl;
                }
                catch {}
                
            }

            if (!await SetupOwnerAsync())
            {
                Console.WriteLine("Exiting.");
                return;
            }

            var myApp = await SetupAppBundleAsync();
            var myActivity = await SetupActivityAsync(myApp);

            await SubmitWorkItemAsync(myActivity);
        }

        private async Task SubmitWorkItemAsync(string myActivity)
        {
            Console.WriteLine("Submitting up workitem...");
            var workItemStatus = await api.CreateWorkItemAsync(new Autodesk.Forge.DesignAutomation.Model.WorkItem()
            {
                ActivityId = myActivity,
                Arguments = new Dictionary<string, IArgument>()
                {
                    { "input", new XrefTreeArgument() { Url = "http://download.autodesk.com/us/support/files/autocad_2015_templates/acad.dwt" } },
                    { "params", new XrefTreeArgument() { Url = $"data:application/json, {JsonConvert.SerializeObject(new Parameters{Width = 12, Height = 12, Pieces = 100, XRes = 300, YRes = 300 })}" } },
                    { "pixels", new XrefTreeArgument(){Url="http://through-the-interface.typepad.com/test/jigtest.json"} },
                    //TODO: replace it with your own URL
                    { "result", new XrefTreeArgument() { Verb=Verb.Put, Url = UploadUrl} }
                }
            });

            Console.Write("\tPolling status");
            while (!workItemStatus.Status.IsDone())
            {
                await Task.Delay(TimeSpan.FromSeconds(2));
                workItemStatus = await api.GetWorkitemStatusAsync(workItemStatus.Id);
                Console.Write(".");
            }
            Console.WriteLine($"{workItemStatus.Status}.");
            var fname = await DownloadToDocsAsync(workItemStatus.ReportUrl, "Das-report.txt");
            Console.WriteLine($"Downloaded {fname}.");
            var outputZip = await DownloadToDocsAsync(UploadUrl, "output.zip");
            Console.WriteLine($"Downloaded {outputZip}.");
        }

        private async Task<string> SetupActivityAsync(string myApp)
        {
            Console.WriteLine("Setting up activity...");
            var myActivity = $"{Owner}.{ActivityName}+{Label}";
            var actResponse = await this.api.ActivitiesApi.GetActivityAsync(myActivity, throwOnError: false);
            var activity = new Activity()
            {
                Appbundles = new List<string>()
                    {
                        myApp
                    },
                CommandLine = new List<string>()
                    {
                        $"$(engine.path)\\accoreconsole.exe /i $(args[input].path) /al $(appbundles[{PackageName}].path) /s $(settings[script].path)"
                    },
                Engine = TargetEngine,
                Settings = new Dictionary<string, ISetting>()
                    {
                        { "script", new StringSetting() { Value = "_jigio params.json pixels.json outputs\n" } }//_PNGOUT\noutputs\\jigsaw.png\n\n
                    },
                Parameters = new Dictionary<string, Parameter>()
                    {
                        { "input", new Parameter() { Verb= Verb.Get, LocalName = "$(HostDwg)",  Required = true } },
                        { "params", new Parameter() { Verb= Verb.Get, LocalName = "params.json", Required = true} },
                        { "pixels",new Parameter()   {Verb=Verb.Get, LocalName= "pixels.json",Required=true} },
                        { "result", new Parameter() { Verb= Verb.Put, Zip= true, LocalName = "outputs", Required= true} }
                    },
                Id = ActivityName
            };
            if (actResponse.HttpResponse.StatusCode == HttpStatusCode.NotFound)
            {
                Console.WriteLine($"Creating activity {myActivity}...");
                await api.CreateActivityAsync(activity, Label);
                return myActivity;
            }
            await actResponse.HttpResponse.EnsureSuccessStatusCodeAsync();
            Console.WriteLine("\tFound existing activity...");
            if (!Equals(activity, actResponse.Content))
            {
                Console.WriteLine($"\tUpdating activity {myActivity}...");
                await api.UpdateActivityAsync(activity, Label);
            }
            return myActivity;

            bool Equals(Autodesk.Forge.DesignAutomation.Model.Activity a, Autodesk.Forge.DesignAutomation.Model.Activity b)
            {
                Console.Write("\tComparing activities...");
                //ignore id and version
                b.Id = a.Id;
                b.Version = a.Version;
                var res = a.ToString() == b.ToString();
                Console.WriteLine(res ? "Same." : "Different");
                return res;
            }
        }

        private async Task<string> SetupAppBundleAsync()
        {
            Console.WriteLine("Setting up appbundle...");
            var myApp = $"{Owner}.{PackageName}+{Label}";
            var appResponse = await this.api.AppBundlesApi.GetAppBundleAsync(myApp, throwOnError: false);
            var app = new AppBundle()
            {
                Engine = TargetEngine,
                Id = PackageName
            };
            var package = CreateZip();
            if (appResponse.HttpResponse.StatusCode == HttpStatusCode.NotFound)
            {
                Console.WriteLine($"\tCreating appbundle {myApp}...");
                await api.CreateAppBundleAsync(app, Label, package);
                return myApp;
            }
            await appResponse.HttpResponse.EnsureSuccessStatusCodeAsync();
            Console.WriteLine("\tFound existing appbundle...");
            if (!await EqualsAsync(package, appResponse.Content.Package))
            {
                Console.WriteLine($"\tUpdating appbundle {myApp}...");
                await api.UpdateAppBundleAsync(app, Label, package);
            }
            return myApp;

            async Task<bool> EqualsAsync(string a, string b)
            {
                Console.Write("\tComparing bundles...");
                using var aStream = File.OpenRead(a);
                var bLocal = await DownloadToDocsAsync(b, "das-appbundle.zip");
                using var bStream = File.OpenRead(bLocal);
                using var hasher = SHA256.Create();
                var res = hasher.ComputeHash(aStream).SequenceEqual(hasher.ComputeHash(bStream));
                Console.WriteLine(res ? "Same." : "Different");
                return res;
            }
        }

        private async Task<bool> SetupOwnerAsync()
        {
            Console.WriteLine("Setting up owner...");
            var nickname = await api.GetNicknameAsync("me");
            if (nickname == config.ClientId)
            {
                Console.WriteLine("\tNo nickname for this clientId yet. Attempting to create one...");
                HttpResponseMessage resp;
                resp = await api.ForgeAppsApi.CreateNicknameAsync("me", new NicknameRecord() { Nickname = Owner }, throwOnError: false);
                if (resp.StatusCode == HttpStatusCode.Conflict)
                {
                    Console.WriteLine("\tThere are already resources associated with this clientId or nickname is in use. Please use a different clientId or nickname.");
                    return false;
                }
                await resp.EnsureSuccessStatusCodeAsync();
            }
            return true;
        }
        static string CreateZip()
        {
            Console.WriteLine("\tGenerating autoloader zip...");
            string zip = "package.zip";
            if (File.Exists(zip))
                File.Delete(zip);
            using (var archive = ZipFile.Open(zip, ZipArchiveMode.Create))
            {
                string bundle = PackageName + ".bundle";
                string name = "PackageContents.xml";
                archive.CreateEntryFromFile(name, Path.Combine(bundle, name));
                name = "Jigsaw.dll";
                archive.CreateEntryFromFile(name, Path.Combine(bundle, "Contents", name));
                name = "Newtonsoft.Json.dll";
                archive.CreateEntryFromFile(name, Path.Combine(bundle, "Contents", name));
            }
            return zip;

        }

       

        static async Task<string> DownloadToDocsAsync(string url, string localFile)
        {
            var report = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, @"..\..\..\testOutputs"));
            var fname = Path.Combine(report, localFile);
            if (File.Exists(fname))
                File.Delete(fname);
            using var client = new HttpClient();
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();
            using (var fs = new FileStream(fname,FileMode.CreateNew))
            {
                await response.Content.CopyToAsync(fs);
            }

            return fname;
        }
    }
}

