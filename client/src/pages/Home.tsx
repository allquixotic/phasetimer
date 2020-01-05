import React from 'react';
// eslint-disable-next-line
import { Grommet, Box, Button, TextInput, Paragraph } from 'grommet';
import {navigate} from '@reach/router';

const Home: React.FC = () => {
    const [value, setValue] = React.useState('');
    const divStyle = {marginLeft: '8px'} as React.CSSProperties;
  return (
    <div style={divStyle}>
      <Paragraph margin="small">Welcome! You can:</Paragraph>
      <Button id="new" primary label="Create new timer" onClick={(e) => {
          navigate("/timerAdmin");
      }}/>
      <br/>
      <Paragraph margin="small"><b>OR</b></Paragraph>
      <Box width="small"><TextInput placeholder="Enter Timer ID" id='sid'></TextInput></Box><br/>
      <Button id="join" type="submit" value={value} onChange={event => setValue((event.target as HTMLInputElement).value)} label="View existing timer"/>
    </div>
  );
}

export default Home;