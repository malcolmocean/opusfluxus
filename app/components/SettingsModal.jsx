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
} from '@chakra-ui/react';

import SettingsForm from './SettingsForm';

export default function SettingsModal(props) {
  const {
    sessionId,
    parentId,
    bindSessionId,
    bindParentId,
    setTop,
    onClose,
    isOpen,
  } = props;
  const [scrollBehavior] = useState('inside');
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
          <SettingsForm
            bindSessionId={bindSessionId}
            sessionId={sessionId}
            parentId={parentId}
            bindParentId={bindParentId}
            setTop={setTop}
            top={top}
          />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
