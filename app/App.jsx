import React, { useState, useEffect } from 'react';
import CaptureForm from './components/CaptureForm';
import { Flex, Box, Heading } from '@chakra-ui/react';

const icon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="68"
    height="68"
    viewBox="0 0 24 24"
    strokeWidth="2.5"
    stroke="#597e8d"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 21v-13a4 4 0 1 0 -4 4h13" />
    <path d="M18 15l3 -3l-3 -3" />
  </svg>
);

function App() {
  return (
    <Flex width="full" align="center" justifyContent="center">
      <Box
        p={8}
        mt={8}
        maxWidth="500px"
        borderWidth={1}
        borderRadius={8}
        boxShadow="lg"
      >
        <Flex textAlign="center" gridGap={2} alignItems="center">
          {icon}
          <Heading> Send to Workflowy</Heading>
        </Flex>
        <Box my={4} textAlign="left">
          <CaptureForm />
        </Box>
      </Box>
    </Flex>
  );
}
export default App;
