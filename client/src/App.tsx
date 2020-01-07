import React from 'react';
import './App.css';
import { Router } from '@reach/router';
import Home from './pages/Home';
import TimerAdmin from './pages/TimerAdmin';
import Route from './util/Route';
import MyAppBar from './parts/MyAppBar';
import { Box } from '@material-ui/core';

const theme = {
  global: {
    font: {
      family: 'Roboto',
      size: '14px',
      height: '20px',
    },
  },
};

const App: React.FC = () => {
  return (
      <Box>
        <MyAppBar />
        <Router>
          <Route component={Home} path="/" />
          <Route component={TimerAdmin} path="/timerAdmin" />
        </Router>
      </Box>
  );
}

export default App;