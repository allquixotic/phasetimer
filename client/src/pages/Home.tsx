import React from 'react';
// eslint-disable-next-line
import { Grommet, Button } from 'grommet';

const Home: React.FC = () => {
  return (
    <div>
      Welcome! You can:<br/>
      <Button id="new" primary label="Create a new timer"/>
      <br/>
      <p>or</p>
      <br/>
      <input type='text' id='sid'></input><br/>
      <Button id="join" type="submit" label="Join an existing timer"/>
    </div>
  );
}

export default Home;