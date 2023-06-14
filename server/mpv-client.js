import net from "net";
import { exec } from "child_process";

// run the command 'mpv --ipc-server=/tmp/mpv-socket --idle' from the command line
function startMpvProcess() {
  console.log("starting mpv process...");
  return exec("mpv --input-ipc-server=/tmp/mpv-socket --idle --save-position-on-quit --osc=no --fullscreen", (error, stdout, stderr) => {
  //return exec("mpv --input-ipc-server=/tmp/mpv-socket --idle --save-position-on-quit --osc=no", (error, stdout, stderr) => {
    if (error) {
      if (error.code === 4){
        console.log("mpv has received SIGINT, exiting...");
      } else {
        console.log(`mpv error: ${error.message}`);
        console.log(error);
      }
      return;
    }
    if (stderr) {
      console.log(`mpv stderr: ${stderr}`);
      return;
    }
    console.log(`mpv stdout: ${stdout}`);
  });
}

let mpvProcess = startMpvProcess();
let client;
let tryToReconnectClient = true;

function clientConnected() {
  console.log("connected to mpv");
}

let requestQueue = {};
let currentRequest = "";
function clientDataReceived(data) {
  let dataStr = data.toString();

  // iterate over dataStr and add each character to currentRequest until a newline is found
  // then parse currentRequest as JSON and look for a request_id property. If it exists, then
  // we can resolve the promise associated with that request_id. If it doesn't exist, then
  // just print the content of the message to the console.

  for (let i = 0; i < dataStr.length; i++) {
    if (dataStr[i] === "\n") {
      let message = JSON.parse(currentRequest);
      if (message.request_id && (message.request_id in requestQueue)) {
        requestQueue[message.request_id](message);
        delete requestQueue[message.request_id];
      }
      currentRequest = "";
    } else {
      currentRequest += dataStr[i];
    }
  }
}

function clientDisconnected() { 
  if (tryToReconnectClient) {
    console.log("disconnected from mpv, reconnecting...");
    setTimeout(connectClient, 1000);
  } else {
    console.log("disconnected from mpv, shutting down client...");
  }
};

function clientError(err) {
  
  // if we get an EPIPE after we've told mpv to quit, then we can safely exit
  // and do not need to display an error message.
  if (! tryToReconnectClient && err.code === "EPIPE") {
    console.log("mpv has been shut down, exiting...");
    return;
  }

  console.log("client error: " + err);

  if (tryToReconnectClient) {

    // make sure mpvProcess is still running, if it's not, then we'll try to restart it
    if (mpvProcess.exitCode !== null) {
      console.log("mpv process has exited, restarting...");
      mpvProcess = startMpvProcess();
    }

    console.log("reconnecting...");
    setTimeout(connectClient, 1000);
  } else {
    console.log("shutting down mpv client...");
  }
}

function connectClient() {
  client = net.createConnection("/tmp/mpv-socket");
  client.on("connect", clientConnected);
  client.on("data", clientDataReceived);
  client.on("end", clientDisconnected);
  client.on("error", clientError);
};

// allow a second for mpv to start up (if the connection fails, we'll try again in a second)
setTimeout(connectClient, 1000);

let nextRequestId = 1;

export async function mpvRequest(request) {
  return new Promise((resolve, reject) => {
    request.request_id = nextRequestId++;
    client.write(JSON.stringify(request) + "\n");
    requestQueue[request.request_id] = (response) => {
      resolve(response);
    };
  });
}

export function shutdownMpv() {
  let result =  new Promise((resolve, reject) => {
    let timeout = setTimeout(() => {
      console.log("mpv process did not exit after 5 seconds, killing it...");
      mpvProcess.kill();
      resolve();
    }, 5000);

    mpvProcess.on("exit", () => {
      clearTimeout(timeout);
      console.log("mpv process has exited");
      resolve();
    });
  });
  
  tryToReconnectClient = false;
  client.write('{ "command": ["quit", 0] }\n');
  return result;

}


