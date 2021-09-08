import React, { useState } from 'react';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  IconButton,
} from '@chakra-ui/react';

import { DeleteIcon } from '@chakra-ui/icons';

import SettingsForm from './SettingsForm';
import IntegrationIcons from './IntegrationIcons';
import ConfirmClear from './ConfirmClear';

export default function SettingsModal(props) {
  const { sessionId, parentId, onClose, isOpen, setSessionId, setParentId } =
    props;
  const [scrollBehavior] = useState('inside');

  const clear = () => {
    setSessionId('');
    setParentId('');
  };

  const [isConfirmOpen, setConfirmOpen] = useState(false);

  return (
    <Modal
      onClose={onClose}
      size={'sm'}
      isOpen={isOpen}
      scrollBehavior={scrollBehavior}
      isCentered
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SettingsForm {...props} />
        </ModalBody>
        <ModalFooter>
          <IntegrationIcons sessionId={sessionId} parentId={parentId} />
          <IconButton
            onClick={() => {
              setConfirmOpen(true);
            }}
            aria-label="Clear settings from browser"
            mr="1em"
            colorScheme="red"
            icon={<DeleteIcon />}
          >
            Clear
          </IconButton>
          <ConfirmClear
            isConfirmOpen={isConfirmOpen}
            setConfirmOpen={setConfirmOpen}
            clear={clear}
          />
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
