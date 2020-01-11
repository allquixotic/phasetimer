import React from 'react';
// eslint-disable-next-line
import { Box, Button, TextField, Typography } from '@material-ui/core';
import {navigate} from '@reach/router';

const Home: React.FC = () => {
    const [value, setValue] = React.useState('');
    const divStyle = {marginLeft: '8px'} as React.CSSProperties;
  return (
    <div style={divStyle}>
      <Typography>Welcome! You can:</Typography>
      <Button variant="contained" color="primary" onClick={(e) => {
          navigate("/timerAdmin");
      }}>Create new timer</Button>
      <br/>
      <Typography><b>OR</b></Typography>
      <Box width="small"><TextField variant="filled"></TextField></Box><br/>
      <Button variant="contained" color="primary" type="submit" value={value} onChange={event => setValue((event.target as HTMLInputElement).value)}>View existing timer</Button>
    </div>
  );
}

export default Home;