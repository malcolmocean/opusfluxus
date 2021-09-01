import React from 'react';
import { Flex, Box, Heading } from '@chakra-ui/react';

import { ArrowIcon } from './icons';

import SettingsForm from './components/SettingsForm';
import CaptureForm from './components/CaptureForm';
import SettingsToggler from './components/SettingsToggler';

import useToggle from './hooks/useToggle';
import useInput from './hooks/useInput';
import useLocalStorage from './hooks/useLocalStorage';

function App() {
  const { value: sessionId, bind: bindSessionId } = useInput(
    'sessionId',
    '',
    true
  );
  const { value: parentId, bind: bindParentId } = useInput(
    'parentId',
    '',
    true
  );
  const [top, setTop] = useLocalStorage('addToTop', true);

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
        maxWidth="320px"
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
          <Heading fontSize={['lg', 'xl']}>
            {settingsShown ? 'Settings' : 'Send to Workflowy'}
          </Heading>
        </Flex>
        <Box my={4} textAlign="left">
          {settingsShown ? (
            <SettingsForm
              bindSessionId={bindSessionId}
              bindParentId={bindParentId}
              setTop={setTop}
              top={top}
            />
          ) : (
            <CaptureForm sessionId={sessionId} parentId={parentId} top={top} />
          )}
        </Box>
      </Box>
    </Flex>
  );
}
export default App;
