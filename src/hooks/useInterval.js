import React, {useEffect, useRef} from 'react';

const useInterval = (callback, delay) => {
    const ref = useRef();

    useEffect(() => {
        ref.current = callback;
        const interval = setInterval(ref.current, delay);
        return () => {
            clearInterval(interval);
        }
    }, [callback, delay]);
}

export { useInterval }