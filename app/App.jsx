import React, { useState, useEffect } from 'react';
import CaptureForm from './components/CaptureForm';
import { Flex, Box, Heading } from '@chakra-ui/react';
function App() {
  return (
    <Flex width="full" align="center" justifyContent="center">
      <Box p={2}>
        <Box textAlign="center">
          <Heading>⭕️ Send to Workflowy</Heading>
        </Box>
        <Box my={4} textAlign="left">
          <CaptureForm />
        </Box>
      </Box>
    </Flex>
  );
}
export default App;
