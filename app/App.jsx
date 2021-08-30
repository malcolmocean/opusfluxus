import React from 'react';
import { Flex, Box, Heading } from '@chakra-ui/react';

import { ArrowIcon } from './icons';

import SettingsForm from './components/SettingsForm';
import CaptureForm from './components/CaptureForm';
import SettingsToggler from './components/SettingsToggler';

import useToggle from './hooks/useToggle';

function App() {
  const [settingsShown, toggleSettings] = useToggle(false);
  return (
    <Flex
      width="full"
      align="center"
      justifyContent="center"
      direction="column"
    >
      <Box
        p={8}
        mt={2}
        minWidth="500px"
        maxWidth="500px"
        borderWidth={1}
        borderRadius={8}
        boxShadow="lg"
      >
        <Flex justifyContent="flex-end" m={0} mr={0} pt={0}>
          <SettingsToggler
            toggleSettings={toggleSettings}
            settingsShown={settingsShown}
          />
        </Flex>
        <Flex textAlign="center" gridGap={2} alignItems="center">
          <ArrowIcon />
          <Heading> {settingsShown ? 'Settings' : 'Send to Workflowy'}</Heading>
        </Flex>
        <Box my={4} textAlign="left">
          {settingsShown ? <SettingsForm /> : <CaptureForm />}
        </Box>
      </Box>
    </Flex>
  );
}
export default App;
