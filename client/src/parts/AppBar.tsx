import React from 'react';
import { Box, Heading } from 'grommet';

const AppBar : React.FC = () => (
  <Box
    tag='header'
    direction='row'
    align='center'
    justify='between'
    background='brand'
    pad={{ left: 'medium', right: 'small', vertical: 'small' }}
    elevation='medium'
    style={{ zIndex: 1 }}>
    <Heading level='3' margin='none'>Phasetimer</Heading>
  </Box>
);

export default AppBar;