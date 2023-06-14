'use strict';

import net from "net";
import { exec } from "child_process";
import { PrettyConsole } from "./pretty-console.js";

export default class MpvClient {

  constructor() {
    this._prettyConsole = new PrettyConsole();
    this._mpvProcess = this._startMpvProcess();
    this._tryToReconnectClient = true;
    this._requestQueue = {};
    this._currentRequest = "";
    this._nextRequestId = 0;
    // allow a second for mpv to start up (if this attempt fails, we'll automatically try again a second later)
    setTimeout(this._connectClient.bind(this), 1000);
  }


  // run the command 'mpv --ipc-server=/tmp/mpv-socket --idle' from the command line
  _startMpvProcess() {
    this._prettyConsole.info("Starting MPV process...");
    return exec("mpv --input-ipc-server=/tmp/mpv-socket --idle --save-position-on-quit --osc=no --fullscreen", (error, stdout, stderr) => {
    //return exec("mpv --input-ipc-server=/tmp/mpv-socket --idle --save-position-on-quit --osc=no", (error, stdout, stderr) => {
      if (error) {
        if (error.code === 4){
          this._prettyConsole.info("MPV has received SIGINT, exiting...");
        } else {
          this._prettyConsole.error(`MPV error: ${error.message}`);
          console.log(error);
        }
        return;
      }
      if (stderr) {
        this._prettyConsole.error(`MPV stderr: ${stderr}`);
        return;
      }
      this._prettyConsole.log(`MPV stdout: ${stdout}`);
    });
  }

  _clientConnected () {
    this._prettyConsole.success("Connected to mpv.");
  }

  _clientDataReceived(data) {
    let dataStr = data.toString();

    // iterate over dataStr and add each character to currentRequest until a newline is found
    // then parse currentRequest as JSON and look for a request_id property. If it exists, then
    // we can resolve the promise associated with that request_id. If it doesn't exist, then
    // just print the content of the message to the console.

    for (let i = 0; i < dataStr.length; i++) {
      if (dataStr[i] === "\n") {
        let message = JSON.parse(this._currentRequest);
        if (message.request_id != null && (message.request_id in this._requestQueue)) {
          this._requestQueue[message.request_id](message);
          delete this._requestQueue[message.request_id];
        }
        this._currentRequest = "";
      } else {
        this._currentRequest += dataStr[i];
      }
    }
  }

  _clientDisconnected() { 
    if (this._tryToReconnectClient) {
      this._prettyConsole.warn("Disconnected from mpv, reconnecting...");
      setTimeout(this._connectClient.bind(this), 1000);
    } else {
      this.PrettyConsole.info("Disconnected from mpv, shutting down client...");
    }
  }

  _clientError(err) {
    
    // if we get an EPIPE after we've told mpv to quit, then we can safely exit
    // and do not need to display an error message.
    if (! this._tryToReconnectClient && err.code === "EPIPE") {
      this._prettyConsole.info("MPV has been shut down, exiting...");
      return;
    }

    this._prettyConsole.error("MPV client error: " + err);

    if (this._tryToReconnectClient) {

      // make sure mpvProcess is still running, if it's not, then we'll try to restart it
      if (this._mpvProcess.exitCode !== null) {
        this._prettyConsole.warn("MPV process has exited, restarting...");
        this._mpvProcess = this._startMpvProcess();
      }

      this._prettyConsole.info("Reconnecting to MPV...");
      setTimeout(this._connectClient.bind(this), 1000);
    } else {
      this._prettyConsole.info("Shutting down mpv client...");
    }

  }

  _connectClient() {
    this._client = net.createConnection("/tmp/mpv-socket");
    this._client.on("connect", this._clientConnected.bind(this));
    this._client.on("data", this._clientDataReceived.bind(this));
    this._client.on("end", this._clientDisconnected.bind(this));
    this._client.on("error", this._clientError.bind(this));
  }

  async mpvRequest(request) {
    return new Promise((resolve, reject) => {
      request.request_id = this._nextRequestId++;
      this._client.write(JSON.stringify(request) + "\n");
      this._requestQueue[request.request_id] = (response) => {
        resolve(response);
      };
    });
  }

  shutdownMpv() {
    let result =  new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        console.log("mpv process did not exit after 5 seconds, killing it...");
        this._mpvProcess.kill();
        resolve();
      }, 5000);

      this._mpvProcess.on("exit", () => {
        clearTimeout(timeout);
        console.log("mpv process has exited");
        resolve();
      });
    });
    
    this._tryToReconnectClient = false;
    this._client.write('{ "command": ["quit", 0] }\n');
    return result;
  }

}
