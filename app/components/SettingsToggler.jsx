import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { SettingsIcon, ArrowIcon } from '../icons';

export default function SettingsToggler({ settingsShown, toggleSettings }) {
  return (
    <Box textAlign="right" py={0} mr={-4} mt={-4}>
      <IconButton
        aria-label="settings"
        icon={<SettingsIcon boxSize="2em" />}
        onClick={toggleSettings}
        isRound={true}
        colorScheme={settingsShown ? 'teal' : ''}
      ></IconButton>
    </Box>
  );
}
