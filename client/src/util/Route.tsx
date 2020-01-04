// https://github.com/reach/router/issues/141

import React from 'react';
import { RouteComponentProps } from "@reach/router";

type Props = { component: React.ComponentType } & RouteComponentProps;

const Route: React.ComponentType<Props> = ({ component: Component, ...rest }) => (
  <Component {...rest} />
);

export default Route;