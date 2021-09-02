import React from 'react';
import { Tooltip, Spacer, Flex, Link } from '@chakra-ui/react';

import { AndroidIcon, AppleIcon, BookmarkIcon } from '../icons';

export default function IntegrationIcons() {
  return (
    <Flex textAlign="center" mt={8} gridGap={2} alignItems="center">
      <Tooltip hasArrow label="Create iOS Shortcut">
        <span>
          <Link href="">
            <AppleIcon />
          </Link>
        </span>
      </Tooltip>
      <Spacer />
      <Tooltip hasArrow label="Android support coming soon!">
        <span>
          <Link href="">
            <AndroidIcon />
          </Link>
        </span>
      </Tooltip>
      <Spacer />
      <Tooltip hasArrow label="Create bookmarklet">
        <span>
          <Link href="">
            <BookmarkIcon />
          </Link>
        </span>
      </Tooltip>
    </Flex>
  );
}
