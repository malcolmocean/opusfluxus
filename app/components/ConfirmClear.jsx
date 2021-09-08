import React, { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
} from '@chakra-ui/react';

export default function ConfirmClear({
  isConfirmOpen,
  setConfirmClosed,
  clear,
}) {
  const cancelRef = useRef();

  return (
    <>
      <AlertDialog
        isOpen={isConfirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={setConfirmClosed}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Clear Settings
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to clear your session ID and parent ID from
              this browser? You can't undo this.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={setConfirmClosed}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  clear();
                  setConfirmClosed();
                }}
                ml={3}
              >
                Clear
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
