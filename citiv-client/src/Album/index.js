import React from "react";
import axios from "axios";

import { Button, Layout, Upload, Icon, Progress, List, message } from "antd";

import Header from "../Header";
import NavigationButtons from "../NavigationButtons";

import "./style.css";

const { useEffect, useState } = React;

const { Content } = Layout;

export default props => {
  const [album, setAlbum] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      
      try {
        const response = await axios.request({
          method: "get",
          url: "/api/album"
        });

        if (response.data.album) {
          setAlbum(response.data.album);
        }
      } catch (e) {
        message.error("An error occured.");
      }

      setIsFetching(false);
    };

    fetchData();
  }, []);

  return (
    <div className="main">
      <Layout>
        <Header />

        <Content className="content album title">Report History</Content>

        <Content className="content album list">
          {isFetching ? (
            <div class="center">
              <Icon
                style={{ fontSize: 40, color: "#1890ff" }}
                type="sync"
                spin
              />
            </div>
          ) : (
            <List
              bordered={true}
              itemLayout="horizontal"
              dataSource={album}
              renderItem={item => (
                <List.Item>
                  <div className="item-name">
                    <a
                      href={`/api/object/get/${item.filename}`}
                      target="_blank"
                    >
                      <Icon type="download" /> {item.filename}
                    </a>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Content>

        <NavigationButtons
          path={props.location.pathname.slice(1)}
          disabled={false}
        />
      </Layout>
    </div>
  );
};
