import React from "react";
import { StaticRouter } from "react-router-dom";
import express from "express";
import { renderToString } from "react-dom/server";
import dotenv from "dotenv";

import AWS from "aws-sdk";
import multer from "multer";
import multerS3 from "multer-s3";

import App from "./App";

dotenv.config();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

var s3 = new AWS.S3();

const AWS_BUCKET = process.env.AWS_BUCKET;

// Multer upload (Use multer-s3 to save directly to AWS instead of locally)
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: AWS_BUCKET,
    // Set public read permissions
    // acl: 'public-read',
    // Auto detect contet type
    // contentType: multerS3.AUTO_CONTENT_TYPE,
    // Set key/ filename as original uploaded name
    key: (req, file, cb) => {
      cb(null, file.originalname.replace(/\s+/g, "-"));
    }
  })
});

const assets = require(process.env.RAZZLE_ASSETS_MANIFEST);

const server = express();

// Upload single file endpoint (calls on upload middleware above)
// upload.single('name') is the key that the file accepts
server.post("/api/upload/single", upload.single("video"), (req, res) => {
  res.send({ success: true });
});

// Upload multiple max 3
server.post("/api/upload/multiple", upload.array("video", 3), (req, res) => {
  res.send({ success: true, length: req.files.length });
});

server.get("/api/album", async (req, res) => {
  try {
    const baseURL = `https://s3.amazonaws.com/${AWS_BUCKET}/`;
    const params = { Bucket: AWS_BUCKET };

    const s3Data = await s3.listObjects(params).promise();

    const album = s3Data.Contents.map(e => ({
      filename: e.Key,
      url: baseURL + e.Key
    }));

    res.send({ album });
  } catch (e) {
    console.log(e);
  }
});

server.get("/api/object/blob/:filename", (req, res, next) => {
  const params = { Bucket: AWS_BUCKET, Key: req.params.filename };

  s3.getObject(params, (err, data) => {
    if (err) {
      return next();
    } else {
      // Convert file to base65 rile
      const img = new Buffer(data.Body, "base64");

      res.contentType(data.ContentType);
      res.status(200).send(img);
    }
  });
});

server.get("/api/object/url/:filename", (req, res) => {
  const params = { Bucket: AWS_BUCKET, Key: req.params.filename };

  s3.getSignedUrl("getObject", params, (err, url) => {
    if (err) {
      console.log(err);
    }

    res.send(url);
  });
});

server.get("/api/object/get/:filename", (req, res) => {
  const params = { Bucket: AWS_BUCKET, Key: req.params.filename };

  s3.getSignedUrl("getObject", params, (err, url) => {
    if (err) {
      console.log(err);
    }

    res.redirect(url);
  });
});

server.use(express.static(__dirname + "/public"));

server
  .disable("x-powered-by")
  .use(express.static(process.env.RAZZLE_PUBLIC_DIR))
  .get("/*", (req, res) => {
    const context = {};
    const markup = renderToString(
      <StaticRouter context={context} location={req.url}>
        <App />
      </StaticRouter>
    );

    if (context.url) {
      res.redirect(context.url);
    } else {
      res.status(200).send(
        `<!doctype html>
    <html lang="">
    <head>
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta charset="utf-8" />
        <title>CitiV</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${
          assets.client.css
            ? `<link rel="stylesheet" href="${assets.client.css}">`
            : ""
        }
        ${
          process.env.NODE_ENV === "production"
            ? `<script src="${assets.client.js}" defer></script>`
            : `<script src="${assets.client.js}" defer crossorigin></script>`
        }
    </head>
    <body>
        <div id="root">${markup}</div>
    </body>
</html>`
      );
    }
  });

export default server;
