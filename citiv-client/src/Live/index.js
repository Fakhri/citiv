import React from "react";
import axios from "axios";

import { Button, Layout, Upload, Icon, Progress, message } from "antd";

import Header from "../Header";
import NavigationButtons from "../NavigationButtons";

import "./style.css";

const { useState } = React;

const { Content } = Layout;

export default props => {
  return (
    <div className="main">
      <Layout>
        <Header />

        <Content className="content live title">Live</Content>

        <Content className="content live center">
          <Icon style={{ fontSize: 40, color: "#faad14" }} type="disconnect" />
        </Content>

        <NavigationButtons path={props.location.pathname.slice(1)} />
      </Layout>
    </div>
  );
};
