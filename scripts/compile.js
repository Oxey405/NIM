const nexe = require("nexe");
console.log("Check if you have NASM installed");
console.log("STARTING NIM COMPILATION INTO EXEC");
//You'll probably need NASM if you are not on Linux / Mac
console.log("For Linux, Win32, Mac...");
nexe
  .compile({
    input: "./index.js",
    build: true,
    targets: [
      "win32-x86",
      "win32-x64",
      "linux-x64",
      "linux-x86",
      "mac-x86",
      "mac-x64",
    ],
    bundle: true,
    output: "builds/",
  })
  .then(() => {
    console.log("success");
  });
