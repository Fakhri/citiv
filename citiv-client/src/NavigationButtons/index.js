import React from "react";

import { Link } from "react-router-dom";

import { Button, Layout } from "antd";

import "./style.css";

const { Content } = Layout;

export default ({ path, disabled }) => {
  return (
    <Content className="content navigation-buttons center">
      <Button.Group>
        <Button
          disabled={!!disabled}
          type={((path === "upload" || path === "") && "primary") || ""}
        >
          <Link to="/upload">Upload</Link>
        </Button>

        <Button
          disabled={!!disabled}
          type={(path === "album" && "primary") || ""}
        >
          <Link to="/album">Report History</Link>
        </Button>

        <Button
          disabled={!!disabled}
          type={(path === "live" && "primary") || ""}
        >
          <Link to="/live">Live</Link>
        </Button>
      </Button.Group>
    </Content>
  );
};
