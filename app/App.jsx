import React from 'react';
import { Flex, Box, Heading } from '@chakra-ui/react';

import { ArrowIcon } from './icons';

import CaptureForm from './components/CaptureForm';
import SettingsToggler from './components/SettingsToggler';
import SettingsModal from './components/SettingsModal';

import useInput from './hooks/useInput';
import useLocalStorage from './hooks/useLocalStorage';
import { useDisclosure } from '@chakra-ui/react';

function App() {
  const { value: sessionId, bind: bindSessionId } = useInput('', 'sessionId');
  const { value: parentId, bind: bindParentId } = useInput('', 'parentId');
  const [top, setTop] = useLocalStorage('addToTop', true);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const modalProps = {
    sessionId,
    parentId,
    bindSessionId,
    bindParentId,
    setTop,
    onClose,
    isOpen,
  };

  return (
    <Flex
      width="full"
      align="center"
      justifyContent="center"
      direction="column"
    >
      <Box
        p={8}
        mx={'1rem'}
        my={'1rem'}
        maxW="320px"
        borderWidth={1}
        borderRadius={8}
        boxShadow="lg"
      >
        <Flex justifyContent="flex-end" m={0} mr={0} pt={0}>
          <SettingsToggler toggleSettings={onOpen} settingsShown={isOpen} />
        </Flex>
        <Flex textAlign="center" gridGap={2} alignItems="center">
          <ArrowIcon />
          <Heading fontSize={'xl'}>{'Send to Workflowy'}</Heading>
        </Flex>

        <Box my={4} textAlign="left">
          <CaptureForm sessionId={sessionId} parentId={parentId} top={top} />
        </Box>
        <SettingsModal {...modalProps} />
      </Box>
    </Flex>
  );
}
export default App;
