
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import send from 'koa-send';
import serveStatic from 'koa-static';
import MpvClient from './mpv-client.js';
import getLocalIp from './get-local-ip.js';
import { PrettyConsole } from './pretty-console.js';
import dotenv from 'dotenv';

dotenv.config();

const host = process.env.HTTP_HOST || "0.0.0.0";
const port = process.env.HTTP_PORT || 3000;
const MEDIA_ROOT =  process.env.MEDIA_ROOT || process.env.HOME;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let currentDirectory = MEDIA_ROOT;
const mpvClient = new MpvClient();
const prettyConsole = new PrettyConsole()

process.on("SIGINT", async () => {
  prettyConsole.log("SIGINT received, shutting down...");
  await mpvClient.shutdownMpv();
  process.exit(0);
});

const app = new Koa();
app.use(bodyParser());
app.use(cors());

app.use(serveStatic(__dirname + '/../client/dist'));

app.use(async ctx => {
  if (ctx.method === "GET") {
    await send(ctx, 'index.html', { root: __dirname + '/../client/dist' });
  } else if (ctx.request.body.command[0] === "list_directory") {
    // get a list of all files in the current directory (and their types)
    let directoryToList = currentDirectory;
    if (ctx.request.body.command.length > 1){
      directoryToList = ctx.request.body.command[1];
    }
    let files = await fs.readdir(directoryToList);
    let fileTypes = await Promise.all(files.map(async (file) => {
      // check if the file is a directory
      try{
      if ((await fs.stat(path.join(directoryToList, file))).isDirectory()) {
        return "directory";
      } else {
        // check if the file is a video file
        let extension = path.extname(file);
        if ([".mp4", ".mkv", ".avi", ".webm", ".m4v"].includes(extension.toLowerCase())) {
          return "video";
        }
        return "file";
      }
      } catch (e) {
        return "error";
      }
    }));
    
    // combine the file names and types into a single object
    let fileNamesAndTypes = files.reduce((result, file, index) => {
      result[file] = fileTypes[index];
      return result;
    }, {});

    ctx.body = {data:{listing:fileNamesAndTypes, directory:directoryToList}};

    // set current directory to the last requested directory
    // so that any initial requests will start in the last directory
    // (eg. on page refresh)
    currentDirectory = directoryToList;

  } else {
    ctx.body = { data:await mpvClient.mpvRequest(ctx.request.body) };
  }
});

app.listen(port, host);


//prettyConsole.info(`Server running at http://${host}:${port}/`);

const ipMessages = [];
const addresses = getLocalIp();
for (const name of Object.keys(addresses)) {
  for (const address of addresses[name]) {
    ipMessages.push(`\u25ce http://${address}:${port}`);
  }
}
if (ipMessages.length){
  
  prettyConsole.success("Found some local ip addresses. You can try the following in a browser on your network:");
  prettyConsole.print('black', 'cyan', ...ipMessages);
} else {
  prettyConsole.warn("Could not find any local IP addresses, you will have to manually get the ip address of this machine.");
}