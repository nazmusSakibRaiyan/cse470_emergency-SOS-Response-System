import React from 'react';
import { useEffect } from 'react';

const HomePage = () => {
  const [message, setMessage] = React.useState('');
  useEffect(() => {
    function fetchMessage() {
      const url = 'http://localhost:5000';
      const response = fetch(url);
      response.then((res) => res.json()).then((data) => setMessage(data.message));
    }
    fetchMessage();
  }, []);

  return (
    <div>
      <h1>Home Page</h1>
      <p>{message}</p>
    </div>
  );
};

export default HomePage;
