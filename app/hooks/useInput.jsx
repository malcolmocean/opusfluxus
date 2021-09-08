import { useState } from 'react';

import useLocalStorage from './useLocalStorage';

const useInput = (initialValue, key) => {
  const [value, setValue] = key
    ? useLocalStorage(key, initialValue)
    : useState(initialValue);

  return {
    value,
    setValue,
    reset: () => setValue(''),
    bind: {
      value,
      onChange: (event) => {
        setValue(event.target.value);
      },
    },
  };
};

export default useInput;
