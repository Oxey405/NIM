console.log("🚀Node Installer & Manager (NIM)");
//getting all libraries (using as little as possible)
const os = require("os");
const fs = require("fs");
const https = require("https");
const fetch = require("node-fetch");
const StreamZip = require("node-stream-zip");
const versionStoreDir = os.homedir() + "/nim-version-storing";
if (os.platform() == "darwin") {
  console.log(
    "⚠MacOS version has NOT been tested yet. Please provide feedback and feel free to report an issue at https://github.com/Oxey405/NIM"
  );
}
//remove this if not in BETA
console.log(
  "⚠This software is still in Beta. Feel free to report an issue at https://github.com/Oxey405/NIM or contact by email at Oxey405@protonmail.com"
);
let storedVersions = [];
if (!fs.existsSync(versionStoreDir)) {
  try {
    fs.mkdirSync(versionStoreDir);
  } catch (error) {
    console.error(
      "❌Critical error : could not create the folder " +
        versionStoreDir +
        ". Does NIM has enough privileges ?"
    );
  }
} else {
  storedVersions = fs.readdirSync(versionStoreDir).map((x) => {
    x = x.replace(".zip", "");
    x = x.replace(".tar.gz", "");
    return x;
  });
}
let sysArch = os.arch();
let sysOS = os.platform();
console.log("🌌Starting NIM CLI...");
let versionsURL = "https://api.github.com/repos/nodejs/node/releases";
let downloadVersionURLStart = "https://nodejs.org/dist/";
const args = process.argv.slice(2);

// CONFIG
let targettedVersion = "latest";
let appMode = "install";
let downloadMode = "normal";

//parsing arguments
args.forEach((arg) => {
  if (arg.startsWith("nodeVersion=")) {
    targettedVersion = arg.replace("nodeVersion=", "");
  }

  if (arg.startsWith("mode=")) {
    appMode = arg.replace("mode=", "");
    if (appMode != "install" && appMode != "switch" && appMode != "download") {
      console.log(
        '❌ Critical error : argument "mode" was set to ' +
          appMode +
          " expected install, switch or remove"
      );
    }
  }

  if (arg.startsWith("download=")) {
    downloadMode = arg.replace("download=", "");
    if (downloadMode != "normal" && downloadMode != "force") {
      console.log(
        "❌Download mode was set to " +
          downloadMode +
          " expected normal or force"
      );
    }
  }

  //show documentation
  if (arg == "help" || arg == "doc") {
    console.log(
      "\r\n----------------------------DOCUMENTATION----------------------------"
    );
    console.log("NIM 🚀 : A node installer and version manager");
    console.log("\r\nArguments used by NIM :\r\n");
    console.log(
      "nodeVersion=(latest/vX.Y.Z) | set the node version to manage/install | default : latest"
    );
    console.log(
      "mode=(install/switch/remove) | Install, switch to or remove a version of NodeJS | default : install"
    );
    console.log(
      "download=(normal/force) | Force the downloading from source or use version caching | default : normal"
    );
    console.log("\r\nStoring version system (or version caching) :\r\n");
    console.log(
      "If a version is already stored in the version storage found at " +
        versionStoreDir +
        ".\r\nIt won't download unless you set download to force (download=force)"
    );
    console.log("\r\nIntent of this software (or what is the use of NIM)\r\n");
    console.log(
      "NIM is here to install and manage nodeJS versions. It require the user to have at least one version of NodeJS installed \r\n or else it won't be able to run properly."
    );
    console.log(
      "----------------------------DOCUMENTATION----------------------------\r\n"
    );
    process.exit(0);
  }
});

let versions = ["latest"];
console.log("⏬Checking out versions on github...");
//getting versions from github and storing them in "versions" array
fetch(versionsURL)
  .then((res) => res.json())
  .then((body) => {
    console.log(
      "✅Got the versions ! Checking availability for : " + targettedVersion
    );
    console.log(storedVersions);
    if (targettedVersion == "latest") {
      targettedVersion = body[0].tag_name;
    }
    body.forEach((element) => {
      versions.push(element.tag_name);
    });
    //if we already have version, we "enable it"
    if (storedVersions.includes(targettedVersion)) {
      console.log("version already stored, passing to install");
      enableVersion(targettedVersion);
    } else {
      console.log("Version is not in the stored versions, ");
      downloadVersion();
    }
  });

function downloadVersion() {
  if (!versions.includes(targettedVersion)) {
    console.error("❌Could not find the version : " + targettedVersion);
    return;
  } else {
    console.log(
      "📥Version available, downloading for " +
        sysOS +
        " architecture " +
        sysArch
    );
    let fileType;
    let sysOSName = sysOS;
    if (sysOS == "linux") {
      fileType = "tar.gz";
    }
    if (sysOS == "win32") {
      fileType = "zip";
      sysOSName = "win";
    }
    if (sysOS == "darwin") {
      fileType = "tar.gz";
    }

    let downloadURL =
      downloadVersionURLStart +
      targettedVersion +
      "/node-" +
      targettedVersion +
      "-" +
      sysOSName +
      "-" +
      sysArch +
      "." +
      fileType;
    console.log(
      "Downloading from : " +
        downloadURL +
        " in 3 seconds. Press Ctrl+C to cancel."
    );
    setTimeout(() => {
      downloadAndInstallVersion(downloadURL, fileType);
    }, 3500);
  }
}
/**
 * Download and extract the version
 * @param {String} url URL of version
 * @param {String} fileType file type (needed to store file in temp dir)
 */
function downloadAndInstallVersion(url, fileType) {
  let urlToDownload = new URL(url); //parsing to be sure
  if (urlToDownload.hostname !== "nodejs.org") {
    console.log("❌Domain not valid, automatically preventing downloading.");
  } else {
    let shaSignURL = `https://nodejs.org/dist/${targettedVersion}/SHASUMS256.txt`;
    const tmpDir = os.tmpdir() + "/nim-node-manager/";
    try {
      fs.mkdirSync(tmpDir);
    } catch (error) {
      //do nothing...
    }
    //for CLI purposes, we only show the progress every 200 packets
    let count = 0;
    let dlFilePath =
      tmpDir + `node-${targettedVersion}-${sysOS}-${sysArch}.${fileType}`;
    const downloadedFile = fs.createWriteStream(dlFilePath);
    console.log("📡Downloading from " + urlToDownload.href);
    https.get(urlToDownload.href, function (response) {
      response.pipe(downloadedFile);
      console.log(
        "downloading ~" +
          Math.round(response.headers["content-length"] / 10 ** 6) +
          " Megabytes (Mo) of data"
      );
      downloadedFile.on("finish", () => {
        downloadedFile.close();
        console.log(
          Math.round(response.headers["content-length"] / 10 ** 6) +
            "/" +
            Math.round(response.headers["content-length"] / 10 ** 6) +
            " Mo"
        );
        fs.renameSync(
          dlFilePath,
          versionStoreDir + "/" + targettedVersion + "." + fileType
        );
        console.log("💾Download complete and stored ! Installing in 2 seconds");
        storedVersions.push(targettedVersion);
        setTimeout(() => {
          enableVersion(targettedVersion);
        }, 2000);
      });
      downloadedFile.on("error", (err) => {
        console.log("❌Error while downloading ! Quitting because of error : ");
        throw err;
      });
      //drain almost = when a chunk of data is piped in
      downloadedFile.on("drain", () => {
        count++;
        if (count >= 200) {
          console.log(
            Math.round(downloadedFile.bytesWritten / 10 ** 6) +
              "/" +
              Math.round(response.headers["content-length"] / 10 ** 6) +
              " Mo"
          );
          count = 0;
        }
      });
    }); // end of https request
  }
}

async function enableVersion(version) {
  if (!storedVersions.includes(version)) {
    console.error(
      "❌Could not enable version " +
        version +
        " reason : This version isn't stored."
    );
    return;
  }
  let fileType;
  if (sysOS == "linux") {
    fileType = "tar.gz";
  }
  if (sysOS == "win32") {
    fileType = "zip";
    sysOSName = "win";
  }
  if (sysOS == "darwin") {
    fileType = "tar.gz";
  }
  const nodeFilePath = versionStoreDir + "/" + version + "." + fileType;
  let nodeDestination = versionStoreDir + "/ExtractedVersions"; //This is where we store a version "by default"
  //But we would like to store it in the actual nodeJS directory to be sure.
  if (sysOS == "win32") {
    nodeDestination = `C:\\${os.userInfo().username}\\Program Files\\nodejs`;
  }
  if (sysOS == "linux") {
    nodeDestination = `/usr/bin/nodejs`;
  }
  if (sysOS == "darwin") {
    nodeDestination = "/usr/bin/node"; //cannot test for MacOS for now
  }
  console.log("💿installing from " + nodeFilePath);
  console.log(nodeDestination);
  const zip = new StreamZip.async({ file: nodeFilePath });
  let insideDir = `node-${version}-${sysOSName}-${sysArch}`;
  await zip.extract(insideDir, nodeDestination).then((err) => {
    if (err) {
      console.log("critical error while extracting : " + err);
    }
    console.log("Extracted ! Closing...");
  });
  await zip.close();
}

function disableCurrentVersion() {
  let nodeDestination = versionStoreDir + "/ExtractedVersions"; //This is where we store a version "by default"
  //But we would like to store it in the actual nodeJS directory to be sure.
  if (sysOS == "win32") {
    nodeDestination = `C:\\Program Files\\nodejs`; //should be installed in here by default
  }
  if (sysOS == "linux") {
    nodeDestination = `/usr/bin/nodejs`; //could be /usr/bin/node (a symlink to /usr/bin/nodejs)
  }
  if (sysOS == "darwin") {
    nodeDestination = "/usr/bin/node"; //Oxey405 cannot test for MacOS because he doesn't own a MacOS device
  }
}
