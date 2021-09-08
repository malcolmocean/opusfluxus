import React from 'react';
import { Tooltip, Spacer, Flex, Link, Text } from '@chakra-ui/react';

import { AndroidIcon, AppleIcon, BookmarkIcon } from '../icons';

import BookmarkletLink from './BookmarkletLink';

export default function IntegrationIcons({ sessionId, parentId }) {
  return (
    <Flex mr="auto" gridGap={2} alignItems="center">
      <Tooltip hasArrow label="Create iOS Shortcut">
        <span>
          <Link href="https://www.icloud.com/shortcuts/206701b1559642d2b5316c7d2eaaa631">
            <AppleIcon boxSize="2em" />
          </Link>
        </span>
      </Tooltip>
      <Spacer />
      <Tooltip hasArrow label="Android support coming soon!">
        <span style={{ cursor: 'not-allowed' }}>
          <AndroidIcon boxSize="2em" />
        </span>
      </Tooltip>
      <Spacer />
      <Tooltip hasArrow label="Drag me to bookmark bar">
        <span>
          <BookmarkletLink sessionId={sessionId} parentId={parentId}>
            <BookmarkIcon aria-label="s2wf" boxSize="2em" />
            <Text display="none"> Send to Workflowy</Text>
          </BookmarkletLink>
        </span>
      </Tooltip>
    </Flex>
  );
}
