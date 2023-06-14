
const host = "0.0.0.0";
const port = 3000;

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import send from 'koa-send';
import serveStatic from 'koa-static';

import { mpvRequest, shutdownMpv } from './mpv-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//const MEDIA_ROOT = "/home/mark/Downloads";
const MEDIA_ROOT = "/media/dlna/Public/Shared Videos";
let currentDirectory = MEDIA_ROOT;

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down...");
  await shutdownMpv();
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
    ctx.body = { data:await mpvRequest(ctx.request.body) };
  }
});

app.listen(port, host);