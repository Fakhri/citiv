import React from "react";
import Route from "react-router-dom/Route";
import Switch from "react-router-dom/Switch";

import Upload from "../Upload";
import Album from "../Album";
import Live from "../Live";

import "antd/dist/antd.css";

import "./style.css";

export default () => (
  <Switch>
    <Route exact path="/" component={Upload} />
    <Route exact path="/upload" component={Upload} />
    <Route exact path="/album" component={Album} />
    <Route exact path="/live" component={Live} />
  </Switch>
);
