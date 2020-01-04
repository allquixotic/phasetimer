import React from 'react';
import './App.css';
import { Grommet } from 'grommet';
import { Router } from '@reach/router';
import Home from './pages/Home';
import Route from './util/Route';
import AppBar from './parts/AppBar';

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
    <Grommet theme={theme}>
      <AppBar />
      <Router>
        <Route component={Home} path="/" />
      </Router>

      <header className="App-header">
        <p>
          This is from App.tsx
        </p>
      </header>
    </Grommet>
  );
}

export default App;