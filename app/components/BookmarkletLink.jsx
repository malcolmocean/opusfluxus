import React, { useEffect, useState } from 'react';
import { Link } from '@chakra-ui/react';

export default function BookmarkletLink(props) {
  const { sessionId, parentId, children } = props;
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');

  useEffect(() => {
    const getBookmarklet = async () => {
      const response = await fetch('/public/bookmarklet.min.js');
      setCode(await response.text());
    };

    getBookmarklet();
  }, []);

  useEffect(() => {
    setLink(
      `javascript:${code
        .replace(`!SESSION_ID`, sessionId)
        .replace(`!PARENT_ID`, parentId)
        .replace(`!URL`, `${document.URL}send`)}`
    );
  }, [code, sessionId, parentId]);

  return <Link href={link}>{children}</Link>;
}
