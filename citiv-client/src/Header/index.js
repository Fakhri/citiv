import React from "react";
import { Layout } from "antd";

import "./style.css";

const { Content } = Layout;

export default () => (
  <Content className="content">
    <div className="header-name">CitiV</div>
    <div className="header-tagline">
      Make your city smart, secure, and accessible through technology
    </div>
  </Content>
);
