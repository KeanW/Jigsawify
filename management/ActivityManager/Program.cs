using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using Newtonsoft.Json;
using AIO.ACES.Models;
using AIO.Operations;

namespace Client
{
  class Program
  {
    static readonly string PackageName = "Adsk_JigsawPackage";
    static readonly string ActivityName = "Adsk_JigsawActivity";

    static Container container;
    static void Main(string[] args)
    {
      // Instruct client side library to insert token as Authorization value
      // into each request
      
      container =
        new Container(
          new Uri("https://developer.api.autodesk.com/autocad.io/us-east/v2/")
        );
      var token = GetToken();
      container.SendingRequest2 +=
        (sender, e) => e.RequestMessage.SetHeader("Authorization", token);

      // Check if our app package exists

      AppPackage package = null;
      try
      {
        package =
          container.AppPackages.Where(
            a => a.Id == PackageName
          ).FirstOrDefault();
      }
      catch { }

      string res = null;
      if (package != null)
        res =
          Prompts.PromptForKeyword(
            string.Format(
              "AppPackage '{0}' already exists. What do you want to do? " +
              "[Delete/Recreate/Update/Leave]<Update>", PackageName
            )
          );

      if (res == "Delete")
      {
        container.DeleteObject(package);
        container.SaveChanges();
        package = null;

        Activity activity2 = null;
        try
        {
          activity2 = container.Activities.ByKey(ActivityName).GetValue();
        }
        catch { }

        if (activity2 != null)
        {
          container.DeleteObject(activity2);
          container.SaveChanges();
          activity2 = null;
        }
        return;
      }

      if (res == "Recreate")
      {
        container.DeleteObject(package);
        container.SaveChanges();
        package = null;
      }

      if (res != "Leave")
      {
        package = CreateOrUpdatePackage(CreateZip(), package);
      }

      // Check if our activity already exist

      Activity activity = null;
      try
      {
        activity = container.Activities.ByKey(ActivityName).GetValue();
      }
      catch { }
      if (activity != null)
      {
        if (
          Prompts.PromptForKeyword(
            string.Format(
              "Activity '{0}' already exists. Do you want to recreate it? " +
              "[Yes/No]<No>", ActivityName
            )
          ) == "Yes")
        {
          container.DeleteObject(activity);
          container.SaveChanges();
          activity = null;
        }
      }
      if (activity == null)
      {
        activity = CreateActivity(package);
      }

      // Save outstanding changes if any
      
      container.SaveChanges();

      // Finally submit workitem against our activity
      
      SubmitWorkItem(activity);

      Console.WriteLine("Hit a key to continue...");
      Console.ReadKey();
    }

    static string GetToken()
    {
      using (var client = new HttpClient())
      {
        var values = new List<KeyValuePair<string, string>>();
        values.Add(new KeyValuePair<string, string>("client_id",
        Credentials.ConsumerKey));
        values.Add(new KeyValuePair<string, string>("client_secret",
        Credentials.ConsumerSecret));
        values.Add(
          new KeyValuePair<string, string>("grant_type", "client_credentials")
        );
        var requestContent = new FormUrlEncodedContent(values);
        var response =
          client.PostAsync(
            "https://developer.api.autodesk.com/authentication/v1/authenticate",
            requestContent
          ).Result;
        var responseContent = response.Content.ReadAsStringAsync().Result;
        var resValues =
          JsonConvert.DeserializeObject<Dictionary<string, string>>(
            responseContent
          );
        return resValues["token_type"] + " " + resValues["access_token"];
      }
    }

    static string CreateZip()
    {
      Console.WriteLine("Generating autoloader zip...");

      string zip = "package.zip";
      if (File.Exists(zip))
        File.Delete(zip);
      
      using (var archive = ZipFile.Open(zip, ZipArchiveMode.Create))
      {
        string bundle = PackageName + ".bundle";
        string name = "PackageContents.xml";
        archive.CreateEntryFromFile(name, Path.Combine(bundle, name));
        name = "Jigsaw.dll";
        archive.CreateEntryFromFile(
          name, Path.Combine(bundle, "Contents", name)
        );
        name = "Newtonsoft.Json.dll";
        archive.CreateEntryFromFile(
          name, Path.Combine(bundle, "Contents", name)
        );
      }
      return zip;
    }

    static AppPackage CreateOrUpdatePackage(
      string zip, AppPackage package
    )
    {
      Console.WriteLine("Creating/Updating AppPackage...");
      
      // First step -- query for the url to upload the AppPackage file

      var url = container.AppPackages.GetUploadUrl().GetValue();

      // Second step -- upload AppPackage file

      Console.WriteLine("Uploading autoloader zip...");
      UploadObject(url, zip);

      if (package == null)
      {
        // Third step -- after upload, create the AppPackage entity
        
        package = new AppPackage()
        {
          Id = PackageName,
          Version = 1,
          RequiredEngineVersion = "20.0",
          Resource = url
        };
        container.AddToAppPackages(package);
      }
      else
      {
        // Or update the existing one with the new url
        
        package.Resource = url;
        container.UpdateObject(package);
      }

      container.SaveChanges();

      return package;
    }

    static void UploadObject(string url, string filePath)
    {
      using (var client = new HttpClient())
      {
        client.PutAsync(
          url,
          new StreamContent(File.OpenRead(filePath))
        ).Result.EnsureSuccessStatusCode();
      }
    }


    // Creates an activity with 2 inputs and variable number of outputs.
    // All outputs are placed in a folder 'outputs'

    static Activity CreateActivity(AppPackage package)
    {
      Console.WriteLine("Creating/Updating Activity...");
      var activity = new Activity()
      {
        Id = ActivityName,
        Version = 2,
        Instruction = new Instruction()
        {
          Script = "_jigio params.json pixels.json outputs\n"
        },
        Parameters = new Parameters()
        {
          InputParameters =
          {
            new Parameter()
            {
              Name = "HostDwg", LocalFileName = "$(HostDwg)"
            },
            new Parameter()
            {
              Name = "Params", LocalFileName = "params.json"
            },
            new Parameter()
            {
              Name = "PixelsUrl", LocalFileName = "pixels.json"
            }
          },
          OutputParameters = {
            new Parameter()
            {
              Name = "Results", LocalFileName = "outputs"
            }
          }
        },
        RequiredEngineVersion = "20.0"
      };
      
      // Establish link to package

      activity.AppPackages.Add(PackageName); // reference the custom AppPackage
      
      container.AddToActivities(activity);
      container.SaveChanges();
      
      return activity;
    }

    static void SubmitWorkItem(Activity activity)
    {
      Console.WriteLine("Submitting workitem...");
      
      // Create a workitem
      
      var wi = new WorkItem()
      {
        Id = "", // Must be set to empty
        Arguments = new Arguments(),
        ActivityId = activity.Id
      };

      wi.Arguments.InputArguments.Add(new Argument()
      {
        Name = "HostDwg", // Must match the input parameter in activity
        Resource =
          "http://download.autodesk.com/us/support/files/autocad_2015_templates/acad.dwt",
        StorageProvider = StorageProvider.Generic // Generic HTTP download (vs A360)
      });

      wi.Arguments.InputArguments.Add(new Argument()
      {
        Name = "Params", // Must match the input parameter in activity
        
        ResourceKind = ResourceKind.Embedded, 
        Resource =
          @"data:application/json, " +
          JsonConvert.SerializeObject(
            new JigsawGenerator.Parameters
            {
              Width = 12, Height = 12, Pieces = 100, XRes = 300, YRes = 300
            }
          ),
        StorageProvider = StorageProvider.Generic
      });

      wi.Arguments.InputArguments.Add(new Argument()
      {
        Name = "PixelsUrl", // Must match the input parameter in activity

        // Use data URL to send json parameters without having to upload
        // them to storage

        Resource = "http://through-the-interface.typepad.com/test/jigtest.json",

        StorageProvider = StorageProvider.Generic
      });

      wi.Arguments.OutputArguments.Add(new Argument()
      {
        Name = "Results", // Must match the output parameter in activity
        StorageProvider = StorageProvider.Generic, // Generic HTTP upload (vs A360)
        HttpVerb = HttpVerbType.POST, // Use HTTP POST when delivering result
        Resource = null, // Use storage provided by AutoCAD.IO
        ResourceKind = ResourceKind.ZipPackage // Upload as zip to output dir
      });

      container.AddToWorkItems(wi);
      container.SaveChanges();

      // Polling loop

      do
      {
        Console.WriteLine("Sleeping for 2 sec...");
        System.Threading.Thread.Sleep(2000);
        container.LoadProperty(wi, "Status"); // HTTP request is made here
        Console.WriteLine("WorkItem status: {0}", wi.Status);
      }
      while (
        wi.Status == ExecutionStatus.Pending ||
        wi.Status == ExecutionStatus.InProgress
      );

      // Re-query the service so that we can look at the details provided
      // by the service
      
      container.MergeOption =
        Microsoft.OData.Client.MergeOption.OverwriteChanges;
      wi = container.WorkItems.ByKey(wi.Id).GetValue();

      // Resource property of the output argument "Results" will have
      // the output url
      
      var url =
        wi.Arguments.OutputArguments.First(
          a => a.Name == "Results"
        ).Resource;

      if (url != null)
        DownloadToDocs(url, "AIO.zip");

      // Download the status report
      
      url = wi.StatusDetails.Report;
      
      if (url != null)
        DownloadToDocs(url, "AIO-report.txt");
    }

    static void DownloadToDocs(string url, string localFile)
    {
      using (var client = new HttpClient())
      {
        var content = (StreamContent)client.GetAsync(url).Result.Content;
        var fname =
          Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            localFile
          );

        Console.WriteLine("Downloading to {0}.", fname);
        
        using (var output = System.IO.File.Create(fname))
        {
          content.ReadAsStreamAsync().Result.CopyTo(output);
          output.Close();
        }
      }
    }
  }
}