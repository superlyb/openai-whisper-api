import { FC, useEffect, useState } from 'react';

const MicrophoneAccess: FC = () => {
  const [permission, setPermission] = useState<string>('');

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermission('granted');
    } catch (err) {
      setPermission('denied');
    }
  };

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    if (/android/i.test(userAgent) || (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        requestMicrophonePermission();
      } else {
        setPermission('unsupported');
      }
    }
  }, []);

  return (
    <div>
      <p>Microphone permission: {permission}</p>
      {permission === 'denied' && (
        <button onClick={requestMicrophonePermission}>Request Microphone Access</button>
      )}
    </div>
  );
};

export default MicrophoneAccess;