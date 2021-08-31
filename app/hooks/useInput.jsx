import useLocalStorage from './useLocalStorage';

const useInput = (key, initialValue) => {
  const [value, setValue] = useLocalStorage(key, initialValue);

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
