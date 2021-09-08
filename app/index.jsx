import React from 'react';
import ReactDOM from 'react-dom';

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import theme from './theme';

import App from './App.jsx';

ReactDOM.render(
  <>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <App />
    </ChakraProvider>
  </>,
  document.getElementById('root')
);
