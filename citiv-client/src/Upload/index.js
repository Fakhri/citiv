import React from "react";
import axios from "axios";

import { Button, Layout, Upload, Icon, Progress, message } from "antd";

import Header from "../Header";
import NavigationButtons from "../NavigationButtons";

import "./style.css";

const { useState } = React;

const { Content } = Layout;
const { Dragger } = Upload;

export default props => {
  const [videoFile, setVideoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onVideoFileChange = info => {
    const [firstFile, secondFile, ...restFiles] = info.fileList;
    const selectedVideoFile = secondFile || firstFile;

    setVideoFile(selectedVideoFile);
  };

  const uploadVideo = async () => {
    let error = null;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("video", videoFile.originFileObj);

    try {
      await axios.request({
        method: "post",
        url: "/api/upload/single",
        data: formData,
        onUploadProgress: e => {
          const progress = Math.floor((e.loaded * 100) / e.total);
          setUploadProgress(progress < 98 ? progress : 98);
        }
      });
    } catch (e) {
      error = e;
      message.error("An error occured during upload.");
    }

    if (!error) {
      setUploadProgress(100);
      message.info("Upload success!");
    }

    setTimeout(() => {
      setIsUploading(false);
      setVideoFile(null);
      setUploadProgress(0);

      !error && props.history.push("/album");
    }, 2000);
  };

  return (
    <div className="main">
      <Layout>
        <Header />

        <Content className="content upload">
          <Dragger
            name="videoFile"
            multiple={false}
            accept={"video/*"}
            beforeUpload={() => false}
            showUploadList={false}
            onChange={onVideoFileChange}
            fileList={[videoFile].filter(Boolean)}
          >
            {!isUploading ? (
              <Icon
                style={{ color: !videoFile ? "#ccc" : "#1890ff" }}
                className="icon-inbox"
                type="inbox"
              />
            ) : (
              <Progress
                className="progress"
                type="circle"
                percent={uploadProgress}
              />
            )}

            {!videoFile ? (
              <p>Tap or click here to select your video.</p>
            ) : (
              <p>{videoFile.name}</p>
            )}
          </Dragger>
        </Content>

        <Content className="content">
          <Button
            disabled={!videoFile || !!isUploading}
            type="primary"
            onClick={uploadVideo}
            size={"large"}
            block={true}
          >
            <Icon type={!isUploading ? "cloud-upload" : "loading"} /> Upload
            Video
          </Button>
        </Content>

        <NavigationButtons
          path={props.location.pathname.slice(1)}
          disabled={!!isUploading}
        />
      </Layout>
    </div>
  );
};
