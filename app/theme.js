import { extendTheme } from '@chakra-ui/react';

const config = {
  initialColorMode: 'light',
  useSystemColorMode: true,
  colors: { highlight: '#597e8d' },
};

const theme = extendTheme({ config });

export default theme;
