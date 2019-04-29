import React from "react";
import axios from "axios";

import AWS from "aws-sdk";

import {
  Button,
  Layout,
  Icon,
  Progress,
  Row,
  Col,
  Statistic,
  message
} from "antd";

import Header from "../Header";
import NavigationButtons from "../NavigationButtons";

import "./style.css";

const { useEffect, useRef, useState } = React;

const { Content } = Layout;

AWS.config.update({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
    region: AWS_REGION
  }
});

const BUCKET_NAME = AWS_BUCKET;

const s3 = new AWS.S3({
  region: AWS_REGION
});

let mediaRecorder = null;
let videoStream = null;

export default props => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [recordedBytes, setRecordedBytes] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);

  const recordInterval = useRef();
  const videoEl = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 320, height: 240 }
      })
      .then(stream => {
        console.log("Successfully received user media.");

        if (videoEl.current) {
          videoEl.current.srcObject = stream;
        }

        // Saving the stream to create the MediaRecorder later.
        videoStream = stream;
      })
      .catch(e => {
        console.error("navigator.getUserMedia error: ", e);
      });

    return () => {
      stopStreaming();
    };
  }, []);

  const startRecording = () => {
    // Getting the MediaRecorder instance.
    // I took the snippet from here: https://github.com/webrtc/samples/blob/gh-pages/src/content/getusermedia/record/js/main.js
    let options = { mimeType: "video/webm;codecs=vp9" };

    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.log(options.mimeType + " is not Supported");
      options = { mimeType: "video/webm;codecs=vp8" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.log(options.mimeType + " is not Supported");
        options = { mimeType: "video/webm" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.log(options.mimeType + " is not Supported");
          options = { mimeType: "" };
        }
      }
    }

    try {
      mediaRecorder = new MediaRecorder(videoStream, options);
    } catch (e) {
      console.error("Exception while creating MediaRecorder: " + e);
      return;
    }

    // Generate the file name to upload. For the simplicity we're going to use the current date.
    const s3Key =
      `videofile${new Date().toISOString()}`.replace(/[\W_]+/g, "") + ".webn";
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key
    };

    let uploadId;

    // We are going to handle everything as a chain of Observable operators.
    Rx.Observable
      // First create the multipart upload and wait until it's created.
      .fromPromise(s3.createMultipartUpload(params).promise())
      .switchMap(data => {
        // Save the uploadId as we'll need it to complete the multipart upload.
        uploadId = data.UploadId;
        mediaRecorder.start(15000);

        // Then track all 'dataavailable' events. Each event brings a blob (binary data) with a part of video.
        return Rx.Observable.fromEvent(mediaRecorder, "dataavailable");
      })
      // Track the dataavailable event until the 'stop' event is fired.
      // MediaRecorder emits the "stop" when it was stopped AND have emitted all "dataavailable" events.
      // So we are not losing data. See the docs here: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop
      .takeUntil(Rx.Observable.fromEvent(mediaRecorder, "stop"))
      .map((event, index) => {
        // Take the blob and it's number and pass down.
        setRecordedBytes(recordedBytes + event.data.size);
        return { blob: event.data, partNumber: index + 1 };
      })
      // This operator means the following: when you receive a blob - start uploading it.
      // Don't accept any other uploads until you finish uploading: http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#instance-method-concatMap
      .concatMap(({ blob, partNumber }) => {
        // var newBlob = );
        return (
          s3
            .uploadPart({
              Body: blob,
              Bucket: BUCKET_NAME,
              Key: s3Key,
              PartNumber: partNumber,
              UploadId: uploadId,
              ContentLength: blob.size
            })
            .promise()
            // Save the ETag as we'll need it to complete the multipart upload
            .then(({ ETag }) => {
              setUploadedBytes(uploadedBytes + blob.size);
              return { ETag, PartNumber: partNumber };
            })
        );
      })
      // Wait until all uploads are completed, then convert the results into an array.
      .toArray()
      // Call the complete multipart upload and pass the part numbers and ETags to it.
      .switchMap(parts => {
        return s3
          .completeMultipartUpload({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            UploadId: uploadId,
            MultipartUpload: {
              Parts: parts
            }
          })
          .promise();
      })
      .subscribe(
        ({ Location }) => {
          console.log("Uploaded successfully.");
        },
        e => {
          console.error(e);
          if (uploadId) {
            // Aborting the Multipart Upload in case of any failure.
            // Not to get charged because of keeping it pending.
            s3.abortMultipartUpload({
              Bucket: BUCKET_NAME,
              UploadId: uploadId,
              Key: s3Key
            })
              .promise()
              .then(() => console.log("Multipart upload aborted"))
              .catch(e => console.error(e));
          }
        }
      );
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
  };

  const startStreaming = () => {
    setIsStreaming(true);

    startRecording();
    recordInterval.current = setInterval(() => {
      setUploadLocations([...uploadLocations, "shit"]);
      stopRecording();
      startRecording();
    }, 10000);
  };

  const stopStreaming = () => {
    setIsStreaming(false);

    clearInterval(recordInterval.current);
    recordInterval.current = null;

    stopRecording();
  };

  return (
    <div className="main">
      <Layout>
        <Header />
        <Content className="content live center">
          <video ref={videoEl} id="mirror" autoPlay muted />
        </Content>
        <Content className="content center">
          {!isStreaming ? (
            <Button
              onClick={startStreaming}
              disabled={!!isStreaming}
              type="primary"
            >
              <Icon type="video-camera" /> Start Streaming
            </Button>
          ) : (
            <Button
              onClick={stopStreaming}
              disabled={!isStreaming}
              type="danger"
            >
              <Icon type="pause-circle" theme="filled" /> Stop Streaming
            </Button>
          )}
        </Content>
        <Content className="content center">
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title="Recorded" value={recordedBytes} />
            </Col>
            <Col span={12}>
              <Statistic title="Uploaded" value={uploadedBytes} />
            </Col>
          </Row>
        </Content>
        <NavigationButtons
          path={props.location.pathname.slice(1)}
          disabled={!!isStreaming}
        />
      </Layout>
    </div>
  );
};
